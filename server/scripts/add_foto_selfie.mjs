import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gestao',
  user: process.env.DB_USER || 'gestao',
  password: process.env.DB_PASSWORD || 'gestao_secret',
});

try {
  await pool.query('ALTER TABLE registros_ronda ADD COLUMN IF NOT EXISTS foto_selfie TEXT');
  console.log('✅ Coluna foto_selfie adicionada à tabela registros_ronda');
} catch (err) {
  console.error('❌ Erro:', err.message);
} finally {
  await pool.end();
}
