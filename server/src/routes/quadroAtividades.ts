import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/quadro-atividades
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) { res.json([]); return; }
    const isFuncionario = req.user?.role === 'funcionario';
    const rows = isFuncionario
      ? await query(
        `SELECT qa.*, c.nome as condominio_nome FROM quadro_atividades qa
         LEFT JOIN condominios c ON c.id = qa.condominio_id
         WHERE qa.condominio_id = ANY($1)
           AND (
             qa.responsavel_id = $2
             OR LOWER(COALESCE(qa.responsavel_nome, '')) = LOWER($3)
           )
         ORDER BY qa.criado_em DESC`,
        [ids, req.user!.id, req.user!.nome]
      )
      : await query(
        `SELECT qa.*, c.nome as condominio_nome FROM quadro_atividades qa
         LEFT JOIN condominios c ON c.id = qa.condominio_id
         WHERE qa.condominio_id = ANY($1) ORDER BY qa.criado_em DESC`,
        [ids]
      );
    res.json(rows);
  } catch (err: any) {
    console.error('GET /quadro-atividades erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// POST /api/quadro-atividades
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { titulo, descricao, status, prioridade, rotina, dataEspecifica, responsavelId, responsavelNome, condominioId } = req.body;
    if (!condominioId || !ids.includes(condominioId)) {
      res.status(403).json({ error: 'Sem acesso' });
      return;
    }
    const row = await queryOne(
      `INSERT INTO quadro_atividades (titulo, descricao, status, prioridade, rotina, data_especifica, responsavel_id, responsavel_nome, condominio_id, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [titulo, descricao, status || 'a_fazer', prioridade || 'media', rotina || 'diaria', dataEspecifica, responsavelId, responsavelNome, condominioId, req.user!.id]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('POST /quadro-atividades erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// PUT /api/quadro-atividades/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { titulo, descricao, prioridade, rotina, dataEspecifica, responsavelId, responsavelNome } = req.body;
    const row = await queryOne(
      `UPDATE quadro_atividades SET titulo=$1, descricao=$2, prioridade=$3, rotina=$4, data_especifica=$5, responsavel_id=$6, responsavel_nome=$7
       WHERE id=$8 AND condominio_id = ANY($9) RETURNING *`,
      [titulo, descricao, prioridade, rotina, dataEspecifica, responsavelId, responsavelNome, req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Atividade não encontrada' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('PUT /quadro-atividades erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// PATCH /api/quadro-atividades/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { status } = req.body;
    const validStatus = ['a_fazer', 'em_andamento', 'em_revisao', 'concluido'];
    if (!validStatus.includes(status)) { res.status(400).json({ error: 'Status inválido' }); return; }

    const row = await queryOne(
      `UPDATE quadro_atividades
       SET status = $1,
           historico = COALESCE(historico, '[]'::jsonb) || $2::jsonb
       WHERE id = $3 AND condominio_id = ANY($4) RETURNING *`,
      [status, JSON.stringify({ status, data: new Date().toISOString(), usuario: req.user!.nome }), req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Atividade não encontrada' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('PATCH /quadro-atividades/:id/status erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// DELETE /api/quadro-atividades/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const count = await execute('DELETE FROM quadro_atividades WHERE id = $1 AND condominio_id = ANY($2)', [req.params.id, ids]);
    if (count === 0) { res.status(404).json({ error: 'Atividade não encontrada' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /quadro-atividades erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
