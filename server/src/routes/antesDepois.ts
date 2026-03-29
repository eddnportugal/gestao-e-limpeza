import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/antes-depois
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) { res.json([]); return; }
    const rows = await query(
      `SELECT ad.*, c.nome as condominio_nome, u.nome as criado_por_nome
       FROM antes_depois ad
       LEFT JOIN condominios c ON c.id = ad.condominio_id
       LEFT JOIN usuarios u ON u.id = ad.criado_por
       WHERE ad.condominio_id = ANY($1)
       ORDER BY ad.criado_em DESC`,
      [ids]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('[ANTES_DEPOIS GET]', err.message);
    res.status(500).json({ error: 'Erro ao carregar registros' });
  }
});

// POST /api/antes-depois
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { condominioId, checklistId, itemId, itemDesc, fotoAntes, descAntes, fotoDepois, descDepois } = req.body;
    if (!condominioId || !ids.includes(condominioId)) {
      res.status(403).json({ error: 'Sem acesso a este condomínio' });
      return;
    }
    const row = await queryOne(
      `INSERT INTO antes_depois (checklist_id, item_id, item_desc, foto_antes, desc_antes, foto_depois, desc_depois, condominio_id, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [checklistId, itemId, itemDesc, fotoAntes || null, descAntes || null, fotoDepois || null, descDepois || null, condominioId, req.user!.id]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('[ANTES_DEPOIS POST]', err.message);
    res.status(500).json({ error: 'Erro ao salvar registro' });
  }
});

// DELETE /api/antes-depois/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const count = await execute('DELETE FROM antes_depois WHERE id = $1 AND condominio_id = ANY($2)', [req.params.id, ids]);
    if (count === 0) { res.status(404).json({ error: 'Registro não encontrado' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[ANTES_DEPOIS DELETE]', err.message);
    res.status(500).json({ error: 'Erro ao excluir registro' });
  }
});

export default router;
