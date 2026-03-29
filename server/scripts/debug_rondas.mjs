import pg from 'pg';
const p = new pg.Pool({host:'localhost',port:5432,database:'gestao',user:'gestao',password:'gestao_secret'});
try {
  const a = await p.query('SELECT id, nome, criado_por FROM condominios LIMIT 5');
  console.log('CONDOMINIOS:', JSON.stringify(a.rows));
  const b = await p.query('SELECT id, condominio_id FROM pontos_ronda LIMIT 5');
  console.log('PONTOS_RONDA:', JSON.stringify(b.rows));
  const c = await p.query('SELECT id, nome, role, condominio_id, administrador_id, supervisor_id FROM usuarios WHERE ativo=true');
  console.log('USUARIOS:', JSON.stringify(c.rows));
} catch(e) { console.error(e.message); }
await p.end();
