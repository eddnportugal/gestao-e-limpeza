import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Listar pontos de ronda ──
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds || [];
    if (ids.length === 0) { res.json([]); return; }
    const rows = await query(
      `SELECT p.*, c.nome AS condominio_nome
       FROM pontos_ronda p
       INNER JOIN condominios c ON c.id = p.condominio_id
       WHERE p.condominio_id = ANY($1)
       ORDER BY p.criado_em DESC`,
      [ids]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('[Rondas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Listar registros (com filtros) — DEVE ficar antes de /:id ──
router.get('/registros/all', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { de, ate, funcionarioId } = req.query;
    let sql = `
      SELECT r.*, p.titulo AS ponto_titulo, p.descricao AS ponto_descricao,
             c.nome AS condominio_nome
      FROM registros_ronda r
      INNER JOIN pontos_ronda p ON p.id = r.ponto_id
      INNER JOIN condominios c ON c.id = p.condominio_id
      WHERE p.condominio_id = ANY($1)
    `;
    const params: any[] = [ids];
    let idx = 2;

    if (de) {
      sql += ` AND r.data_hora >= $${idx}`;
      params.push(de);
      idx++;
    }
    if (ate) {
      sql += ` AND r.data_hora <= $${idx}`;
      params.push(ate);
      idx++;
    }
    if (funcionarioId) {
      sql += ` AND r.funcionario_id = $${idx}`;
      params.push(funcionarioId);
      idx++;
    }

    sql += ' ORDER BY r.data_hora DESC LIMIT 1000';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err: any) {
    console.error('[Rondas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Obter ponto por ID ──
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const row = await queryOne(
      `SELECT p.*, c.nome AS condominio_nome
       FROM pontos_ronda p
       INNER JOIN condominios c ON c.id = p.condominio_id
       WHERE p.id = $1 AND p.condominio_id = ANY($2)`,
      [req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Ponto não encontrado' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('[Rondas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Criar ponto de ronda ──
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    const { condominioId, titulo, descricao, imagem } = req.body;
    if (!condominioId || !titulo?.trim()) {
      res.status(400).json({ error: 'Condomínio e título são obrigatórios' });
      return;
    }
    const ids: string[] = (req as any).condominioIds;
    if (!ids.includes(condominioId)) {
      res.status(403).json({ error: 'Sem acesso a este condomínio' });
      return;
    }
    const row = await queryOne(
      `INSERT INTO pontos_ronda (condominio_id, titulo, descricao, imagem, criado_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [condominioId, titulo.trim(), descricao || null, imagem || null, req.user.id]
    );
    res.status(201).json(row);
  } catch (err: any) {
    console.error('[Rondas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Atualizar ponto ──
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const { titulo, descricao, imagem } = req.body;
    const row = await queryOne(
      `UPDATE pontos_ronda SET titulo = $1, descricao = $2, imagem = $3
       WHERE id = $4 AND condominio_id = ANY($5) RETURNING *`,
      [titulo?.trim(), descricao || null, imagem || null, req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Ponto não encontrado' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('[Rondas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Toggle ativo ──
router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const row = await queryOne(
      `UPDATE pontos_ronda SET ativo = NOT ativo
       WHERE id = $1 AND condominio_id = ANY($2) RETURNING *`,
      [req.params.id, ids]
    );
    if (!row) { res.status(404).json({ error: 'Ponto não encontrado' }); return; }
    res.json(row);
  } catch (err: any) {
    console.error('[Rondas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Excluir ponto ──
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ids: string[] = (req as any).condominioIds;
    const count = await execute(
      'DELETE FROM pontos_ronda WHERE id = $1 AND condominio_id = ANY($2)',
      [req.params.id, ids]
    );
    if (count === 0) { res.status(404).json({ error: 'Ponto não encontrado' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Rondas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
