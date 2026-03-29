import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

function gerarProtocolo(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `RPT-${y}${m}${d}-${r}`;
}

// GET /api/reportes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) { res.json([]); return; }
    const rows = await query(
      `SELECT r.*, c.nome as condominio_nome FROM reportes r
       LEFT JOIN condominios c ON c.id = r.condominio_id
       WHERE r.condominio_id = ANY($1) ORDER BY r.data DESC`,
      [ids]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('[REPORTES GET]', err.message);
    res.status(500).json({ error: 'Erro ao carregar reportes' });
  }
});

// POST /api/reportes
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { condominioId, itemDesc, checklistId, vistoriaId, descricao, prioridade, imagens } = req.body;
    if (!condominioId || !ids.includes(condominioId)) {
      res.status(403).json({ error: 'Sem acesso a este condomínio' });
      return;
    }
    const protocolo = gerarProtocolo();
    const row = await queryOne(
      `INSERT INTO reportes (protocolo, condominio_id, item_desc, checklist_id, vistoria_id, descricao, prioridade, imagens, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [protocolo, condominioId, itemDesc, checklistId, vistoriaId, descricao, prioridade || 'media', imagens || [], req.user!.id]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('[REPORTES POST]', err.message);
    res.status(500).json({ error: 'Erro ao criar reporte' });
  }
});

// PATCH /api/reportes/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { status } = req.body;
    const validStatus = ['aberto', 'em_analise', 'resolvido'];
    if (!validStatus.includes(status)) { res.status(400).json({ error: 'Status inválido' }); return; }
    const row = await queryOne(
      'UPDATE reportes SET status = $1 WHERE id = $2 AND condominio_id = ANY($3) RETURNING *',
      [status, req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Reporte não encontrado' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('[REPORTES PATCH]', err.message);
    res.status(500).json({ error: 'Erro ao atualizar reporte' });
  }
});

// DELETE /api/reportes/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const count = await execute('DELETE FROM reportes WHERE id = $1 AND condominio_id = ANY($2)', [req.params.id, ids]);
    if (count === 0) { res.status(404).json({ error: 'Reporte não encontrado' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[REPORTES DELETE]', err.message);
    res.status(500).json({ error: 'Erro ao excluir reporte' });
  }
});

export default router;
