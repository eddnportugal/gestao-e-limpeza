import pg from 'pg';
const p = new pg.Pool({host:'localhost',port:5432,database:'gestao',user:'gestao',password:'gestao_secret'});
const r = await p.query('SELECT * FROM registros_ronda ORDER BY data_hora DESC LIMIT 3');
console.log(JSON.stringify(r.rows, null, 2));
await p.end();
