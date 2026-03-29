import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ host: 'localhost', port: 5432, database: 'gestao', user: 'gestao', password: 'gestao_secret' });

try {
  // List users
  const users = await p.query('SELECT id, email, role FROM usuarios');
  console.log('Users:');
  users.rows.forEach(u => console.log(`  ${u.role}: ${u.email} (${u.id})`));

  console.log('\nAdmin user found: yes');

  // Test the EXACT payload the frontend would send
  // Login as master first (known password)
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'master@gestao.com', senha: 'master123' }),
  });

  if (!loginRes.ok) {
    console.log('\nMaster login failed:', loginRes.status);
    p.end();
    process.exit(1);
  }

  const { token } = await loginRes.json();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Simulate EXACTLY what the frontend sends (with form data including all extra fields)
  const conds = await (await fetch('http://localhost:3001/api/condominios', { headers })).json();
  const condId = conds[0]?.id;

  console.log('\n── Simulating EXACT frontend payload ──');
  // The frontend form includes ALL interface fields, not just the ones the backend expects
  const frontendPayload = {
    titulo: 'Teste Contrato',
    tipo: 'contrato',
    descricao: '',
    condominioId: condId,
    dataVencimento: '2026-06-01',
    dataUltimaManutencao: '',
    dataProximaManutencao: '',
    emails: ['eduardodominikus@hotmail.com'],
    avisos: [],
    qtdNotificacoes: 1,
    imagens: [],
  };
  console.log('Payload:', JSON.stringify(frontendPayload));

  const res = await fetch('http://localhost:3001/api/vencimentos', {
    method: 'POST', headers, body: JSON.stringify(frontendPayload),
  });
  console.log('Status:', res.status);
  const body = await res.text();
  console.log('Body:', body.slice(0, 500));

  // Cleanup
  if (res.ok) {
    const data = JSON.parse(body);
    await fetch(`http://localhost:3001/api/vencimentos/${data.id}`, { method: 'DELETE', headers });
    console.log('Cleaned up');
  }

  // Test with empty string dates (which frontend might send)
  console.log('\n── Testing with empty string dates ──');
  const payload2 = { ...frontendPayload, dataUltimaManutencao: '', dataProximaManutencao: '' };
  const res2 = await fetch('http://localhost:3001/api/vencimentos', {
    method: 'POST', headers, body: JSON.stringify(payload2),
  });
  console.log('Status:', res2.status);
  const body2 = await res2.text();
  console.log('Body:', body2.slice(0, 500));
  if (res2.ok) {
    const data2 = JSON.parse(body2);
    await fetch(`http://localhost:3001/api/vencimentos/${data2.id}`, { method: 'DELETE', headers });
  }

} catch (e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
} finally {
  p.end();
}
