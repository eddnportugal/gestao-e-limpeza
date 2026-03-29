import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/comunicados
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) { res.json([]); return; }
    const rows = await query(
      `SELECT cm.*, c.nome as condominio_nome FROM comunicados cm
       LEFT JOIN condominios c ON c.id = cm.condominio_id
       WHERE cm.condominio_id = ANY($1) ORDER BY cm.criado_em DESC`,
      [ids]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('GET /comunicados erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// POST /api/comunicados
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { tipo, titulo, mensagem, destinatarioTipo, condominioId, emailsEnviados, tracking } = req.body;
    if (!condominioId || !ids.includes(condominioId)) {
      res.status(403).json({ error: 'Sem acesso' });
      return;
    }
    const row = await queryOne(
      `INSERT INTO comunicados (tipo, titulo, mensagem, destinatario_tipo, condominio_id, emails_enviados, tracking, enviado_por, enviado_por_nome)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tipo || 'comunicado', titulo, mensagem, destinatarioTipo, condominioId, emailsEnviados || [], JSON.stringify(tracking || []), req.user!.id, req.user!.nome]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('POST /comunicados erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// DELETE /api/comunicados/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const count = await execute('DELETE FROM comunicados WHERE id = $1 AND condominio_id = ANY($2)', [req.params.id, ids]);
    if (count === 0) { res.status(404).json({ error: 'Comunicado não encontrado' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /comunicados erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
