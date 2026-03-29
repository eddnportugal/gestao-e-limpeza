import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/vistorias
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    if (ids.length === 0) { res.json([]); return; }
    const isFuncionario = req.user?.role === 'funcionario';
    const rows = isFuncionario
      ? await query(
        `SELECT v.*, c.nome as condominio_nome FROM vistorias v
         LEFT JOIN condominios c ON c.id = v.condominio_id
         WHERE v.condominio_id = ANY($1)
           AND (
             v.responsavel_id = $2
             OR LOWER(COALESCE(v.responsavel_nome, '')) = LOWER($3)
           )
         ORDER BY v.data DESC`,
        [ids, req.user!.id, req.user!.nome]
      )
      : await query(
        `SELECT v.*, c.nome as condominio_nome FROM vistorias v
         LEFT JOIN condominios c ON c.id = v.condominio_id
         WHERE v.condominio_id = ANY($1) ORDER BY v.data DESC`,
        [ids]
      );
    res.json(rows);
  } catch (err: any) {
    console.error('GET /vistorias erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// POST /api/vistorias
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { titulo, condominioId, tipo, data, responsavelId, responsavelNome, itens } = req.body;
    if (!condominioId || !ids.includes(condominioId)) {
      res.status(403).json({ error: 'Sem acesso' });
      return;
    }
    const row = await queryOne(
      `INSERT INTO vistorias (titulo, condominio_id, tipo, data, responsavel_id, responsavel_nome, itens)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [titulo, condominioId, tipo || 'rotina', data || new Date().toISOString().slice(0, 10), responsavelId || req.user!.id, responsavelNome || req.user!.nome, JSON.stringify(itens || [])]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('POST /vistorias erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// PUT /api/vistorias/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { titulo, tipo, data, itens, status, responsavelId, responsavelNome, condominioId } = req.body;
    const destinoCondominioId = condominioId || null;
    if (destinoCondominioId && !ids.includes(destinoCondominioId)) {
      res.status(403).json({ error: 'Sem acesso' });
      return;
    }
    const row = await queryOne(
      `UPDATE vistorias SET titulo=$1, tipo=$2, data=$3, itens=$4, status=$5, responsavel_id=$6, responsavel_nome=$7, condominio_id = COALESCE($8, condominio_id)
       WHERE id=$9 AND condominio_id = ANY($10) RETURNING *`,
      [titulo, tipo, data, JSON.stringify(itens), status, responsavelId || req.user!.id, responsavelNome, destinoCondominioId, req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Vistoria não encontrada' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('PUT /vistorias erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// DELETE /api/vistorias/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const count = await execute('DELETE FROM vistorias WHERE id = $1 AND condominio_id = ANY($2)', [req.params.id, ids]);
    if (count === 0) { res.status(404).json({ error: 'Vistoria não encontrada' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /vistorias erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
