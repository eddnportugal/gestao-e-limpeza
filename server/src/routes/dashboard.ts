import { Router, Response } from 'express';
import pool, { query } from '../db/database.js';
import { cacheGet, cacheSet } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

function formatarTempo(ts: number, now: number): string {
  const diff = now - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

type AtividadeItem = { texto: string; tempo: string; tipo: string; ts: number };

function buildReporteAtividades(rows: any[], now: number): AtividadeItem[] {
  return (rows || []).map(r => {
    const t = new Date(r.criado_em).getTime();
    let statusTexto = 'aberto';
    if (r.status === 'resolvido') statusTexto = 'resolvido';
    else if (r.status === 'em_analise') statusTexto = 'em análise';
    let statusTipo = 'info';
    if (r.status === 'resolvido') statusTipo = 'sucesso';
    else if (r.prioridade === 'urgente' || r.prioridade === 'alta') statusTipo = 'perigo';
    return { texto: `Reporte ${r.protocolo || ''} — ${statusTexto}`, tempo: formatarTempo(t, now), ts: t, tipo: statusTipo };
  });
}

function buildExecAtividades(rows: any[], now: number): AtividadeItem[] {
  return (rows || []).map(e => {
    const t = new Date(`${e.data_execucao}T${e.hora_execucao || '00:00'}`).getTime();
    let tarefaTexto = 'pendente';
    if (e.status === 'realizada') tarefaTexto = 'concluída';
    else if (e.status === 'nao_executada') tarefaTexto = 'não executada';
    let tarefaTipo = 'aviso';
    if (e.status === 'realizada') tarefaTipo = 'sucesso';
    else if (e.status === 'nao_executada') tarefaTipo = 'perigo';
    return { texto: `Tarefa ${tarefaTexto} — ${e.funcionario_nome || ''}`, tempo: formatarTempo(t, now), ts: t, tipo: tarefaTipo };
  });
}

function buildPontoAtividades(rows: any[], now: number): AtividadeItem[] {
  return (rows || []).map(p => {
    const t = new Date(p.data_hora).getTime();
    return { texto: `${p.funcionario_nome || 'Funcionário'} — ${p.tipo === 'entrada' ? 'Check-in' : 'Check-out'}`, tempo: formatarTempo(t, now), ts: t, tipo: 'info' };
  });
}

function buildVencAtividades(rows: any[], now: number): AtividadeItem[] {
  return (rows || []).map(v => {
    const dv = new Date(v.data_vencimento);
    const diff = Math.floor((dv.getTime() - now) / 86400000);
    let diasTexto: string;
    if (diff < 0) {
      diasTexto = 'VENCIDO';
    } else {
      diasTexto = `em ${diff} dia${diff === 1 ? '' : 's'}`;
    }
    let vencTipo = 'info';
    if (diff < 0) vencTipo = 'perigo';
    else if (diff <= 7) vencTipo = 'aviso';
    return { texto: `Vencimento "${v.titulo}" ${diasTexto}`, tempo: formatarTempo(dv.getTime(), now), ts: dv.getTime(), tipo: vencTipo };
  });
}

function buildAtividades(
  atividadeReportes: any[], atividadeExecs: any[],
  atividadePonto: any[], atividadeVenc: any[], now: number
) {
  const atividades = [
    ...buildReporteAtividades(atividadeReportes, now),
    ...buildExecAtividades(atividadeExecs, now),
    ...buildPontoAtividades(atividadePonto, now),
    ...buildVencAtividades(atividadeVenc, now),
  ];
  atividades.sort((a, b) => b.ts - a.ts);
  return atividades;
}

// GET /api/dashboard/summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  const ids: string[] = (req as any).condominioIds;
  if (ids.length === 0) {
    res.json({
      totalCondominios: 0, reportesAbertos: 0,
      totalTarefas: 0, execucoesHoje: 0,
      funcionariosHoje: 0, vencimentosProximos: 0,
      semanalArr: [], tipoArr: [], desempenho: [], atividades: [],
    });
    return;
  }

  // Cache dashboard per user scope for 30s (heavy query, data is near-realtime enough)
  const cacheKey = `dash:summary:${ids.sort().join(',')}`;
  const cached = cacheGet<any>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const ph = ids.map((_, i) => `$${i + 1}`).join(',');

  // Use single client for all parallel queries to avoid pool exhaustion
  const client = await pool.connect();
  try {
  const qOne = async (text: string, params: any[]) => { const { rows } = await client.query(text, params); return rows[0] ?? null; };
  const qAll = async (text: string, params: any[]) => { const { rows } = await client.query(text, params); return rows; };

  const [
    condominiosCount,
    reportesStats,
    tarefasCount,
    execucoesHoje,
    funcionariosHoje,
    vencimentosProximos,
    semanalRows,
    categoriaRows,
    desempenhoRows,
    atividadeReportes,
    atividadeExecs,
    atividadePonto,
    atividadeVenc,
  ] = await Promise.all([
    qOne(`SELECT COUNT(*)::int as total FROM condominios WHERE id IN (${ph}) AND ativo = true`, ids),
    qOne(`SELECT COUNT(*) FILTER (WHERE status != 'resolvido')::int as abertos FROM reportes WHERE condominio_id IN (${ph})`, ids),
    qOne(`SELECT COUNT(*)::int as total FROM tarefas_agendadas WHERE condominio_id IN (${ph})`, ids),
    qOne(`SELECT COUNT(*)::int as total FROM tarefas_execucoes te JOIN tarefas_agendadas ta ON ta.id = te.tarefa_id WHERE ta.condominio_id IN (${ph}) AND te.data_execucao = CURRENT_DATE`, ids),
    qOne(`SELECT COUNT(DISTINCT funcionario_email)::int as total FROM controle_ponto WHERE tipo = 'entrada' AND data_hora::date = CURRENT_DATE`, []),
    qOne(`SELECT COUNT(*)::int as total FROM vencimentos WHERE condominio_id IN (${ph}) AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`, ids),
        qAll(`
       WITH dias AS (SELECT d::date as dia FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d),
         rep AS (SELECT data::date as dia, COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'resolvido')::int as resolvidos FROM reportes WHERE condominio_id IN (${ph}) AND data::date >= CURRENT_DATE - INTERVAL '6 days' GROUP BY data::date),
         exe AS (SELECT te.data_execucao as dia, COUNT(*) FILTER (WHERE te.status = 'realizada')::int as realizadas FROM tarefas_execucoes te JOIN tarefas_agendadas ta ON ta.id = te.tarefa_id WHERE ta.condominio_id IN (${ph}) AND te.data_execucao >= CURRENT_DATE - INTERVAL '6 days' GROUP BY te.data_execucao)
       SELECT dias.dia, COALESCE(rep.total, 0) as abertas, COALESCE(rep.resolvidos, 0) + COALESCE(exe.realizadas, 0) as concluidas
       FROM dias LEFT JOIN rep ON rep.dia = dias.dia LEFT JOIN exe ON exe.dia = dias.dia
       ORDER BY dias.dia`, ids),
    qAll(`SELECT COALESCE(categoria, 'Outro') as nome, COUNT(*)::int as valor FROM roteiros WHERE condominio_id IN (${ph}) GROUP BY categoria ORDER BY valor DESC LIMIT 10`, ids),
    qAll(`
      SELECT TO_CHAR(te.data_execucao, 'YYYY-MM') as mes,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE te.status = 'realizada')::int as realizadas
      FROM tarefas_execucoes te JOIN tarefas_agendadas ta ON ta.id = te.tarefa_id
      WHERE ta.condominio_id IN (${ph}) AND te.data_execucao >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(te.data_execucao, 'YYYY-MM')
      ORDER BY mes`, ids),
    qAll(`SELECT protocolo, status, prioridade, data as criado_em FROM reportes WHERE condominio_id IN (${ph}) ORDER BY data DESC LIMIT 10`, ids),
    qAll(`SELECT te.status, te.data_execucao, te.hora_execucao, te.funcionario_nome FROM tarefas_execucoes te JOIN tarefas_agendadas ta ON ta.id = te.tarefa_id WHERE ta.condominio_id IN (${ph}) ORDER BY te.data_execucao DESC, te.hora_execucao DESC LIMIT 10`, ids),
    qAll(`SELECT funcionario_nome, tipo, data_hora FROM controle_ponto ORDER BY data_hora DESC LIMIT 10`, []),
    qAll(`SELECT titulo, data_vencimento FROM vencimentos WHERE condominio_id IN (${ph}) AND data_vencimento BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '15 days' ORDER BY data_vencimento LIMIT 10`, ids),
  ]);

  const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const semanalArr = (semanalRows || []).map((r: any) => ({
    dia: NOMES_DIA[new Date(r.dia).getDay()],
    abertas: r.abertas || 0,
    concluidas: r.concluidas || 0,
  }));

  const tipoArr = (categoriaRows || []).map((r: any) => ({ nome: r.nome, valor: r.valor }));

  const desempenho: { mes: string; nota: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const row = (desempenhoRows || []).find((r: any) => r.mes === prefix);
    const total = row?.total || 0;
    const realizadas = row?.realizadas || 0;
    desempenho.push({ mes: NOMES_MES[d.getMonth()], nota: total > 0 ? Math.round((realizadas / total) * 5 * 10) / 10 : 0 });
  }

  const now = Date.now();
  const atividades = buildAtividades(atividadeReportes, atividadeExecs, atividadePonto, atividadeVenc, now);

  const result = {
    totalCondominios: condominiosCount?.total || 0,
    reportesAbertos: reportesStats?.abertos || 0,
    totalTarefas: tarefasCount?.total || 0,
    execucoesHoje: execucoesHoje?.total || 0,
    funcionariosHoje: funcionariosHoje?.total || 0,
    vencimentosProximos: vencimentosProximos?.total || 0,
    semanalArr,
    tipoArr,
    desempenho,
    atividades: atividades.slice(0, 6),
  };
  cacheSet(cacheKey, result, 30_000);
  res.json(result);
  console.log(`[Dashboard] /summary ${ids.length} condomínios em ${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error(`[Dashboard] /summary ERRO em ${Date.now() - t0}ms:`, err.message);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  } finally {
    client.release();
  }
});

// GET /api/dashboard/master-summary (master only — system management overview)
router.get('/master-summary', async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  if (req.user?.role !== 'master') {
    res.status(403).json({ error: 'Acesso restrito ao master' });
    return;
  }

  // Cache master dashboard for 60s (admin-level data, less time-sensitive)
  const cacheKey = 'dash:master-summary';
  const cached = cacheGet<any>(cacheKey);
  if (cached) { res.json(cached); return; }

  // Use single client for all parallel queries to avoid pool exhaustion
  const client = await pool.connect();
  try {
  const qOne = async (text: string, params: any[]) => { const { rows } = await client.query(text, params); return rows[0] ?? null; };
  const qAll = async (text: string, params: any[]) => { const { rows } = await client.query(text, params); return rows; };

  const [
    totalCondominios,
    condominiosAtivos,
    condominiosTeste,
    condominiosInadimplentes,
    condominiosBloqueados,
    totalAdmins,
    totalUsuarios,
    usuariosAtivos,
    usuariosBloqueados,
    usuariosSemVinculo,
    condominiosRecentes,
    adminsRecentes,
    cadastrosMensal,
  ] = await Promise.all([
    qOne('SELECT COUNT(*)::int as total FROM condominios', []),
    qOne("SELECT COUNT(*)::int as total FROM condominios WHERE ativo = true AND status_plano = 'ativo'", []),
    qOne("SELECT COUNT(*)::int as total FROM condominios WHERE ativo = true AND status_plano = 'teste'", []),
    qOne("SELECT COUNT(*)::int as total FROM condominios WHERE ativo = true AND status_plano = 'inadimplente'", []),
    qOne("SELECT COUNT(*)::int as total FROM condominios WHERE ativo = false OR status_plano = 'bloqueado'", []),
    qOne("SELECT COUNT(*)::int as total FROM usuarios WHERE role = 'administrador'", []),
    qOne("SELECT COUNT(*)::int as total FROM usuarios WHERE role != 'master'", []),
    qOne("SELECT COUNT(*)::int as total FROM usuarios WHERE ativo = true AND role != 'master'", []),
    qOne("SELECT COUNT(*)::int as total FROM usuarios WHERE bloqueado = true", []),
    qOne("SELECT COUNT(*)::int as total FROM usuarios WHERE condominio_id IS NULL AND role = 'funcionario'", []),
    qAll(
      `SELECT c.id, c.nome, c.cidade, c.estado, c.status_plano, c.plano, c.criado_em, c.data_fim_teste, c.ativo,
              u.nome as admin_nome, u.email as admin_email,
              (SELECT COUNT(*)::int FROM usuarios WHERE condominio_id = c.id) as total_usuarios
       FROM condominios c
       LEFT JOIN usuarios u ON u.id = c.criado_por
       ORDER BY c.criado_em DESC LIMIT 20`, []
    ),
    qAll(
      `SELECT id, nome, email, telefone, ativo, bloqueado, criado_em FROM usuarios WHERE role = 'administrador' ORDER BY criado_em DESC LIMIT 10`, []
    ),
    qAll(
      `SELECT TO_CHAR(criado_em, 'YYYY-MM') as mes, COUNT(*)::int as total
       FROM condominios WHERE criado_em >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(criado_em, 'YYYY-MM') ORDER BY mes`, []
    ),
  ]);

  // Expiration alerts: condominios with teste expiring in <= 3 days
  const alertasExpiracao = await qAll(
    `SELECT c.id, c.nome, c.data_fim_teste, c.status_plano, u.nome as admin_nome
     FROM condominios c LEFT JOIN usuarios u ON u.id = c.criado_por
     WHERE c.status_plano = 'teste' AND c.data_fim_teste IS NOT NULL
       AND c.data_fim_teste <= NOW() + INTERVAL '3 days'
     ORDER BY c.data_fim_teste`, []
  );

  const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const cadastrosMensalArr: { mes: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const row = (cadastrosMensal || []).find((r: any) => r.mes === prefix);
    cadastrosMensalArr.push({ mes: NOMES_MES[d.getMonth()], total: row?.total || 0 });
  }

  const masterResult = {
    totalCondominios: totalCondominios?.total || 0,
    condominiosAtivos: condominiosAtivos?.total || 0,
    condominiosTeste: condominiosTeste?.total || 0,
    condominiosInadimplentes: condominiosInadimplentes?.total || 0,
    condominiosBloqueados: condominiosBloqueados?.total || 0,
    totalAdmins: totalAdmins?.total || 0,
    totalUsuarios: totalUsuarios?.total || 0,
    usuariosAtivos: usuariosAtivos?.total || 0,
    usuariosBloqueados: usuariosBloqueados?.total || 0,
    usuariosSemVinculo: usuariosSemVinculo?.total || 0,
    condominiosRecentes: condominiosRecentes || [],
    adminsRecentes: adminsRecentes || [],
    cadastrosMensalArr,
    alertasExpiracao: alertasExpiracao || [],
  };
  cacheSet(cacheKey, masterResult, 60_000);
  res.json(masterResult);
  console.log(`[Dashboard] /master-summary em ${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error(`[Dashboard] /master-summary ERRO em ${Date.now() - t0}ms:`, err.message);
    res.status(500).json({ error: 'Erro ao carregar dashboard master' });
  } finally {
    client.release();
  }
});

// GET /api/dashboard/master-users (all users grouped by admin with condominios/moradores)
router.get('/master-users', async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  try {
  if (req.user?.role !== 'master') {
    res.status(403).json({ error: 'Acesso restrito ao master' }); return;
  }

  // All users (non-master) with their admin info
  const users = await query(
    `SELECT u.id, u.email, u.nome, u.role, u.ativo, u.bloqueado, u.motivo_bloqueio,
            u.administrador_id, u.supervisor_id, u.condominio_id, u.telefone, u.cargo, u.criado_em,
            a.nome as admin_nome, a.email as admin_email,
            c.nome as condominio_nome
     FROM usuarios u
     LEFT JOIN usuarios a ON a.id = u.administrador_id
     LEFT JOIN condominios c ON c.id = u.condominio_id
     WHERE u.role != 'master'
     ORDER BY u.role, u.nome
     LIMIT 500`
  );

  // Condominios with admin + moradores count
  const conds = await query(
    `SELECT c.id, c.nome, c.status_plano, c.plano, c.ativo, c.criado_por, c.criado_em,
            u.nome as admin_nome, u.email as admin_email,
            (SELECT COUNT(*)::int FROM moradores WHERE condominio_id = c.id) as total_moradores
     FROM condominios c
     LEFT JOIN usuarios u ON u.id = c.criado_por
     ORDER BY c.criado_em DESC
     LIMIT 200`
  );

  // Moradores per condominio
  const moradores = await query(
    `SELECT m.id, m.nome, m.condominio_id, m.bloco, m.apartamento, m.whatsapp, m.email, m.perfil, m.criado_em,
            c.nome as condominio_nome
     FROM moradores m
     JOIN condominios c ON c.id = m.condominio_id
     ORDER BY c.nome, m.nome
     LIMIT 2000`
  );

  // Summary counts by role
  const countsByRole = await query(
    `SELECT role, COUNT(*)::int as total FROM usuarios WHERE role != 'master' GROUP BY role`
  );

  res.json({ users, condominios: conds, moradores, countsByRole });
  console.log(`[Dashboard] /master-users em ${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error(`[Dashboard] /master-users ERRO em ${Date.now() - t0}ms:`, err.message);
    res.status(500).json({ error: 'Erro ao carregar usuários' });
  }
});

// GET /api/dashboard/master-report (filterable report)
router.get('/master-report', async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'master') {
    res.status(403).json({ error: 'Acesso restrito ao master' }); return;
  }

  const { dataInicio, dataFim, statusPlano } = req.query as any;

  let condWhere = 'WHERE 1=1';
  const condParams: any[] = [];
  let pi = 1;

  if (dataInicio) { condWhere += ` AND c.criado_em >= $${pi++}`; condParams.push(dataInicio); }
  if (dataFim) { condWhere += ` AND c.criado_em <= $${pi++}`; condParams.push(dataFim + 'T23:59:59'); }
  if (statusPlano && statusPlano !== 'todos') { condWhere += ` AND c.status_plano = $${pi++}`; condParams.push(statusPlano); }

  const condominios = await query(
    `SELECT c.id, c.nome, c.cidade, c.estado, c.status_plano, c.plano, c.ativo, c.criado_em,
            c.data_inicio_teste, c.data_fim_teste, c.valor_mensalidade,
            u.nome as admin_nome, u.email as admin_email,
            (SELECT COUNT(*)::int FROM usuarios WHERE condominio_id = c.id) as total_usuarios,
            (SELECT COUNT(*)::int FROM moradores WHERE condominio_id = c.id) as total_moradores
     FROM condominios c
     LEFT JOIN usuarios u ON u.id = c.criado_por
     ${condWhere}
     ORDER BY c.criado_em DESC`,
    condParams
  );

  let userWhere = "WHERE u.role != 'master'";
  const userParams: any[] = [];
  let ui = 1;
  if (dataInicio) { userWhere += ` AND u.criado_em >= $${ui++}`; userParams.push(dataInicio); }
  if (dataFim) { userWhere += ` AND u.criado_em <= $${ui++}`; userParams.push(dataFim + 'T23:59:59'); }

  const usuarios = await query(
    `SELECT u.id, u.nome, u.email, u.role, u.ativo, u.bloqueado, u.criado_em, u.telefone,
            a.nome as admin_nome, c.nome as condominio_nome
     FROM usuarios u
     LEFT JOIN usuarios a ON a.id = u.administrador_id
     LEFT JOIN condominios c ON c.id = u.condominio_id
     ${userWhere}
     ORDER BY u.role, u.nome`,
    userParams
  );

  res.json({ condominios, usuarios });
});

export default router;
