import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ host: 'localhost', port: 5432, database: 'gestao', user: 'gestao', password: 'gestao_secret' });

try {
  // 1. DB connectivity
  const ok = await p.query('SELECT 1 as ok');
  console.log('✓ DB connected:', ok.rows[0]);

  // 2. Vencimentos table schema
  const vCols = await p.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='vencimentos' ORDER BY ordinal_position"
  );
  console.log('\n── VENCIMENTOS columns ──');
  vCols.rows.forEach(x => console.log(`  ${x.column_name} (${x.data_type})`));

  // 3. Checklists table schema
  const cCols = await p.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='checklists' ORDER BY ordinal_position"
  );
  console.log('\n── CHECKLISTS columns ──');
  cCols.rows.forEach(x => console.log(`  ${x.column_name} (${x.data_type})`));

  // 4. Login + test API
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'master@gestao.com', senha: 'master123' }),
  });
  let token;
  if (!loginRes.ok) {
    const loginRes2 = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'eduardodominikus@hotmail.com', senha: 'Mudar123!' }),
    });
    if (!loginRes2.ok) {
      console.log('\n✗ Could not login with either account');
      p.end();
      process.exit(1);
    }
    const data2 = await loginRes2.json();
    token = data2.token;
    console.log('\n✓ Logged in as admin');
  } else {
    const data1 = await loginRes.json();
    token = data1.token;
    console.log('\n✓ Logged in as master');
  }

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // 5. GET condominios
  const condsRes = await fetch('http://localhost:3001/api/condominios', { headers });
  const conds = await condsRes.json();
  console.log('\n── Condominios ──');
  conds.forEach(c => console.log(`  ${c.id} — ${c.nome}`));

  if (conds.length === 0) {
    console.log('✗ No condominios! Cannot create vencimento or checklist.');
    p.end();
    process.exit(1);
  }

  const condId = conds[0].id;

  // 6. POST vencimento
  console.log('\n── Testing POST /api/vencimentos ──');
  const vPayload = {
    condominioId: condId,
    titulo: 'CHECKUP TEST',
    tipo: 'contrato',
    descricao: 'test',
    dataVencimento: '2026-06-01',
    emails: [],
    avisos: [],
    qtdNotificacoes: 1,
    imagens: [],
  };
  const vRes = await fetch('http://localhost:3001/api/vencimentos', {
    method: 'POST', headers, body: JSON.stringify(vPayload),
  });
  console.log(`  Status: ${vRes.status}`);
  const vBody = await vRes.text();
  console.log(`  Body: ${vBody.slice(0, 500)}`);

  // 7. POST checklist
  console.log('\n── Testing POST /api/checklists ──');
  const ckPayload = {
    condominioId: condId,
    local: 'CHECKUP TEST',
    tipo: 'diaria',
    itens: [{ id: '1', descricao: 'test', concluido: false }],
    data: '2026-03-25',
    status: 'pendente',
  };
  const ckRes = await fetch('http://localhost:3001/api/checklists', {
    method: 'POST', headers, body: JSON.stringify(ckPayload),
  });
  console.log(`  Status: ${ckRes.status}`);
  const ckBody = await ckRes.text();
  console.log(`  Body: ${ckBody.slice(0, 500)}`);

  // 8. Cleanup
  if (vRes.ok) {
    const vData = JSON.parse(vBody);
    await fetch(`http://localhost:3001/api/vencimentos/${vData.id}`, { method: 'DELETE', headers });
    console.log('\n✓ Cleaned up test vencimento');
  }
  if (ckRes.ok) {
    const ckData = JSON.parse(ckBody);
    await fetch(`http://localhost:3001/api/checklists/${ckData.id}`, { method: 'DELETE', headers });
    console.log('✓ Cleaned up test checklist');
  }

  // 9. Check other critical routes
  console.log('\n── Testing other routes ──');
  const routes = ['/api/ordens-servico', '/api/escalas', '/api/materiais', '/api/comunicados'];
  for (const route of routes) {
    try {
      const r = await fetch(`http://localhost:3001${route}`, { headers });
      console.log(`  ${route}: ${r.status}`);
    } catch (e) {
      console.log(`  ${route}: FAILED - ${e.message}`);
    }
  }

} catch (e) {
  console.error('\n✗ ERROR:', e.message);
  console.error(e.stack);
} finally {
  p.end();
}
