import { Router, Response } from 'express';
import { query } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

type RegistroRelatorio = {
  id: string;
  data: string;
  funcaoSistema: string;
  funcaoSistemaLabel: string;
  condominioId: string;
  condominioNome: string;
  funcionarioNome: string;
  titulo: string;
  status: string;
  detalhe: string;
};

function normalizarData(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizarTexto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function compararTexto(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function rotuloFuncao(funcaoSistema: string): string {
  const labels: Record<string, string> = {
    ordens_servico: 'Ordens de Serviço',
    tarefas: 'Tarefas Agendadas',
    reportes: 'Reportes',
    vistorias: 'Vistorias',
    checklists: 'Checklists',
  };
  return labels[funcaoSistema] || funcaoSistema;
}

function criarRegistro(base: Partial<RegistroRelatorio> & { id: string; data: string; funcaoSistema: string; condominioId: string; condominioNome: string }): RegistroRelatorio {
  return {
    id: base.id,
    data: base.data,
    funcaoSistema: base.funcaoSistema,
    funcaoSistemaLabel: rotuloFuncao(base.funcaoSistema),
    condominioId: base.condominioId,
    condominioNome: base.condominioNome,
    funcionarioNome: base.funcionarioNome || '',
    titulo: base.titulo || '',
    status: base.status || '',
    detalhe: base.detalhe || '',
  };
}

// GET /api/relatorios/resumo
router.get('/resumo', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) {
      res.json({
        osMensal: [], osPorCondominio: [], custoMensal: [], produtividade: [], satisfacao: [],
        filtros: { condominios: [], funcionarios: [], funcoesSistema: [] }, registros: [], totais: { registros: 0, condominios: 0, funcionarios: 0 },
      });
      return;
    }
    const dataInicio = normalizarData(req.query.dataInicio) || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const dataFim = normalizarData(req.query.dataFim) || new Date().toISOString().slice(0, 10);
    const condominioId = normalizarTexto(req.query.condominioId);
    const funcionario = normalizarTexto(req.query.funcionario);
    const funcaoSistema = normalizarTexto(req.query.funcaoSistema);
    const scopedIds = condominioId && ids.includes(condominioId) ? [condominioId] : ids;

    const [condominios, osMensal, osPorCond, custoMensal, produtividade, satisfacaoRows, osRegistros, tarefaRegistros, reporteRegistros, vistoriaRegistros, checklistRegistros] = await Promise.all([
      query(`SELECT id, nome FROM condominios WHERE id = ANY($1) ORDER BY nome`, [scopedIds]),
      query(`
        SELECT TO_CHAR(DATE_TRUNC('month', data_abertura), 'Mon') as mes,
          COUNT(*) FILTER (WHERE tipo = 'limpeza')::int as limpeza,
          COUNT(*) FILTER (WHERE tipo = 'manutencao')::int as manutencao,
          COUNT(*) FILTER (WHERE tipo = 'emergencia')::int as emergencia
        FROM ordens_servico
        WHERE condominio_id = ANY($1)
          AND data_abertura::date >= $2::date
          AND data_abertura::date <= $3::date
        GROUP BY TO_CHAR(DATE_TRUNC('month', data_abertura), 'Mon'), DATE_TRUNC('month', data_abertura)
        ORDER BY DATE_TRUNC('month', data_abertura)
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT c.id, c.nome, COUNT(os.id)::int as os, COALESCE(AVG(os.avaliacao_nota), 0)::numeric(3,1) as avaliacao
        FROM condominios c
        LEFT JOIN ordens_servico os ON os.condominio_id = c.id
          AND os.data_abertura::date >= $2::date
          AND os.data_abertura::date <= $3::date
        WHERE c.id = ANY($1)
        GROUP BY c.id, c.nome
        ORDER BY os DESC, c.nome
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT TO_CHAR(DATE_TRUNC('month', mm.data), 'Mon') as mes,
          COALESCE(SUM(mm.quantidade * m.custo_unitario) FILTER (WHERE mm.tipo = 'entrada'), 0)::numeric(10,2) as custo
        FROM materiais_movimentacoes mm
        JOIN materiais m ON m.id = mm.material_id
        WHERE m.condominio_id = ANY($1)
          AND mm.data::date >= $2::date
          AND mm.data::date <= $3::date
        GROUP BY TO_CHAR(DATE_TRUNC('month', mm.data), 'Mon'), DATE_TRUNC('month', mm.data)
        ORDER BY DATE_TRUNC('month', mm.data)
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT te.funcionario_nome as funcionario,
          COUNT(*)::int as tarefas,
          COUNT(*) * 2 as horas
        FROM tarefas_execucoes te
        JOIN tarefas_agendadas ta ON ta.id = te.tarefa_id
        WHERE ta.condominio_id = ANY($1)
          AND te.status = 'realizada'
          AND te.data_execucao >= $2::date
          AND te.data_execucao <= $3::date
        GROUP BY te.funcionario_nome
        ORDER BY tarefas DESC, te.funcionario_nome
        LIMIT 10
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT avaliacao_nota as nota, COUNT(*)::int as valor
        FROM ordens_servico
        WHERE condominio_id = ANY($1)
          AND avaliacao_nota IS NOT NULL
          AND data_abertura::date >= $2::date
          AND data_abertura::date <= $3::date
        GROUP BY avaliacao_nota
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT os.id, os.data_abertura::date as data, os.condominio_id, c.nome as condominio_nome,
          COALESCE(u.nome, '') as funcionario_nome, os.titulo, os.status,
          CONCAT(COALESCE(os.tipo::text, ''), CASE WHEN os.local IS NOT NULL AND os.local <> '' THEN ' - ' || os.local ELSE '' END) as detalhe
        FROM ordens_servico os
        JOIN condominios c ON c.id = os.condominio_id
        LEFT JOIN usuarios u ON u.id = os.responsavel_id
        WHERE os.condominio_id = ANY($1)
          AND os.data_abertura::date >= $2::date
          AND os.data_abertura::date <= $3::date
        ORDER BY os.data_abertura DESC
        LIMIT 200
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT te.id, te.data_execucao as data, ta.condominio_id, c.nome as condominio_nome,
          COALESCE(te.funcionario_nome, '') as funcionario_nome, ta.titulo, te.status,
          CONCAT(COALESCE(ta.local, ''), CASE WHEN ta.bloco IS NOT NULL AND ta.bloco <> '' THEN ' - ' || ta.bloco ELSE '' END) as detalhe
        FROM tarefas_execucoes te
        JOIN tarefas_agendadas ta ON ta.id = te.tarefa_id
        JOIN condominios c ON c.id = ta.condominio_id
        WHERE ta.condominio_id = ANY($1)
          AND te.data_execucao >= $2::date
          AND te.data_execucao <= $3::date
        ORDER BY te.data_execucao DESC, te.hora_execucao DESC
        LIMIT 200
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT r.id, r.data::date as data, r.condominio_id, c.nome as condominio_nome,
          COALESCE(u.nome, '') as funcionario_nome, COALESCE(r.item_desc, r.protocolo) as titulo, r.status,
          CONCAT('Prioridade: ', COALESCE(r.prioridade, 'media')) as detalhe
        FROM reportes r
        JOIN condominios c ON c.id = r.condominio_id
        LEFT JOIN usuarios u ON u.id = r.criado_por
        WHERE r.condominio_id = ANY($1)
          AND r.data::date >= $2::date
          AND r.data::date <= $3::date
        ORDER BY r.data DESC
        LIMIT 200
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT v.id, v.data as data, v.condominio_id, c.nome as condominio_nome,
          COALESCE(v.responsavel_nome, '') as funcionario_nome, v.titulo, v.status,
          COALESCE(v.tipo::text, '') as detalhe
        FROM vistorias v
        JOIN condominios c ON c.id = v.condominio_id
        WHERE v.condominio_id = ANY($1)
          AND v.data >= $2::date
          AND v.data <= $3::date
        ORDER BY v.data DESC
        LIMIT 200
      `, [scopedIds, dataInicio, dataFim]),
      query(`
        SELECT ch.id, ch.data as data, ch.condominio_id, c.nome as condominio_nome,
          COALESCE(u.nome, '') as funcionario_nome, ch.local as titulo, ch.status,
          COALESCE(ch.tipo::text, '') as detalhe
        FROM checklists ch
        JOIN condominios c ON c.id = ch.condominio_id
        LEFT JOIN usuarios u ON u.id = ch.responsavel_id
        WHERE ch.condominio_id = ANY($1)
          AND ch.data >= $2::date
          AND ch.data <= $3::date
        ORDER BY ch.data DESC, ch.criado_em DESC
        LIMIT 200
      `, [scopedIds, dataInicio, dataFim]),
    ]);

    const satisfacao = [5, 4, 3, 2, 1].map((nota) => ({
      estrelas: `${nota}★`,
      valor: (satisfacaoRows || []).find((row: any) => Number(row.nota) === nota)?.valor || 0,
    }));

    const registrosBrutos: RegistroRelatorio[] = [
      ...(osRegistros || []).map((row: any) => criarRegistro({
        id: row.id,
        data: row.data,
        funcaoSistema: 'ordens_servico',
        condominioId: row.condominio_id,
        condominioNome: row.condominio_nome,
        funcionarioNome: row.funcionario_nome,
        titulo: row.titulo,
        status: row.status,
        detalhe: row.detalhe,
      })),
      ...(tarefaRegistros || []).map((row: any) => criarRegistro({
        id: row.id,
        data: row.data,
        funcaoSistema: 'tarefas',
        condominioId: row.condominio_id,
        condominioNome: row.condominio_nome,
        funcionarioNome: row.funcionario_nome,
        titulo: row.titulo,
        status: row.status,
        detalhe: row.detalhe,
      })),
      ...(reporteRegistros || []).map((row: any) => criarRegistro({
        id: row.id,
        data: row.data,
        funcaoSistema: 'reportes',
        condominioId: row.condominio_id,
        condominioNome: row.condominio_nome,
        funcionarioNome: row.funcionario_nome,
        titulo: row.titulo,
        status: row.status,
        detalhe: row.detalhe,
      })),
      ...(vistoriaRegistros || []).map((row: any) => criarRegistro({
        id: row.id,
        data: row.data,
        funcaoSistema: 'vistorias',
        condominioId: row.condominio_id,
        condominioNome: row.condominio_nome,
        funcionarioNome: row.funcionario_nome,
        titulo: row.titulo,
        status: row.status,
        detalhe: row.detalhe,
      })),
      ...(checklistRegistros || []).map((row: any) => criarRegistro({
        id: row.id,
        data: row.data,
        funcaoSistema: 'checklists',
        condominioId: row.condominio_id,
        condominioNome: row.condominio_nome,
        funcionarioNome: row.funcionario_nome,
        titulo: row.titulo,
        status: row.status,
        detalhe: row.detalhe,
      })),
    ];

    const registros = registrosBrutos
      .filter((registro) => !funcionario || registro.funcionarioNome === funcionario)
      .filter((registro) => !funcaoSistema || registro.funcaoSistema === funcaoSistema)
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))
      .slice(0, 250);

    const funcionarios = Array.from(new Set(registrosBrutos.map((registro) => registro.funcionarioNome).filter(Boolean))).sort(compararTexto);
    const funcoesSistema = [
      { id: 'ordens_servico', label: rotuloFuncao('ordens_servico') },
      { id: 'tarefas', label: rotuloFuncao('tarefas') },
      { id: 'reportes', label: rotuloFuncao('reportes') },
      { id: 'vistorias', label: rotuloFuncao('vistorias') },
      { id: 'checklists', label: rotuloFuncao('checklists') },
    ];

    res.json({
      osMensal: osMensal || [],
      osPorCondominio: osPorCond || [],
      custoMensal: custoMensal || [],
      produtividade: produtividade || [],
      satisfacao,
      filtros: {
        condominios: condominios || [],
        funcionarios,
        funcoesSistema,
      },
      registros,
      totais: {
        registros: registros.length,
        condominios: (condominios || []).length,
        funcionarios: funcionarios.length,
      },
    });
  } catch (err: any) {
    console.error('GET /relatorios/resumo erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
