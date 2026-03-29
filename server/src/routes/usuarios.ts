import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { query, queryOne, execute, withTransaction, cacheDel } from '../db/database.js';
import { AuthRequest, invalidateUserCache } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';

const router = Router();

function resolveAdminId(caller: { role: string; id: string; administrador_id?: string | null }): string | null {
  if (caller.role === 'master') return null;
  if (caller.role === 'administrador') return caller.id;
  return caller.administrador_id ?? null;
}

// POST /api/usuarios
router.post('/', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
    const caller = req.user!;
    const { email, senha, nome, role, cargo, condominioId, supervisorId } = req.body;

    if (!email || !senha || !nome || !role) {
      res.status(400).json({ error: 'email, senha, nome e role são obrigatórios' });
      return;
    }

    if (senha.length < 6) {
      res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
      return;
    }

    const roleLevel: Record<string, number> = { master: 4, administrador: 3, supervisor: 2, funcionario: 1 };
    if ((roleLevel[role] ?? 0) >= (roleLevel[caller.role] ?? 0)) {
      res.status(403).json({ error: 'Não pode criar usuário com role igual ou superior' });
      return;
    }

    const exists = await queryOne<any>('SELECT id, ativo FROM usuarios WHERE email = $1', [email]);
    if (exists && exists.ativo) {
      res.status(409).json({ error: 'Este e-mail já está em uso por outro usuário ativo' });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const adminId = resolveAdminId(caller);
    const supId = role === 'funcionario' ? (supervisorId || caller.id) : null;

    let user: any;
    if (exists && !exists.ativo) {
      // Reactivate soft-deleted user with new data
      user = await queryOne<any>(
        `UPDATE usuarios SET senha_hash=$1, nome=$2, role=$3, cargo=$4, criado_por=$5, administrador_id=$6, supervisor_id=$7, condominio_id=$8, ativo=true, bloqueado=false, motivo_bloqueio=NULL
         WHERE id=$9
         RETURNING id, email, nome, role, cargo, ativo, bloqueado, condominio_id, supervisor_id, administrador_id, criado_em`,
        [senhaHash, nome, role, cargo || null, caller.id, adminId, supId, condominioId || null, exists.id]
      );
    } else {
      user = await queryOne<any>(
        `INSERT INTO usuarios (email, senha_hash, nome, role, cargo, criado_por, administrador_id, supervisor_id, condominio_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, email, nome, role, cargo, ativo, bloqueado, condominio_id, supervisor_id, administrador_id, criado_em`,
        [email, senhaHash, nome, role, cargo || null, caller.id, adminId, supId, condominioId || null]
      );
    }

    // Invalidate scope cache (new user changes condomínio/supervisor counts)
    cacheDel('scope:');
    cacheDel('dash:');
    res.status(201).json(user);
  } catch (err: any) {
    console.error('[CRIAR USUARIO ERROR]', err.message);
    res.status(500).json({ error: 'Erro interno ao criar usuário' });
  }
});

// GET /api/usuarios
router.get('/', requireMinRole('supervisor'), async (req: AuthRequest, res: Response) => {
  try {
  const user = req.user!;
  let rows;

  if (user.role === 'master') {
    rows = await query(
      `SELECT id, email, nome, role, ativo, bloqueado, motivo_bloqueio, administrador_id, supervisor_id, condominio_id, avatar_url, telefone, cargo, criado_em
       FROM usuarios WHERE ativo = true ORDER BY nome`
    );
  } else if (user.role === 'administrador') {
    rows = await query(
      `SELECT id, email, nome, role, ativo, bloqueado, motivo_bloqueio, administrador_id, supervisor_id, condominio_id, avatar_url, telefone, cargo, criado_em
       FROM usuarios WHERE ativo = true AND (administrador_id = $1 OR id = $1
         OR (administrador_id IS NULL AND role = 'funcionario'))
       ORDER BY nome`,
      [user.id]
    );
  } else {
    // supervisor — vê seus funcionários
    rows = await query(
      `SELECT id, email, nome, role, ativo, bloqueado, administrador_id, supervisor_id, condominio_id, avatar_url, telefone, cargo, criado_em
       FROM usuarios WHERE ativo = true AND (supervisor_id = $1 OR id = $1) ORDER BY nome`,
      [user.id]
    );
  }

  res.json(rows);
  } catch (err: any) {
    console.error('GET /usuarios erro:', err.message);
    res.status(500).json({ error: 'Erro interno ao listar usuários' });
  }
});

// GET /api/usuarios/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
  const row = await queryOne(
    `SELECT id, email, nome, role, ativo, bloqueado, motivo_bloqueio, administrador_id, supervisor_id, condominio_id, avatar_url, telefone, cargo, criado_em
     FROM usuarios WHERE id = $1`,
    [req.params.id]
  );
  if (!row) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  res.json(row);
  } catch (err: any) {
    console.error('GET /usuarios/:id erro:', err.message);
    res.status(500).json({ error: 'Erro interno ao buscar usuário' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
  const caller = req.user!;
  // Verify target belongs to caller's hierarchy
  if (caller.role !== 'master') {
    const target = await queryOne<any>('SELECT administrador_id, role FROM usuarios WHERE id = $1', [req.params.id]);
    if (!target) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
    const isOwner = target.administrador_id === caller.id;
    const isOrphan = target.administrador_id === null && target.role === 'funcionario';
    if (!isOwner && !isOrphan) {
      res.status(403).json({ error: 'Sem permissão para este usuário' });
      return;
    }
  }
  const { nome, role, ativo, condominioId, supervisorId, telefone, cargo } = req.body;
  const row = await queryOne(
    `UPDATE usuarios SET nome=$1, role=$2, ativo=$3, condominio_id=$4, supervisor_id=$5, telefone=$6, cargo=$7
     WHERE id=$8 RETURNING id, email, nome, role, ativo, condominio_id, supervisor_id`,
    [nome, role, ativo, condominioId, supervisorId, telefone, cargo, req.params.id]
  );
  if (!row) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  invalidateUserCache(req.params.id);
  cacheDel('dash:');
  res.json(row);
  } catch (err: any) {
    console.error('PUT /usuarios/:id erro:', err.message);
    res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
  }
});

// PATCH /api/usuarios/:id/bloquear
router.patch('/:id/bloquear', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
  const { bloqueado, motivo } = req.body;
  const targetId = req.params.id;

  // Verify target belongs to caller's hierarchy
  const caller = req.user!;
  if (caller.role !== 'master') {
    const target = await queryOne<any>('SELECT administrador_id, role FROM usuarios WHERE id = $1', [targetId]);
    if (!target) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
    const isOwner = target.administrador_id === caller.id;
    const isOrphan = target.administrador_id === null && target.role === 'funcionario';
    if (!isOwner && !isOrphan) {
      res.status(403).json({ error: 'Sem permissão para este usuário' });
      return;
    }
  }

  const row = await withTransaction(async (client) => {
    // 1. Block/unblock the target user
    const { rows } = await client.query(
      'UPDATE usuarios SET bloqueado = $1, motivo_bloqueio = $2 WHERE id = $3 RETURNING id, bloqueado, role',
      [bloqueado, motivo || null, targetId]
    );
    if (!rows[0]) return null;
    const target = rows[0];

    // 2. If target is administrador, cascade to all hierarchical users + QR codes
    if (target.role === 'administrador') {
      await client.query(
        'UPDATE usuarios SET bloqueado = $1, motivo_bloqueio = $2 WHERE administrador_id = $3',
        [bloqueado, bloqueado ? (motivo || 'Administrador bloqueado') : null, targetId]
      );
      await client.query(
        `UPDATE usuarios SET bloqueado = $1, motivo_bloqueio = $2
         WHERE supervisor_id IN (SELECT id FROM usuarios WHERE administrador_id = $3 AND role = 'supervisor')`,
        [bloqueado, bloqueado ? (motivo || 'Administrador bloqueado') : null, targetId]
      );
      await client.query(
        `UPDATE qrcodes SET ativo = $1
         WHERE condominio_id IN (SELECT id FROM condominios WHERE criado_por = $2)`,
        [!bloqueado, targetId]
      );
      await client.query(
        `UPDATE qrcodes SET ativo = $1
         WHERE criado_por = $2
            OR criado_por IN (SELECT id FROM usuarios WHERE administrador_id = $2)
            OR criado_por IN (
              SELECT id FROM usuarios WHERE supervisor_id IN (
                SELECT id FROM usuarios WHERE administrador_id = $2 AND role = 'supervisor'
              )
            )`,
        [!bloqueado, targetId]
      );
    }

    // 3. If target is supervisor, cascade to funcionários under them + their QR codes
    if (target.role === 'supervisor') {
      await client.query(
        'UPDATE usuarios SET bloqueado = $1, motivo_bloqueio = $2 WHERE supervisor_id = $3',
        [bloqueado, bloqueado ? (motivo || 'Supervisor bloqueado') : null, targetId]
      );
      await client.query(
        `UPDATE qrcodes SET ativo = $1
         WHERE criado_por = $2 OR criado_por IN (SELECT id FROM usuarios WHERE supervisor_id = $2)`,
        [!bloqueado, targetId]
      );
    }

    return target;
  });

  if (!row) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  // Invalidate all caches — blocking cascades to sub-users
  invalidateUserCache(req.params.id);
  cacheDel('auth:');
  cacheDel('scope:');
  cacheDel('dash:');
  res.json(row);
  } catch (err: any) {
    console.error('PATCH /usuarios/:id/bloquear erro:', err.message);
    res.status(500).json({ error: 'Erro interno ao bloquear/desbloquear usuário' });
  }
});

// PATCH /api/usuarios/:id/reset-senha
router.patch('/:id/reset-senha', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
  const { novaSenha } = req.body;
  if (!novaSenha || novaSenha.length < 6) {
    res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    return;
  }
  // Verify target belongs to caller's hierarchy
  const caller = req.user!;
  if (caller.role !== 'master') {
    const target = await queryOne<any>('SELECT administrador_id FROM usuarios WHERE id = $1', [req.params.id]);
    if (!target || target.administrador_id !== caller.id) {
      res.status(403).json({ error: 'Sem permissão para este usuário' });
      return;
    }
  }
  const hash = await bcrypt.hash(novaSenha, 12);
  await execute('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [hash, req.params.id]);
  invalidateUserCache(req.params.id);
  res.json({ ok: true });
  } catch (err: any) {
    console.error('PATCH /usuarios/:id/reset-senha erro:', err.message);
    res.status(500).json({ error: 'Erro interno ao resetar senha' });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', requireMinRole('administrador'), async (req: AuthRequest, res: Response) => {
  try {
  const caller = req.user!;
  if (caller.role !== 'master') {
    const target = await queryOne<any>('SELECT administrador_id, role FROM usuarios WHERE id = $1', [req.params.id]);
    if (!target) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
    const isOwner = target.administrador_id === caller.id;
    const isOrphan = target.administrador_id === null && target.role === 'funcionario';
    if (!isOwner && !isOrphan) {
      res.status(403).json({ error: 'Sem permissão para este usuário' });
      return;
    }
  }
  await execute('UPDATE usuarios SET ativo = false WHERE id = $1', [req.params.id]);
  invalidateUserCache(req.params.id);
  cacheDel('dash:');
  res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /usuarios/:id erro:', err.message);
    res.status(500).json({ error: 'Erro interno ao excluir usuário' });
  }
});

export default router;
