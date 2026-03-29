import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/checklists
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) { res.json([]); return; }
    const isFuncionario = req.user?.role === 'funcionario';
    const rows = isFuncionario
      ? await query(
        `SELECT ch.*, c.nome as condominio_nome, u.nome as responsavel_nome
         FROM checklists ch
         LEFT JOIN condominios c ON c.id = ch.condominio_id
         LEFT JOIN usuarios u ON u.id = ch.responsavel_id
         WHERE ch.condominio_id = ANY($1) AND ch.responsavel_id = $2
         ORDER BY ch.data DESC`,
        [ids, req.user!.id]
      )
      : await query(
        `SELECT ch.*, c.nome as condominio_nome, u.nome as responsavel_nome
         FROM checklists ch
         LEFT JOIN condominios c ON c.id = ch.condominio_id
         LEFT JOIN usuarios u ON u.id = ch.responsavel_id
         WHERE ch.condominio_id = ANY($1)
         ORDER BY ch.data DESC`,
        [ids]
      );
    res.json(rows);
  } catch (err: any) {
    console.error('[CHECKLISTS GET]', err.message);
    res.status(500).json({ error: 'Erro ao carregar checklists' });
  }
});

// POST /api/checklists
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { condominioId, local, tipo, itens, responsavelId, supervisorId, data } = req.body;
    if (!condominioId || !ids.includes(condominioId)) {
      res.status(403).json({ error: 'Sem acesso a este condomínio' });
      return;
    }
    const row = await queryOne(
      `INSERT INTO checklists (condominio_id, local, tipo, itens, responsavel_id, supervisor_id, data, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [condominioId, local, tipo || 'diaria', JSON.stringify(itens || []), responsavelId || req.user!.id, supervisorId || null, data || new Date().toISOString().slice(0, 10), req.user!.id]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('[CHECKLISTS POST]', err.message);
    res.status(500).json({ error: 'Erro ao criar checklist' });
  }
});

// PUT /api/checklists/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { local, tipo, itens, status, horaInicio, horaFim, assinatura, responsavelId, data, condominioId } = req.body;
    const destinoCondominioId = condominioId || null;
    if (destinoCondominioId && !ids.includes(destinoCondominioId)) {
      res.status(403).json({ error: 'Sem acesso a este condomínio' });
      return;
    }
    const row = await queryOne(
      `UPDATE checklists SET local=$1, tipo=$2, itens=$3, status=$4, hora_inicio=$5, hora_fim=$6, assinatura=$7, responsavel_id=$8, data=$9, condominio_id = COALESCE($10, condominio_id)
       WHERE id=$11 AND condominio_id = ANY($12) RETURNING *`,
      [local, tipo, JSON.stringify(itens), status, horaInicio || null, horaFim || null, assinatura, responsavelId || req.user!.id, data || new Date().toISOString().slice(0, 10), destinoCondominioId, req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Checklist não encontrado' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('[CHECKLISTS PUT]', err.message);
    res.status(500).json({ error: 'Erro ao atualizar checklist' });
  }
});

// PATCH /api/checklists/:id/itens
router.patch('/:id/itens', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { itens, status, horaFim, assinatura } = req.body;
    const fields: string[] = ['itens = $1'];
    const params: any[] = [JSON.stringify(itens)];
    let idx = 2;
    if (status) { fields.push(`status = $${idx++}`); params.push(status); }
    if (horaFim) { fields.push(`hora_fim = $${idx++}`); params.push(horaFim); }
    if (assinatura) { fields.push(`assinatura = $${idx++}`); params.push(assinatura); }
    params.push(req.params.id, ids);
    const row = await queryOne(
      `UPDATE checklists SET ${fields.join(', ')} WHERE id = $${idx} AND condominio_id = ANY($${idx + 1}) RETURNING *`,
      params
    );
    if (!row) { res.status(404).json({ error: 'Checklist não encontrado' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('[CHECKLISTS PATCH]', err.message);
    res.status(500).json({ error: 'Erro ao atualizar checklist' });
  }
});

// DELETE /api/checklists/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const count = await execute('DELETE FROM checklists WHERE id = $1 AND condominio_id = ANY($2)', [req.params.id, ids]);
    if (count === 0) { res.status(404).json({ error: 'Checklist não encontrado' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[CHECKLISTS DELETE]', err.message);
    res.status(500).json({ error: 'Erro ao excluir checklist' });
  }
});

export default router;
