import { query, queryOne } from '../db/database.js';
import { AuthRequest } from './auth.js';

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

/** Check if login is rate-limited for this email/IP */
export async function checkRateLimit(email: string, ip: string): Promise<{ blocked: boolean; remaining: number }> {
  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  // Count failed attempts by email only (not OR ip — shared IPs behind proxy/NAT shouldn't block other users)
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM login_attempts
     WHERE email = $1 AND sucesso = false AND criado_em > $2`,
    [email, cutoff]
  );
  const count = Number.parseInt(row?.count || '0');
  return { blocked: count >= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - count) };
}

/** Record a login attempt */
export async function recordLoginAttempt(email: string, ip: string, sucesso: boolean) {
  await query(
    'INSERT INTO login_attempts (email, ip, sucesso) VALUES ($1, $2, $3)',
    [email, ip, sucesso]
  );
  // On successful login, clear previous failed attempts for this email (reset rate limit)
  if (sucesso) {
    await query('DELETE FROM login_attempts WHERE email = $1 AND sucesso = false', [email]).catch(() => {});
  }
  // Clean up old attempts (>24h)
  await query("DELETE FROM login_attempts WHERE criado_em < NOW() - INTERVAL '24 hours'").catch(() => {});
}

const SENSITIVE_KEYS = new Set(['senha', 'password', 'token', 'jwt', 'secret', 'senha_hash', 'senhaAtual', 'novaSenha']);

function sanitizeDetails(obj: Record<string, any>): Record<string, any> {
  const clean = { ...obj };
  for (const key of Object.keys(clean)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) clean[key] = '[REDACTED]';
  }
  return clean;
}

/** Record an audit log entry */
export async function auditLog(
  user: AuthRequest['user'] | null,
  acao: string,
  entidade?: string,
  entidadeId?: string,
  detalhes?: Record<string, any>,
  ip?: string
) {
  const safeDetails = detalhes ? sanitizeDetails(detalhes) : {};
  await query(
    `INSERT INTO audit_logs (user_id, user_nome, user_role, acao, entidade, entidade_id, detalhes, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      user?.id || null,
      user?.nome || null,
      user?.role || null,
      acao,
      entidade || null,
      entidadeId || null,
      JSON.stringify(safeDetails),
      ip || null,
    ]
  );
}

/** Record a usage metric — batched to reduce DB writes */
const _metricBuffer: Array<[string | null, string, string]> = [];
let _metricFlushTimer: ReturnType<typeof setTimeout> | null = null;

async function _flushMetrics() {
  if (_metricBuffer.length === 0) return;
  const batch = _metricBuffer.splice(0, _metricBuffer.length);
  // Build multi-row INSERT
  const values: any[] = [];
  const placeholders = batch.map((row, i) => {
    const offset = i * 3;
    values.push(row[0], row[1], row[2]);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
  });
  await query(
    `INSERT INTO metricas_uso (condominio_id, user_id, acao) VALUES ${placeholders.join(', ')}`,
    values
  ).catch(() => {});
}

export async function trackMetric(condominioId: string | null, userId: string, acao: string) {
  _metricBuffer.push([condominioId, userId, acao]);
  // Flush every 10s or when buffer reaches 50 items
  if (_metricBuffer.length >= 50) {
    _flushMetrics();
  } else if (!_metricFlushTimer) {
    _metricFlushTimer = setTimeout(() => {
      _metricFlushTimer = null;
      _flushMetrics();
    }, 10_000);
  }
}

/** Create a notification for a user */
export async function createNotification(
  userId: string,
  titulo: string,
  mensagem?: string,
  tipo: string = 'info',
  link?: string
) {
  await query(
    'INSERT INTO notificacoes (user_id, titulo, mensagem, tipo, link) VALUES ($1, $2, $3, $4, $5)',
    [userId, titulo, mensagem || null, tipo, link || null]
  );
}
