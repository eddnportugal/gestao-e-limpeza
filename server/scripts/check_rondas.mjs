import pg from 'pg';
const p = new pg.Pool({host:'localhost',port:5432,database:'gestao',user:'gestao',password:'gestao_secret'});
const r = await p.query('SELECT perfis FROM permissoes_funcoes WHERE id=$1', ['rondas']);
console.log(JSON.stringify(r.rows[0], null, 2));
await p.end();
