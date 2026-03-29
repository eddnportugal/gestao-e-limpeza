import pg from 'pg';
const pool = new pg.Pool({ host: 'localhost', port: 5432, database: 'gestao', user: 'gestao', password: 'gestao_secret' });

try {
  const res = await pool.query(
    `INSERT INTO permissoes_funcoes (id, nome, ativa, perfis)
     VALUES ('doc-publicos', 'Docs Públicos (QR)', true, $1)
     ON CONFLICT (id) DO NOTHING RETURNING *`,
    [JSON.stringify({ master: true, administrador: true, supervisor: true, funcionario: false })]
  );
  console.log('OK —', res.rowCount, 'inserida(s)');
  if (res.rows[0]) console.log(JSON.stringify(res.rows[0], null, 2));
} catch (e) {
  console.error('Erro:', e.message);
} finally {
  await pool.end();
}
