// Quick test: login, get condominios, create a vencimento
const BASE = 'http://localhost:3001/api';

async function main() {
  // 1. Login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'eduardodominikus@hotmail.com', senha: 'Mudar123!' }),
  });
  if (!loginRes.ok) {
    // Try alternate password
    const loginRes2 = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'master@gestao.com', senha: 'master123' }),
    });
    if (!loginRes2.ok) {
      console.log('Login failed with both accounts:', loginRes.status, await loginRes.text());
      console.log('Login2:', loginRes2.status, await loginRes2.text());
      return;
    }
    var { token } = await loginRes2.json();
    console.log('Logged in as master@gestao.com');
  } else {
    var { token } = await loginRes.json();
    console.log('Logged in as eduardodominikus@hotmail.com');
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // 2. Get condominios
  const condsRes = await fetch(`${BASE}/condominios`, { headers });
  const conds = await condsRes.json();
  console.log('\nCondominios:', JSON.stringify(conds.map(c => ({ id: c.id, nome: c.nome }))));

  if (conds.length === 0) {
    console.log('ERROR: No condominios returned! condominioIds is empty for this user.');
    return;
  }

  const condId = conds[0].id;
  console.log('\nUsing condominioId:', condId);

  // 3. Create vencimento
  const payload = {
    condominioId: condId,
    titulo: 'Teste API Direta',
    tipo: 'contrato',
    descricao: 'teste',
    dataVencimento: '2026-06-01',
    emails: [],
    avisos: [],
    qtdNotificacoes: 1,
    imagens: [],
  };
  console.log('\nSending POST /api/vencimentos with body keys:', Object.keys(payload));
  console.log('condominioId value:', payload.condominioId);

  const vencRes = await fetch(`${BASE}/vencimentos`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  console.log('\nResponse status:', vencRes.status);
  const vencBody = await vencRes.json();
  console.log('Response body:', JSON.stringify(vencBody).slice(0, 500));

  // 4. Also test checklist
  const ckPayload = {
    condominioId: condId,
    local: 'Hall de Entrada - Teste API',
    tipo: 'diaria',
    itens: [{ id: '1', descricao: 'Limpar piso', concluido: false }],
    data: '2026-03-25',
    status: 'pendente',
  };
  console.log('\nSending POST /api/checklists with body keys:', Object.keys(ckPayload));

  const ckRes = await fetch(`${BASE}/checklists`, {
    method: 'POST',
    headers,
    body: JSON.stringify(ckPayload),
  });

  console.log('Checklist response status:', ckRes.status);
  const ckBody = await ckRes.json();
  console.log('Checklist response body:', JSON.stringify(ckBody).slice(0, 500));

  // 5. Cleanup: delete test vencimento
  if (vencRes.ok && vencBody.id) {
    await fetch(`${BASE}/vencimentos/${vencBody.id}`, { method: 'DELETE', headers });
    console.log('\nCleaned up test vencimento');
  }
  if (ckRes.ok && ckBody.id) {
    await fetch(`${BASE}/checklists/${ckBody.id}`, { method: 'DELETE', headers });
    console.log('Cleaned up test checklist');
  }
}

main().catch(e => console.error('Error:', e.message));
