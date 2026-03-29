import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/notificacoes — user's notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
  const rows = await query(
    `SELECT * FROM notificacoes WHERE user_id = $1 ORDER BY criado_em DESC LIMIT 50`,
    [req.user!.id]
  );
  res.json(rows);
  } catch (err: any) { console.error('GET /notificacoes erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/notificacoes/unread-count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
  const row = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM notificacoes WHERE user_id = $1 AND lida = false',
    [req.user!.id]
  );
  res.json({ count: parseInt(row?.count || '0') });
  } catch (err: any) { console.error('GET /notificacoes/unread-count erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

// PATCH /api/notificacoes/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
  await execute(
    'UPDATE notificacoes SET lida = true WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  res.json({ ok: true });
  } catch (err: any) { console.error('PATCH /notificacoes/:id/read erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/notificacoes/read-all
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
  await execute(
    'UPDATE notificacoes SET lida = true WHERE user_id = $1 AND lida = false',
    [req.user!.id]
  );
  res.json({ ok: true });
  } catch (err: any) { console.error('POST /notificacoes/read-all erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

// DELETE /api/notificacoes/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
  await execute(
    'DELETE FROM notificacoes WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  res.json({ ok: true });
  } catch (err: any) { console.error('DELETE /notificacoes/:id erro:', err.message); res.status(500).json({ error: 'Erro interno' }); }
});

export default router;
