import type { UserRole } from '../types';

const DEMO_DATA_VERSION = 4;

// Clear all demo-seeded localStorage keys (including legacy wrong keys)
export function clearDemoData() {
  const keys = [
    'gestao-condominios', 'gestao-ordens-servico', 'gestao-os',
    'gestao-checklists', 'gestao-tarefas', 'gestao_tarefas_agendadas',
    'gestao_tarefas_execucoes', 'gestao-materiais', 'gestao-movimentacoes',
    'gestao-materiais-movimentacoes', 'gestao-escalas', 'gestao-vencimentos',
    'gestao-vencimentos-emails', 'gestao-moradores', 'gestao-comunicados',
    'gestao-quadro-atividades', 'gestao-quadro-permissoes', 'gestao-vistorias',
    'gestao-roteiros', 'gestao_roteiros_execucao', 'gestao_roteiros_exec_log',
    'gestao-reportes', 'gestao-whats-contatos', 'gestao-inspecoes',
    'gestao-qrcodes', 'gestao-controle-ponto',
  ];
  keys.forEach(k => localStorage.removeItem(k));
}

// Seed demo data into localStorage for demo mode
export function seedDemoData() {
  const currentVersion = Number(localStorage.getItem('gestao_demo_version') || '0');
  if (currentVersion < DEMO_DATA_VERSION) {
    clearDemoData();
    localStorage.setItem('gestao_demo_version', String(DEMO_DATA_VERSION));
  }
  const now = Date.now();
  const day = 86400000;
  const agora = new Date().toISOString();
  const dataHoje = agora.slice(0, 10);

  // Condominios
  if (!localStorage.getItem('gestao-condominios')) {
    localStorage.setItem('gestao-condominios', JSON.stringify([
      { id: 'c1', nome: 'Residencial Aurora', endereco: 'Rua das Flores, 500', cidade: 'São Paulo', blocos: 3, unidades: 120, sindico: 'Carlos Mendes', telefone: '(11) 99999-0001', email: 'aurora@cond.com' },
      { id: 'c2', nome: 'Edifício Central Park', endereco: 'Av Paulista, 1500', cidade: 'São Paulo', blocos: 1, unidades: 60, sindico: 'Ana Oliveira', telefone: '(11) 99999-0002', email: 'centralpark@cond.com' },
      { id: 'c3', nome: 'Condomínio Vila Verde', endereco: 'Rua dos Ipês, 200', cidade: 'São Paulo', blocos: 2, unidades: 80, sindico: 'Roberto Lima', telefone: '(11) 99999-0003', email: 'vilaverde@cond.com' },
    ]));
  }

  // Ordens de Serviço (key: gestao-ordens-servico)
  if (!localStorage.getItem('gestao-ordens-servico')) {
    localStorage.setItem('gestao-ordens-servico', JSON.stringify([
      { id: 'OS-001', protocolo: 'OS-260301-4821', condominioId: 'c1', titulo: 'Vazamento no Bloco A', descricao: 'Vazamento na tubulação do 3º andar, apartamento 302', tipo: 'emergencia', prioridade: 'alta', status: 'em_andamento', local: 'Bloco A - 3º Andar', responsavelId: 'demo-func', fotos: [], observacoes: 'Técnico a caminho', dataAbertura: now - 2 * day, criadoPor: 'demo-admin' },
      { id: 'OS-002', protocolo: 'OS-260302-1532', condominioId: 'c1', titulo: 'Limpeza da piscina', descricao: 'Limpeza completa e tratamento químico da piscina', tipo: 'limpeza', prioridade: 'media', status: 'aberta', local: 'Área de Lazer', responsavelId: 'demo-func', fotos: [], observacoes: '', dataAbertura: now - day, criadoPor: 'demo-sup' },
      { id: 'OS-003', protocolo: 'OS-260303-7294', condominioId: 'c1', titulo: 'Troca de lâmpadas - Garagem', descricao: 'Substituir 5 lâmpadas queimadas na garagem B1', tipo: 'manutencao', prioridade: 'baixa', status: 'concluida', local: 'Garagem B1', responsavelId: 'demo-func', fotos: [], observacoes: 'Concluído sem pendências', dataAbertura: now - 5 * day, dataConclusao: now - 3 * day, criadoPor: 'demo-admin' },
      { id: 'OS-004', protocolo: 'OS-260304-3847', condominioId: 'c2', titulo: 'Pintura do hall de entrada', descricao: 'Repintar paredes e teto do hall principal', tipo: 'manutencao', prioridade: 'media', status: 'aberta', local: 'Hall de Entrada', fotos: [], observacoes: '', dataAbertura: now - day, criadoPor: 'demo-admin' },
      { id: 'OS-005', protocolo: 'OS-260305-9156', condominioId: 'c1', titulo: 'Manutenção do elevador', descricao: 'Elevador social com ruído anormal - solicitar técnico', tipo: 'preventiva', prioridade: 'alta', status: 'em_andamento', local: 'Elevador Social', responsavelId: 'demo-sup', fotos: [], observacoes: 'Técnico agendado', dataAbertura: now - 3 * day, criadoPor: 'demo-admin' },
    ]));
  }

  // Checklists
  if (!localStorage.getItem('gestao-checklists')) {
    localStorage.setItem('gestao-checklists', JSON.stringify([
      { id: 'CK-001', condominioId: 'c1', local: 'Hall de Entrada - Bloco A', tipo: 'diaria', itens: [{ id: '1', descricao: 'Varrer piso', concluido: true }, { id: '2', descricao: 'Passar pano úmido', concluido: true }, { id: '3', descricao: 'Limpar vidros da porta', concluido: false }, { id: '4', descricao: 'Esvaziar lixeiras', concluido: true }], responsavelId: 'demo-func', data: dataHoje, horaInicio: now - 7200000, status: 'em_andamento', criadoPor: 'demo-sup', criadoEm: now - 5 * day },
      { id: 'CK-002', condominioId: 'c1', local: 'Garagem Subsolo', tipo: 'semanal', itens: [{ id: '5', descricao: 'Varrer toda a área', concluido: false }, { id: '6', descricao: 'Recolher lixo', concluido: false }, { id: '7', descricao: 'Verificar iluminação', concluido: false }], responsavelId: 'demo-func', data: dataHoje, status: 'pendente', criadoPor: 'demo-sup', criadoEm: now - 3 * day },
      { id: 'CK-003', condominioId: 'c1', local: 'Salão de Festas', tipo: 'semanal', itens: [{ id: '8', descricao: 'Limpar mesas e cadeiras', concluido: true }, { id: '9', descricao: 'Higienizar banheiros', concluido: true }, { id: '10', descricao: 'Aspirar tapetes', concluido: true }], responsavelId: 'demo-func', data: new Date(now - 1 * day).toISOString().slice(0, 10), status: 'concluido', criadoPor: 'demo-sup', criadoEm: now - 7 * day },
    ]));
  }

  // Tarefas Agendadas (key: gestao_tarefas_agendadas)
  if (!localStorage.getItem('gestao_tarefas_agendadas')) {
    localStorage.setItem('gestao_tarefas_agendadas', JSON.stringify([
      { id: 't1', titulo: 'Regar plantas da recepção', descricao: 'Regar todas as plantas do hall e recepção', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', condominio: 'Residencial Aurora', bloco: 'A', local: 'Hall de Entrada', recorrencia: 'diaria', diasSemana: [1, 2, 3, 4, 5], criadoPor: 'demo-sup', criadoEm: new Date(now - day).toISOString(), prioridade: 'baixa' },
      { id: 't2', titulo: 'Desinsetização Bloco B', descricao: 'Acompanhar equipe de desinsetização', funcionarioId: 'demo-sup', funcionarioNome: 'Supervisor Demo', condominio: 'Residencial Aurora', bloco: 'B', local: 'Todos os andares', recorrencia: 'unica', dataEspecifica: new Date(now + day).toISOString().slice(0, 10), diasSemana: [], criadoPor: 'demo-admin', criadoEm: new Date(now - 3 * day).toISOString(), prioridade: 'alta' },
      { id: 't3', titulo: 'Verificar extintores', descricao: 'Verificar validade de todos os extintores', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', condominio: 'Residencial Aurora', bloco: '', local: 'Todos os blocos', recorrencia: 'mensal', diaMes: 15, diasSemana: [], criadoPor: 'demo-admin', criadoEm: new Date(now - 10 * day).toISOString(), prioridade: 'media' },
      { id: 't4', titulo: 'Limpeza das escadas Bloco A', descricao: 'Varrer e passar pano em todas as escadas do Bloco A', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', condominio: 'Residencial Aurora', bloco: 'A', local: 'Escadas', recorrencia: 'semanal', diasSemana: [1, 3, 5], criadoPor: 'demo-sup', criadoEm: new Date(now - 5 * day).toISOString(), prioridade: 'media' },
      { id: 't5', titulo: 'Reposição de papel higiênico', descricao: 'Verificar e repor papel higiênico em todos os banheiros comuns', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', condominio: 'Residencial Aurora', bloco: '', local: 'Banheiros comuns', recorrencia: 'diaria', diasSemana: [1, 2, 3, 4, 5, 6], criadoPor: 'demo-sup', criadoEm: new Date(now - 2 * day).toISOString(), prioridade: 'alta' },
      { id: 't6', titulo: 'Inspeção do playground', descricao: 'Verificar brinquedos, piso e cercas do playground', funcionarioId: 'demo-sup', funcionarioNome: 'Supervisor Demo', condominio: 'Residencial Aurora', bloco: '', local: 'Playground', recorrencia: 'semanal', diasSemana: [2, 5], criadoPor: 'demo-admin', criadoEm: new Date(now - 7 * day).toISOString(), prioridade: 'media' },
    ]));
  }

  // Tarefas Execuções
  if (!localStorage.getItem('gestao_tarefas_execucoes')) {
    localStorage.setItem('gestao_tarefas_execucoes', JSON.stringify([
      { id: 'exec1', tarefaId: 't1', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', status: 'realizada', fotos: [], observacao: 'Plantas regadas conforme rotina', dataExecucao: new Date(now - day).toISOString().slice(0, 10), horaExecucao: '08:15' },
      { id: 'exec2', tarefaId: 't4', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', status: 'realizada', fotos: [], observacao: 'Escadas varridas e limpas', dataExecucao: new Date(now - day).toISOString().slice(0, 10), horaExecucao: '09:30' },
      { id: 'exec3', tarefaId: 't5', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', status: 'realizada', fotos: [], observacao: 'Papel higiênico reposto em todos os banheiros', dataExecucao: new Date(now - day).toISOString().slice(0, 10), horaExecucao: '10:00' },
      { id: 'exec4', tarefaId: 't1', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', status: 'realizada', fotos: [], observacao: '', dataExecucao: new Date(now - 2 * day).toISOString().slice(0, 10), horaExecucao: '07:45' },
      { id: 'exec5', tarefaId: 't5', funcionarioId: 'demo-func', funcionarioNome: 'Funcionário Demo', status: 'pendente', fotos: [], observacao: '', dataExecucao: dataHoje, horaExecucao: '' },
    ]));
  }

  // Materiais / Estoque
  if (!localStorage.getItem('gestao-materiais')) {
    localStorage.setItem('gestao-materiais', JSON.stringify([
      { id: 'm1', protocolo: 'MAT-20260301-1001', nome: 'Detergente Multiuso', categoria: 'Limpeza', unidade: 'Litros', qtd: 25, min: 10, custo: 18.90, emailNotificacao: 'estoque@condominio.com', condominio: 'Residencial Aurora' },
      { id: 'm2', protocolo: 'MAT-20260301-1002', nome: 'Saco de Lixo 100L', categoria: 'Descartáveis', unidade: 'Pacotes', qtd: 8, min: 5, custo: 12.50, emailNotificacao: 'estoque@condominio.com', condominio: 'Residencial Aurora' },
      { id: 'm3', protocolo: 'MAT-20260301-1003', nome: 'Desinfetante 5L', categoria: 'Limpeza', unidade: 'un', qtd: 15, min: 8, custo: 22.50, emailNotificacao: 'estoque@condominio.com', condominio: 'Residencial Aurora' },
      { id: 'm4', protocolo: 'MAT-20260301-1004', nome: 'Papel Higiênico', categoria: 'Higiene', unidade: 'Fardos', qtd: 3, min: 5, custo: 45.00, emailNotificacao: 'estoque@condominio.com', condominio: 'Residencial Aurora' },
      { id: 'm5', protocolo: 'MAT-20260301-1005', nome: 'Lâmpada LED 12W', categoria: 'Elétrica', unidade: 'Unidades', qtd: 20, min: 10, custo: 8.90, emailNotificacao: 'estoque@condominio.com', condominio: 'Residencial Aurora' },
    ]));
  }

  // Movimentações de materiais (key: gestao-materiais-movimentacoes)
  if (!localStorage.getItem('gestao-materiais-movimentacoes')) {
    localStorage.setItem('gestao-materiais-movimentacoes', JSON.stringify([
      { id: 'mv1', materialId: 'm1', tipo: 'entrada', quantidade: 30, observacao: 'Compra mensal', audioUrl: null, fotos: [], notaFiscalUrl: null, data: new Date(now - 10 * day).toISOString().slice(0, 10), funcionario: 'Admin Demo' },
      { id: 'mv2', materialId: 'm1', tipo: 'saida', quantidade: 5, observacao: 'Uso na limpeza do hall', audioUrl: null, fotos: [], notaFiscalUrl: null, data: new Date(now - 3 * day).toISOString().slice(0, 10), funcionario: 'Funcionário Demo' },
      { id: 'mv3', materialId: 'm4', tipo: 'saida', quantidade: 2, observacao: 'Reposição banheiros', audioUrl: null, fotos: [], notaFiscalUrl: null, data: new Date(now - 2 * day).toISOString().slice(0, 10), funcionario: 'Funcionário Demo' },
    ]));
  }

  // Escalas
  if (!localStorage.getItem('gestao-escalas')) {
    localStorage.setItem('gestao-escalas', JSON.stringify([
      { id: 'e1', func: 'Funcionário Demo', dia: 1, inicio: '07:00', fim: '16:00', local: 'Residencial Aurora - Hall e Áreas Comuns', funcao: 'Limpeza', observacoes: '' },
      { id: 'e2', func: 'Funcionário Demo', dia: 2, inicio: '07:00', fim: '16:00', local: 'Residencial Aurora - Garagem e Piscina', funcao: 'Limpeza', observacoes: '' },
      { id: 'e3', func: 'Funcionário Demo', dia: 3, inicio: '07:00', fim: '16:00', local: 'Residencial Aurora - Blocos A e B', funcao: 'Limpeza', observacoes: '' },
      { id: 'e4', func: 'Funcionário Demo', dia: 4, inicio: '07:00', fim: '16:00', local: 'Edifício Central Park', funcao: 'Limpeza', observacoes: '' },
      { id: 'e5', func: 'Funcionário Demo', dia: 5, inicio: '07:00', fim: '12:00', local: 'Condomínio Vila Verde', funcao: 'Limpeza', observacoes: '' },
    ]));
  }

  // Vencimentos
  if (!localStorage.getItem('gestao-vencimentos')) {
    localStorage.setItem('gestao-vencimentos', JSON.stringify([
      { id: 'v1', titulo: 'Contrato Elevadores', tipo: 'contrato', descricao: 'Manutenção preventiva mensal dos elevadores', condominio: 'Residencial Aurora', dataVencimento: new Date(now + 30 * day).toISOString().slice(0, 10), emails: ['sindico@aurora.com'], avisos: [{ id: 'av1', tipo: 'dias_antes', valor: 30 }, { id: 'av2', tipo: 'dias_antes', valor: 7 }], qtdNotificacoes: 0, criadoEm: new Date(now - 60 * day).toISOString() },
      { id: 'v2', titulo: 'Seguro Predial', tipo: 'contrato', descricao: 'Renovação anual do seguro predial', condominio: 'Residencial Aurora', dataVencimento: new Date(now + 15 * day).toISOString().slice(0, 10), emails: ['sindico@aurora.com'], avisos: [{ id: 'av3', tipo: 'dias_antes', valor: 15 }], qtdNotificacoes: 0, criadoEm: new Date(now - 90 * day).toISOString() },
      { id: 'v3', titulo: 'Dedetização Trimestral', tipo: 'servico', descricao: 'Serviço trimestral de dedetização', condominio: 'Residencial Aurora', dataVencimento: new Date(now + 5 * day).toISOString().slice(0, 10), emails: ['sindico@aurora.com'], avisos: [{ id: 'av4', tipo: 'dias_antes', valor: 7 }, { id: 'av5', tipo: 'dias_antes', valor: 3 }], qtdNotificacoes: 0, criadoEm: new Date(now - 80 * day).toISOString() },
    ]));
  }

  // Moradores
  if (!localStorage.getItem('gestao-moradores')) {
    localStorage.setItem('gestao-moradores', JSON.stringify([
      { id: 'mor1', nome: 'Maria Silva', condominio: 'Residencial Aurora', bloco: 'A', apartamento: '101', whatsapp: '(11) 99888-0001', email: 'maria@email.com', perfil: 'Proprietário', criadoEm: new Date(now - 60 * day).toISOString() },
      { id: 'mor2', nome: 'Pedro Santos', condominio: 'Residencial Aurora', bloco: 'A', apartamento: '202', whatsapp: '(11) 99888-0002', email: 'pedro@email.com', perfil: 'Inquilino', criadoEm: new Date(now - 45 * day).toISOString() },
      { id: 'mor3', nome: 'Ana Costa', condominio: 'Residencial Aurora', bloco: 'B', apartamento: '303', whatsapp: '(11) 99888-0003', email: 'ana@email.com', perfil: 'Proprietário', criadoEm: new Date(now - 30 * day).toISOString() },
      { id: 'mor4', nome: 'Carlos Mendes', condominio: 'Residencial Aurora', bloco: 'B', apartamento: '501', whatsapp: '(11) 99888-0004', email: 'carlos@email.com', perfil: 'Proprietário', criadoEm: new Date(now - 20 * day).toISOString() },
      { id: 'mor5', nome: 'Juliana Ferreira', condominio: 'Residencial Aurora', bloco: 'C', apartamento: '102', whatsapp: '(11) 99888-0005', email: 'juliana@email.com', perfil: 'Inquilino', criadoEm: new Date(now - 10 * day).toISOString() },
    ]));
  }

  // Comunicados
  if (!localStorage.getItem('gestao-comunicados')) {
    localStorage.setItem('gestao-comunicados', JSON.stringify([
      { id: 'com1', tipo: 'comunicado', titulo: 'Manutenção da Piscina', mensagem: 'Informamos que a piscina ficará fechada para manutenção nos dias 10 e 11 de março.', destinatarioTipo: 'condominio', condominio: 'Residencial Aurora', emailsEnviados: ['maria@email.com', 'pedro@email.com', 'ana@email.com'], tracking: [{ email: 'maria@email.com', nome: 'Maria Silva', status: 'enviado', atualizadoEm: new Date(now - 2 * day).toISOString() }, { email: 'pedro@email.com', nome: 'Pedro Santos', status: 'aberto', atualizadoEm: new Date(now - day).toISOString() }], criadoEm: new Date(now - 2 * day).toISOString(), enviadoPor: 'Admin Demo' },
      { id: 'com2', tipo: 'aviso', titulo: 'Assembleia Ordinária', mensagem: 'Convocamos todos os condôminos para a assembleia ordinária no dia 15/03 às 19h no salão de festas.', destinatarioTipo: 'condominio', condominio: 'Residencial Aurora', emailsEnviados: ['maria@email.com', 'pedro@email.com', 'ana@email.com', 'carlos@email.com', 'juliana@email.com'], tracking: [{ email: 'maria@email.com', nome: 'Maria Silva', status: 'aberto', atualizadoEm: new Date(now - 4 * day).toISOString() }], criadoEm: new Date(now - 5 * day).toISOString(), enviadoPor: 'Admin Demo' },
    ]));
  }

  // Quadro de Atividades (Kanban)
  if (!localStorage.getItem('gestao-quadro-atividades')) {
    localStorage.setItem('gestao-quadro-atividades', JSON.stringify([
      { id: 'qa1', titulo: 'Limpar escadas Bloco A', descricao: 'Limpeza completa das escadas do 1º ao 10º andar', status: 'a_fazer', prioridade: 'media', rotina: 'semanal', responsavel: 'Funcionário Demo', condominio: 'Residencial Aurora', criadoPor: 'Admin Demo', criadoEm: new Date(now - 2 * day).toISOString(), historico: [] },
      { id: 'qa2', titulo: 'Podar jardim frontal', descricao: 'Poda das árvores e arbustos da entrada', status: 'em_andamento', prioridade: 'baixa', rotina: 'mensal', responsavel: 'Funcionário Demo', condominio: 'Residencial Aurora', criadoPor: 'Admin Demo', criadoEm: new Date(now - 3 * day).toISOString(), historico: [] },
      { id: 'qa3', titulo: 'Trocar filtro da piscina', descricao: 'Substituir filtro de areia da piscina', status: 'em_revisao', prioridade: 'alta', rotina: 'anual', responsavel: 'Supervisor Demo', condominio: 'Residencial Aurora', criadoPor: 'Admin Demo', criadoEm: new Date(now - 5 * day).toISOString(), historico: [] },
      { id: 'qa4', titulo: 'Instalar câmeras Bloco C', descricao: 'Instalação de 4 câmeras de segurança', status: 'concluido', prioridade: 'alta', rotina: 'data_especifica', dataEspecifica: new Date(now - 2 * day).toISOString().slice(0, 10), responsavel: 'Supervisor Demo', condominio: 'Residencial Aurora', criadoPor: 'Admin Demo', criadoEm: new Date(now - 7 * day).toISOString(), historico: [] },
    ]));
  }

  // Vistorias
  if (!localStorage.getItem('gestao-vistorias')) {
    localStorage.setItem('gestao-vistorias', JSON.stringify([
      { id: 'VST-001', titulo: 'Vistoria Mensal - Bloco A', condominio: 'Residencial Aurora', tipo: 'rotina', data: dataHoje, responsavel: 'Supervisor Demo', status: 'em_andamento', criadoEm: now - 5 * day, itens: [
        { id: 'v1-1', local: 'Hall de Entrada', descricao: 'Verificar estado do piso e paredes', fotos: [], status: 'conforme', prioridade: 'media', observacao: 'Piso em bom estado' },
        { id: 'v1-2', local: 'Escadas', descricao: 'Verificar iluminação e corrimãos', fotos: [], status: 'conforme', prioridade: 'media', observacao: '' },
        { id: 'v1-3', local: '5º Andar', descricao: 'Limpeza geral do corredor', fotos: [], status: 'nao_conforme', prioridade: 'alta', observacao: 'Necessita limpeza mais profunda' },
      ]},
      { id: 'VST-002', titulo: 'Inspeção Garagem', condominio: 'Residencial Aurora', tipo: 'preventiva', data: new Date(now + 2 * day).toISOString().slice(0, 10), responsavel: 'Supervisor Demo', status: 'pendente', criadoEm: now - day, itens: [
        { id: 'v2-1', local: 'Garagem B1', descricao: 'Verificar sinalização', fotos: [], status: 'pendente', prioridade: 'media', observacao: '' },
        { id: 'v2-2', local: 'Garagem B1', descricao: 'Verificar iluminação', fotos: [], status: 'pendente', prioridade: 'media', observacao: '' },
        { id: 'v2-3', local: 'Garagem B1', descricao: 'Testar portão automático', fotos: [], status: 'pendente', prioridade: 'alta', observacao: '' },
      ]},
    ]));
  }

  // Roteiros de Execução (key: gestao_roteiros_execucao)
  if (!localStorage.getItem('gestao_roteiros_execucao')) {
    localStorage.setItem('gestao_roteiros_execucao', JSON.stringify([
      { id: 'rot1', titulo: 'Limpeza Completa do Hall', descricao: 'Passo a passo para limpeza do hall de entrada', categoria: 'Limpeza', capa: '', passos: [
        { id: 'p1', titulo: 'Varrer o piso', descricao: 'Remover toda sujeira com vassoura', imagens: [], videoUrl: '' },
        { id: 'p2', titulo: 'Passar pano úmido', descricao: 'Usar detergente diluído no pano', imagens: [], videoUrl: '' },
        { id: 'p3', titulo: 'Limpar vidros', descricao: 'Usar limpa-vidros nas portas e espelhos', imagens: [], videoUrl: '' },
        { id: 'p4', titulo: 'Organizar móveis', descricao: 'Alinhar sofás e cadeiras', imagens: [], videoUrl: '' },
      ], criadoPor: 'Supervisor Demo', criadoEm: agora, atualizadoEm: agora },
      { id: 'rot2', titulo: 'Manutenção Preventiva da Piscina', descricao: 'Verificação e tratamento semanal da piscina', categoria: 'Piscina', capa: '', passos: [
        { id: 'p5', titulo: 'Verificar nível de cloro', descricao: 'Usar kit de teste para medir nível de cloro e pH', imagens: [], videoUrl: '' },
        { id: 'p6', titulo: 'Limpar bordas', descricao: 'Escovar bordas e azulejos com produto adequado', imagens: [], videoUrl: '' },
        { id: 'p7', titulo: 'Aspirar fundo', descricao: 'Passar aspirador no fundo da piscina removendo detritos', imagens: [], videoUrl: '' },
      ], criadoPor: 'Supervisor Demo', criadoEm: new Date(now - 5 * day).toISOString(), atualizadoEm: new Date(now - 5 * day).toISOString() },
      { id: 'rot3', titulo: 'Limpeza da Garagem', descricao: 'Procedimento completo de limpeza da garagem', categoria: 'Limpeza', capa: '', passos: [
        { id: 'p8', titulo: 'Sinalizar área', descricao: 'Colocar cones e placas de "Piso Molhado"', imagens: [], videoUrl: '' },
        { id: 'p9', titulo: 'Varrer toda a área', descricao: 'Recolher sujeira grossa com vassoura', imagens: [], videoUrl: '' },
        { id: 'p10', titulo: 'Lavar com máquina', descricao: 'Usar máquina de pressão para lavar o piso', imagens: [], videoUrl: '' },
        { id: 'p11', titulo: 'Secar e retirar sinalização', descricao: 'Aguardar secar e retirar cones', imagens: [], videoUrl: '' },
      ], criadoPor: 'Admin Demo', criadoEm: new Date(now - 10 * day).toISOString(), atualizadoEm: new Date(now - 10 * day).toISOString() },
    ]));
  }

  // Roteiros Exec Log
  if (!localStorage.getItem('gestao_roteiros_exec_log')) {
    localStorage.setItem('gestao_roteiros_exec_log', JSON.stringify([
      { roteiroId: 'rot1', funcionario: 'Funcionário Demo', data: new Date(now - day).toISOString(), passosExec: [
        { passoId: 'p1', feito: true, fotoAntes: '', fotoDepois: '', descAntes: '', descDepois: 'Piso varrido completamente', imagens: [], problema: '', problemaEnviado: false, status: 'concluido', prioridade: 'media' },
        { passoId: 'p2', feito: true, fotoAntes: '', fotoDepois: '', descAntes: '', descDepois: 'Pano úmido aplicado com detergente', imagens: [], problema: '', problemaEnviado: false, status: 'concluido', prioridade: 'media' },
        { passoId: 'p3', feito: true, fotoAntes: '', fotoDepois: '', descAntes: '', descDepois: 'Vidros limpos e brilhando', imagens: [], problema: '', problemaEnviado: false, status: 'concluido', prioridade: 'media' },
        { passoId: 'p4', feito: false, fotoAntes: '', fotoDepois: '', descAntes: '', descDepois: '', imagens: [], problema: 'Sofá com mancha que precisa de limpeza profissional', problemaEnviado: true, status: 'problema', prioridade: 'alta' },
      ]},
    ]));
  }

  // Reportes
  if (!localStorage.getItem('gestao-reportes')) {
    localStorage.setItem('gestao-reportes', JSON.stringify([
      { protocolo: 'REP-001', itemDesc: 'Lâmpada queimada corredor 3º andar', checklistId: 'CK-001', descricao: 'Lâmpada do corredor do 3º andar Bloco A queimada', status: 'aberto', prioridade: 'baixa', imagens: [], data: new Date(now - 2 * day).toISOString() },
      { protocolo: 'REP-002', itemDesc: 'Infiltração no teto do salão', checklistId: '', descricao: 'Mancha de infiltração no teto do salão de festas', status: 'em_analise', prioridade: 'alta', imagens: [], data: new Date(now - 4 * day).toISOString() },
    ]));
  }

  // WhatsApp Contacts (shared across pages)
  if (!localStorage.getItem('gestao-whats-contatos')) {
    localStorage.setItem('gestao-whats-contatos', JSON.stringify([
      { id: 'wh1', nome: 'Supervisor Demo', telefone: '(11) 99999-1001' },
      { id: 'wh2', nome: 'Admin Demo', telefone: '(11) 99999-1002' },
    ]));
  }

  // Inspeções
  if (!localStorage.getItem('gestao-inspecoes')) {
    localStorage.setItem('gestao-inspecoes', JSON.stringify([
      { id: 'insp1', condominioId: 'c1', tipo: 'areas_comuns', local: 'Hall e Corredores - Bloco A', inspetorId: 'demo-sup', data: now - 3 * day, status: 'conforme', observacoes: 'Áreas em bom estado geral', fotos: [], itensVerificados: [
        { item: 'Piso limpo e seco', conforme: true },
        { item: 'Iluminação funcionando', conforme: true },
        { item: 'Lixeiras esvaziadas', conforme: true },
        { item: 'Vidros limpos', conforme: false, obs: 'Manchas no vidro da porta principal' },
      ], criadoEm: now - 3 * day },
      { id: 'insp2', condominioId: 'c1', tipo: 'elevadores', local: 'Elevadores Bloco A e B', inspetorId: 'demo-sup', data: now - day, status: 'nao_conforme', observacoes: 'Elevador B com ruído no motor', fotos: [], itensVerificados: [
        { item: 'Cabine limpa', conforme: true },
        { item: 'Botões funcionando', conforme: true },
        { item: 'Sem ruídos anormais', conforme: false, obs: 'Ruído no motor do elevador B' },
        { item: 'Espelhos intactos', conforme: true },
      ], criadoEm: now - day },
    ]));
  }

  // QR Code Formulários
  if (!localStorage.getItem('gestao-qrcodes')) {
    localStorage.setItem('gestao-qrcodes', JSON.stringify([
      { id: 'qr1', nome: 'Avaliação de Limpeza', descricao: 'Formulário para moradores avaliarem a limpeza das áreas comuns', logo: null, blocos: [
        { id: 'b1', tipo: 'titulo', label: 'Avaliação de Limpeza', obrigatorio: false },
        { id: 'b2', tipo: 'avaliacao_estrela', label: 'Como você avalia a limpeza?', obrigatorio: true, maxEstrelas: 5 },
        { id: 'b3', tipo: 'checklist', label: 'Áreas verificadas', obrigatorio: false, opcoes: ['Hall', 'Escadas', 'Elevador', 'Garagem', 'Piscina'] },
        { id: 'b4', tipo: 'texto', label: 'Observações adicionais', obrigatorio: false },
      ], dispensarIdentificacao: false, blocosCadastrados: [], criadoPor: 'demo-admin', criadoEm: now - 10 * day, respostas: 5, ativo: true },
      { id: 'qr2', nome: 'Reporte de Ocorrência', descricao: 'Formulário para reportar problemas nas áreas comuns', logo: null, blocos: [
        { id: 'b5', tipo: 'titulo', label: 'Reporte de Ocorrência', obrigatorio: false },
        { id: 'b6', tipo: 'descricao', label: 'Descreva o problema encontrado', obrigatorio: true },
        { id: 'b7', tipo: 'galeria', label: 'Fotos do problema', obrigatorio: false, maxFotos: 3 },
        { id: 'b8', tipo: 'prioridade', label: 'Nível de urgência', obrigatorio: true },
      ], dispensarIdentificacao: false, blocosCadastrados: [], criadoPor: 'demo-admin', criadoEm: now - 5 * day, respostas: 2, ativo: true },
    ]));
  }

  // Controle de Ponto
  if (!localStorage.getItem('gestao-controle-ponto')) {
    const ontem7h = new Date(now - day); ontem7h.setHours(7, 2, 0, 0);
    const ontem16h = new Date(now - day); ontem16h.setHours(16, 0, 0, 0);
    const ante7h = new Date(now - 2 * day); ante7h.setHours(7, 10, 0, 0);
    const ante16h = new Date(now - 2 * day); ante16h.setHours(15, 55, 0, 0);
    localStorage.setItem('gestao-controle-ponto', JSON.stringify([
      { funcionario: { nome: 'Funcionário Demo', email: 'demo-func@gestao.com', cargo: 'Auxiliar de Limpeza', perfil: 'funcionario' }, tipo: 'entrada', dataHora: ontem7h.toISOString(), geolocalizacao: { latitude: -23.5505, longitude: -46.6333 }, endereco: 'Rua das Flores, 500 - São Paulo' },
      { funcionario: { nome: 'Funcionário Demo', email: 'demo-func@gestao.com', cargo: 'Auxiliar de Limpeza', perfil: 'funcionario' }, tipo: 'saida', dataHora: ontem16h.toISOString(), geolocalizacao: { latitude: -23.5505, longitude: -46.6333 }, endereco: 'Rua das Flores, 500 - São Paulo', permanencia: '08h58min' },
      { funcionario: { nome: 'Funcionário Demo', email: 'demo-func@gestao.com', cargo: 'Auxiliar de Limpeza', perfil: 'funcionario' }, tipo: 'entrada', dataHora: ante7h.toISOString(), geolocalizacao: { latitude: -23.5505, longitude: -46.6333 }, endereco: 'Rua das Flores, 500 - São Paulo' },
      { funcionario: { nome: 'Funcionário Demo', email: 'demo-func@gestao.com', cargo: 'Auxiliar de Limpeza', perfil: 'funcionario' }, tipo: 'saida', dataHora: ante16h.toISOString(), geolocalizacao: { latitude: -23.5505, longitude: -46.6333 }, endereco: 'Rua das Flores, 500 - São Paulo', permanencia: '08h45min' },
    ]));
  }
}

// Demo user profiles
export const DEMO_USERS: Record<string, { id: string; email: string; nome: string; role: UserRole; condominioId: string }> = {
  administrador: { id: 'demo-admin', email: 'demo-admin@gestao.com', nome: 'Admin Demo', role: 'administrador', condominioId: 'c1' },
  supervisor: { id: 'demo-sup', email: 'demo-sup@gestao.com', nome: 'Supervisor Demo', role: 'supervisor', condominioId: 'c1' },
  funcionario: { id: 'demo-func', email: 'demo-func@gestao.com', nome: 'Funcionário Demo', role: 'funcionario', condominioId: 'c1' },
};
