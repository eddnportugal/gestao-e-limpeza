import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { requireMinRole, requireRole } from '../middleware/rbac.js';
import { auditLog } from '../middleware/helpers.js';

const router = Router();

function mapCondominioError(err: any): string {
  if (err?.code === '42703') {
    return 'Schema do banco desatualizado para condomínios. Reinicie a API para aplicar as migrations pendentes.';
  }

  if (err?.code === '42P01') {
    return 'Tabela de condomínios não encontrada no banco. Verifique as migrations do backend.';
  }

  return 'Erro interno no servidor';
}

// GET /api/condominios
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) { res.json([]); return; }
    const isMaster = req.user?.role === 'master';
    const rows = await query(
      isMaster
        ? `SELECT c.*, u.nome AS administrador_nome FROM condominios c LEFT JOIN usuarios u ON c.criado_por = u.id WHERE c.id = ANY($1) ORDER BY c.nome`
        : `SELECT * FROM condominios WHERE id = ANY($1) AND ativo = true ORDER BY nome`,
      [ids]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('GET /condominios erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// GET /api/condominios/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const isMaster = req.user?.role === 'master';
    const row = await queryOne(
      isMaster
        ? 'SELECT c.*, u.nome AS administrador_nome FROM condominios c LEFT JOIN usuarios u ON c.criado_por = u.id WHERE c.id = $1'
        : 'SELECT * FROM condominios WHERE id = $1 AND ativo = true',
      [req.params.id]
    );
    if (!row || !ids.includes(req.params.id)) {
      res.status(404).json({ error: 'Condomínio não encontrado' });
      return;
    }
    res.json(row);
  } catch (err: any) {
    console.error('GET /condominios/:id erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// POST /api/condominios
router.post('/', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      nome,
      endereco,
      cidade,
      estado,
      cep,
      sindico,
      telefone,
      email,
      logoUrl,
      loginTitulo,
      loginSubtitulo,
      relatorioResponsavelNome,
      relatorioResponsavelCargo,
      relatorioResponsavelRegistro,
      relatorioTelefone,
      relatorioEmail,
      relatorioDocumento,
      relatorioObservacoes,
      blocos,
      unidades,
    } = req.body;
    const row = await queryOne(
      `INSERT INTO condominios (
        nome, endereco, cidade, estado, cep, sindico, telefone, email,
        logo_url, login_titulo, login_subtitulo,
        relatorio_responsavel_nome, relatorio_responsavel_cargo, relatorio_responsavel_registro,
        relatorio_telefone, relatorio_email, relatorio_documento, relatorio_observacoes,
        blocos, unidades, criado_por
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [
        nome,
        endereco,
        cidade,
        estado,
        cep,
        sindico,
        telefone,
        email,
        logoUrl,
        loginTitulo,
        loginSubtitulo,
        relatorioResponsavelNome,
        relatorioResponsavelCargo,
        relatorioResponsavelRegistro,
        relatorioTelefone,
        relatorioEmail,
        relatorioDocumento,
        relatorioObservacoes,
        blocos || 0,
        unidades || 0,
        req.user!.id,
      ]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('POST /condominios erro:', err.message);
    res.status(500).json({ error: mapCondominioError(err) });
  }
});

// PUT /api/condominios/:id
router.put('/:id', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (!ids.includes(req.params.id)) {
      res.status(403).json({ error: 'Sem acesso a este condomínio' });
      return;
    }
    const {
      nome,
      endereco,
      cidade,
      estado,
      cep,
      sindico,
      telefone,
      email,
      logoUrl,
      loginTitulo,
      loginSubtitulo,
      relatorioResponsavelNome,
      relatorioResponsavelCargo,
      relatorioResponsavelRegistro,
      relatorioTelefone,
      relatorioEmail,
      relatorioDocumento,
      relatorioObservacoes,
      blocos,
      unidades,
    } = req.body;
    const row = await queryOne(
      `UPDATE condominios SET nome=$1, endereco=$2, cidade=$3, estado=$4, cep=$5,
       sindico=$6, telefone=$7, email=$8, logo_url=$9, login_titulo=$10, login_subtitulo=$11,
       relatorio_responsavel_nome=$12, relatorio_responsavel_cargo=$13, relatorio_responsavel_registro=$14,
       relatorio_telefone=$15, relatorio_email=$16, relatorio_documento=$17, relatorio_observacoes=$18,
       blocos=$19, unidades=$20
       WHERE id=$21 RETURNING *`,
      [
        nome,
        endereco,
        cidade,
        estado,
        cep,
        sindico,
        telefone,
        email,
        logoUrl,
        loginTitulo,
        loginSubtitulo,
        relatorioResponsavelNome,
        relatorioResponsavelCargo,
        relatorioResponsavelRegistro,
        relatorioTelefone,
        relatorioEmail,
        relatorioDocumento,
        relatorioObservacoes,
        blocos,
        unidades,
        req.params.id,
      ]
    );
    res.json(row);
  } catch (err: any) {
    console.error('PUT /condominios/:id erro:', err.message);
    res.status(500).json({ error: mapCondominioError(err) });
  }
});

// PATCH /api/condominios/:id/status — Master gerencia plano e status
router.patch('/:id/status', requireRole('master'), async (req: AuthRequest, res: Response) => {
  try {
  const { plano, status_plano, ativo, data_fim_teste, valor_mensalidade } = req.body;
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (plano !== undefined) { fields.push(`plano = $${idx++}`); values.push(plano); }
  if (status_plano !== undefined) { fields.push(`status_plano = $${idx++}`); values.push(status_plano); }
  if (ativo !== undefined) { fields.push(`ativo = $${idx++}`); values.push(ativo); }
  if (data_fim_teste !== undefined) { fields.push(`data_fim_teste = $${idx++}`); values.push(data_fim_teste); }
  if (valor_mensalidade !== undefined) { fields.push(`valor_mensalidade = $${idx++}`); values.push(valor_mensalidade); }

  if (fields.length === 0) { res.status(400).json({ error: 'Nenhum campo para atualizar' }); return; }

  values.push(req.params.id);
  const row = await queryOne(
    `UPDATE condominios SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (!row) { res.status(404).json({ error: 'Condomínio não encontrado' }); return; }
  await auditLog(req.user, 'condominio_status_alterado', 'condominios', req.params.id, { plano, status_plano, ativo });
  res.json(row);
  } catch (err: any) { console.error('PATCH /condominios/:id/status erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

// DELETE /api/condominios/:id
router.delete('/:id', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
  const ids: string[] = (req as any).condominioIds;
  if (!ids.includes(req.params.id)) {
    res.status(403).json({ error: 'Sem acesso a este condomínio' });
    return;
  }
  await execute('UPDATE condominios SET ativo = false WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
  } catch (err: any) { console.error('DELETE /condominios/:id erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
