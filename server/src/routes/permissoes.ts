import { Router, Response } from 'express';
import { query, queryOne } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';

const router = Router();

// GET /api/permissoes
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
  const rows = await query('SELECT * FROM permissoes_funcoes ORDER BY nome');
  res.json(rows);
  } catch (err: any) { console.error('GET /permissoes erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

// PUT /api/permissoes/:id
router.put('/:id', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
  const { ativa, perfis } = req.body;
  const row = await queryOne(
    `UPDATE permissoes_funcoes SET ativa = $1, perfis = $2 WHERE id = $3 RETURNING *`,
    [ativa, JSON.stringify(perfis), req.params.id]
  );
  res.json(row);
  } catch (err: any) { console.error('PUT /permissoes/:id erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
