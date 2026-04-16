import React, { useState, useMemo, useRef } from 'react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { compartilharConteudo, imprimirElemento, gerarPdfDeElemento } from '../../utils/exportUtils';
import {
  Search, ChevronDown, Lightbulb, LogIn, LayoutDashboard, Wrench, ClipboardCheck,
  Eye, CalendarCheck, BookOpen, Columns3, FileWarning, Package, MapPin, QrCode,
  ScanLine, Calendar, Flame, BarChart3, Building2, Contact, Users, Shield,
  Megaphone, FileText, CalendarClock, Bell, Shield as ShieldIcon, Settings, User,
  Camera, Smartphone, FileDown, MessageCircle
} from 'lucide-react';
import styles from './Tutorial.module.css';

interface TutorialSection {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  steps: string[];
  tip?: string;
}

const sections: TutorialSection[] = [
  {
    id: 'login',
    title: 'Primeiro Acesso (Login)',
    desc: 'Como entrar no sistema',
    icon: <LogIn size={20} />,
    steps: [
      'Abra o sistema no navegador',
      'Na tela de login, preencha seu <strong>e-mail</strong> e <strong>senha</strong>',
      'Clique em <strong>"Entrar"</strong>',
      'Você será direcionado ao <strong>Dashboard</strong>',
    ],
    tip: 'Esqueceu a senha? Clique em "Esqueci minha senha" na tela de login e siga as instruções por e-mail.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    desc: 'Tela inicial com resumo geral',
    icon: <LayoutDashboard size={20} />,
    steps: [
      'Após o login, você já está no Dashboard',
      'Veja os <strong>cards com números</strong>: total de ordens, checklists pendentes, tarefas do dia',
      'Clique nos <strong>cards</strong> para ir direto à página correspondente',
      'Use os <strong>botões de ação rápida</strong> para criar itens sem sair da tela',
    ],
  },
  {
    id: 'ordens',
    title: 'Ordens de Serviço',
    desc: 'Criar e acompanhar serviços',
    icon: <Wrench size={20} />,
    steps: [
      'No menu lateral, clique em <strong>"Ordens de Serviço"</strong>',
      'Clique no botão <strong>"+ Nova Ordem"</strong> (canto superior direito)',
      'Preencha: <strong>Título</strong>, <strong>Tipo</strong> (limpeza, emergência, preventiva), <strong>Prioridade</strong>, <strong>Local</strong>, <strong>Responsável</strong>',
      'Adicione <strong>fotos</strong> se necessário',
      'Clique em <strong>"Salvar"</strong>',
      'Acompanhe o status: <strong>Aberta → Em andamento → Concluída</strong>',
    ],
    tip: 'Use as abas no topo para filtrar por status. Clique em "PDF" para exportar.',
  },
  {
    id: 'checklists',
    title: 'Checklists de Limpeza',
    desc: 'Criar e executar checklists',
    icon: <ClipboardCheck size={20} />,
    steps: [
      'No menu, clique em <strong>"Checklists"</strong>',
      'Clique em <strong>"+ Novo Checklist"</strong>',
      'Preencha: <strong>Local</strong>, <strong>Tipo</strong> (Diário/Semanal/Mensal), <strong>Responsável</strong>',
      'Adicione os <strong>itens</strong> (ex: "Limpar espelhos", "Varrer piso")',
      'Clique em <strong>"Salvar"</strong>',
      'Para executar: abra o checklist e marque cada item como <strong>✓ Conforme</strong> ou <strong>✗ Não conforme</strong>',
      'Se houver problema, tire uma <strong>foto</strong> e adicione uma <strong>observação</strong>',
    ],
    tip: 'Problemas encontrados vão automaticamente para a tela de Reportes. Você também pode gerar um QR Code para o funcionário executar pelo celular.',
  },
  {
    id: 'vistorias',
    title: 'Vistorias',
    desc: 'Inspeções com fotos antes/depois',
    icon: <Eye size={20} />,
    steps: [
      'No menu, clique em <strong>"Vistorias"</strong>',
      'Clique em <strong>"+ Nova Vistoria"</strong>',
      'Preencha: <strong>Título</strong>, <strong>Tipo</strong>, <strong>Responsável</strong>',
      'Adicione os <strong>itens de inspeção</strong> com status e fotos',
      'Para cada item, selecione: <strong>Conforme / Atenção / Crítico</strong>',
      'Tire fotos <strong>antes</strong> e <strong>depois</strong> para comprovar o serviço',
      'Opcionalmente, grave um <strong>áudio</strong> de observação (máx. 30 seg)',
      'Clique em <strong>"Finalizar Vistoria"</strong>',
    ],
  },
  {
    id: 'tarefas',
    title: 'Tarefas Agendadas',
    desc: 'Tarefas únicas ou recorrentes',
    icon: <CalendarCheck size={20} />,
    steps: [
      'No menu, clique em <strong>"Tarefas Agendadas"</strong>',
      'Clique em <strong>"+ Nova Tarefa"</strong>',
      'Preencha: <strong>Título</strong>, <strong>Data/hora</strong>, <strong>Recorrência</strong> (única, diária, semanal, mensal), <strong>Responsável</strong>',
      'Clique em <strong>"Salvar"</strong>',
      'Para executar: clique em <strong>"Iniciar"</strong> — GPS e horário registrados automaticamente',
      'Tire <strong>fotos</strong> da execução e clique em <strong>"Concluir"</strong>',
    ],
    tip: 'Tarefas atrasadas ficam destacadas em vermelho. Use o filtro de data para ver as tarefas de hoje.',
  },
  {
    id: 'roteiros',
    title: 'Roteiro de Execução',
    desc: 'Guia visual passo a passo para funcionários',
    icon: <BookOpen size={20} />,
    steps: [
      'No menu, clique em <strong>"Roteiro de Execução"</strong>',
      'Clique em <strong>"+ Novo Roteiro"</strong>',
      'Dê um <strong>título</strong> e selecione a <strong>categoria</strong>',
      'Adicione os <strong>passos</strong> na ordem com descrição e imagem/vídeo de referência',
      'Para executar: siga cada passo, tire a <strong>foto de execução</strong> (antes/depois)',
      'Marque como concluído e passe para o próximo até <strong>"Finalizar Roteiro"</strong>',
    ],
  },
  {
    id: 'quadro',
    title: 'Quadro de Atividades (Kanban)',
    desc: 'Organizar atividades em colunas visuais',
    icon: <Columns3 size={20} />,
    steps: [
      'No menu, clique em <strong>"Quadro de Atividades"</strong>',
      'Veja as colunas: <strong>A Fazer → Em Andamento → Concluído</strong>',
      '<strong>Arraste</strong> um card de uma coluna para outra para mudar o status',
      'Clique em um card para ver os detalhes',
      'Clique em <strong>"+ Adicionar"</strong> na coluna desejada para criar',
    ],
  },
  {
    id: 'reportes',
    title: 'Reportes de Problemas',
    desc: 'Central de todos os problemas encontrados',
    icon: <FileWarning size={20} />,
    steps: [
      'No menu, clique em <strong>"Reportes"</strong>',
      'Veja a lista de todos os problemas reportados automaticamente',
      'Cada reporte mostra: <strong>origem</strong>, <strong>fotos</strong>, <strong>status</strong> e <strong>responsável</strong>',
      'Clique em um reporte para ver detalhes e tomar ação',
      'Use os filtros por <strong>condomínio</strong>, <strong>status</strong> ou <strong>data</strong>',
    ],
  },
  {
    id: 'materiais',
    title: 'Materiais e Estoque',
    desc: 'Controle de materiais e movimentações',
    icon: <Package size={20} />,
    steps: [
      'No menu, clique em <strong>"Controle de Estoque"</strong>',
      'Clique em <strong>"+ Novo Material"</strong>',
      'Preencha: <strong>Nome</strong>, <strong>Categoria</strong>, <strong>Quantidade</strong>, <strong>Quantidade mínima</strong>, <strong>Custo unitário</strong>',
      'Para registrar entrada/saída: abra o material → <strong>"Nova Movimentação"</strong>',
      'Selecione <strong>Entrada</strong> (compra) ou <strong>Saída</strong> (uso) e informe a quantidade',
    ],
    tip: 'Quando um material atinge a quantidade mínima, o sistema envia um aviso por e-mail automaticamente.',
  },
  {
    id: 'geolocalizacao',
    title: 'Geolocalização (GPS)',
    desc: 'Localização de funcionários em tempo real',
    icon: <MapPin size={20} />,
    steps: [
      'No menu, clique em <strong>"Geolocalização"</strong>',
      'O mapa mostra a localização de todos os funcionários',
      '🟢 <strong>Presente</strong> — no condomínio | 🟡 <strong>Em Trânsito</strong> | 🔴 <strong>Offline</strong>',
      'Para ver histórico: clique em <strong>"Histórico"</strong>, selecione funcionário e período',
    ],
  },
  {
    id: 'qrcode',
    title: 'QR Codes',
    desc: 'Criar formulários e gerar QR Codes',
    icon: <QrCode size={20} />,
    steps: [
      'No menu, clique em <strong>"Criar QR Code"</strong>',
      'Clique em <strong>"+ Novo Formulário"</strong> e dê um título',
      'Adicione <strong>blocos</strong>: texto, foto, checklist, avaliação, assinatura, etc. (20+ tipos)',
      'Clique em <strong>"Salvar"</strong> — o QR Code é gerado automaticamente',
      'Clique em <strong>"Imprimir QR Code"</strong> para gerar folha A4 (grade 4×4)',
      'Moradores ou funcionários <strong>escaneiam</strong> e preenchem sem login',
    ],
  },
  {
    id: 'rondas',
    title: 'Rondas por QR Code',
    desc: 'Pontos de ronda com registro GPS/selfie',
    icon: <ScanLine size={20} />,
    steps: [
      'No menu, clique em <strong>"QR Code Rondas"</strong>',
      'Clique em <strong>"+ Novo Ponto"</strong> e preencha nome e localização',
      'Imprima o QR Code e fixe no local',
      'O funcionário <strong>escaneia</strong> o QR Code no local',
      'O sistema registra: <strong>horário</strong>, <strong>GPS</strong> e <strong>selfie</strong> automaticamente',
    ],
  },
  {
    id: 'escalas',
    title: 'Escalas de Trabalho',
    desc: 'Horários semanais dos funcionários',
    icon: <Calendar size={20} />,
    steps: [
      'No menu, clique em <strong>"Escalas"</strong>',
      'Clique em <strong>"+ Nova Escala"</strong> e selecione o funcionário',
      'Para cada dia da semana, defina <strong>hora de início/fim</strong> e <strong>local</strong>',
      'Clique em <strong>"Salvar"</strong>',
      'O calendário semanal mostra todos os funcionários e suas tarefas vinculadas',
    ],
  },
  {
    id: 'mapacalor',
    title: 'Mapa de Calor',
    desc: 'Visualizar áreas com mais problemas',
    icon: <Flame size={20} />,
    steps: [
      'No menu, clique em <strong>"Reclamações"</strong>',
      'O mapa exibe áreas coloridas: 🔴 muitos problemas, 🟡 atenção, 🟢 poucos',
      'Use os filtros de <strong>período</strong> e <strong>condomínio</strong>',
      'Clique em uma área para ver os detalhes dos reportes',
    ],
    tip: 'Útil para identificar áreas que precisam de mais atenção ou funcionários.',
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    desc: 'Gráficos de desempenho e custos',
    icon: <BarChart3 size={20} />,
    steps: [
      'No menu, clique em <strong>"Relatórios"</strong>',
      'Escolha o tipo: <strong>Ordens de Serviço</strong>, <strong>Custos</strong>, <strong>Produtividade</strong> ou <strong>Satisfação</strong>',
      'Selecione o <strong>período</strong> e <strong>condomínio</strong>',
      'Clique em <strong>"Gerar"</strong>',
      'Exporte em <strong>PDF</strong> ou <strong>imprima</strong> direto',
    ],
    tip: 'Passe o mouse sobre os gráficos para ver valores detalhados.',
  },
  {
    id: 'condominios',
    title: 'Cadastro de Condomínios',
    desc: 'Adicionar e configurar condomínios',
    icon: <Building2 size={20} />,
    steps: [
      'No menu, clique em <strong>"Cadastro de Condomínios"</strong>',
      'Clique em <strong>"+ Novo Condomínio"</strong>',
      'Preencha: <strong>Nome</strong>, <strong>Endereço</strong>, <strong>Cidade</strong>, <strong>Blocos</strong>, <strong>Unidades</strong>, <strong>Síndico</strong>',
      'Opcionalmente, adicione um <strong>logo</strong> personalizado',
      'Clique em <strong>"Salvar"</strong>',
    ],
  },
  {
    id: 'moradores',
    title: 'Moradores',
    desc: 'Cadastrar moradores individualmente ou em lote',
    icon: <Contact size={20} />,
    steps: [
      'No menu, clique em <strong>"Cadastro de Moradores"</strong>',
      'Clique em <strong>"+ Novo Morador"</strong> e preencha: nome, bloco, apart., telefone, e-mail',
      'Para importar em lote: clique em <strong>"Importar Excel"</strong>',
      'Baixe o <strong>modelo de planilha</strong>, preencha e faça upload',
    ],
  },
  {
    id: 'usuarios',
    title: 'Usuários',
    desc: 'Criar, bloquear e gerenciar usuários',
    icon: <Users size={20} />,
    steps: [
      'No menu, clique em <strong>"Cadastro de Usuários"</strong>',
      'Clique em <strong>"+ Novo Usuário"</strong>',
      'Preencha: <strong>Nome</strong>, <strong>E-mail</strong>, <strong>Cargo</strong>, <strong>Nível de acesso</strong>, <strong>Condomínio</strong>',
      'Para bloquear: clique no <strong>ícone de cadeado</strong> e informe o motivo',
      'Para desbloquear: clique em <strong>"Desbloquear"</strong>',
    ],
  },
  {
    id: 'permissoes',
    title: 'Permissões',
    desc: 'Configurar acesso por nível',
    icon: <Shield size={20} />,
    steps: [
      'No menu, clique em <strong>"Cadastro de Permissões"</strong>',
      'Selecione o <strong>nível</strong>: Administrador, Supervisor ou Funcionário',
      'Marque ou desmarque: ✅ <strong>Ver</strong>, ✅ <strong>Criar</strong>, ✅ <strong>Editar</strong>, ✅ <strong>Excluir</strong>',
      'As alterações são salvas automaticamente',
    ],
    tip: 'O nível Master tem acesso total e não pode ser restrito.',
  },
  {
    id: 'comunicados',
    title: 'Comunicados e Avisos',
    desc: 'Enviar comunicados por e-mail',
    icon: <Megaphone size={20} />,
    steps: [
      'No menu, clique em <strong>"Comunicados / Avisos"</strong>',
      'Clique em <strong>"+ Novo Comunicado"</strong>',
      'Preencha: <strong>Título</strong>, <strong>Conteúdo</strong> (texto ou PDF), <strong>Destinatários</strong>',
      'Clique em <strong>"Enviar"</strong>',
      'Acompanhe o status de entrega na lista: ✅ Entregue, 📬 Enviado, ❌ Erro',
    ],
  },
  {
    id: 'documentos',
    title: 'Documentos Públicos',
    desc: 'Repositório de documentos compartilháveis',
    icon: <FileText size={20} />,
    steps: [
      'No menu, clique em <strong>"Docs Públicos (QR)"</strong>',
      'Clique em <strong>"+ Novo Documento"</strong>',
      'Preencha <strong>título</strong>, <strong>categoria</strong> e faça <strong>upload</strong> do arquivo',
      'Cada documento gera um <strong>link público</strong> para compartilhar',
      'O sistema registra quantas vezes foi visualizado',
    ],
  },
  {
    id: 'vencimentos',
    title: 'Vencimentos',
    desc: 'Alertas automáticos de documentos vencendo',
    icon: <CalendarClock size={20} />,
    steps: [
      'No menu, clique em <strong>"Agenda de Vencimentos"</strong>',
      'Clique em <strong>"+ Novo Vencimento"</strong>',
      'Preencha: <strong>Título</strong>, <strong>Data de vencimento</strong>, <strong>E-mails</strong> para notificação',
      'Configure os <strong>avisos</strong>: quantos dias antes avisar (ex: 30, 15, 7 dias)',
      'O sistema envia <strong>e-mails automáticos</strong> nas datas configuradas',
    ],
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    desc: 'Acompanhar alertas do sistema',
    icon: <Bell size={20} />,
    steps: [
      'Clique no <strong>ícone do sino 🔔</strong> no canto superior direito',
      'Notificações <strong>não lidas</strong> ficam destacadas',
      'Clique em uma notificação para ver detalhes',
      'Clique em <strong>"Marcar todas como lidas"</strong> para limpar',
    ],
  },
  {
    id: 'auditoria',
    title: 'Auditoria & Métricas',
    desc: 'Log de todas as ações do sistema',
    icon: <ShieldIcon size={20} />,
    steps: [
      'No menu, clique em <strong>"Auditoria & Métricas"</strong>',
      'Veja: <strong>Quem</strong> fez, <strong>O que</strong> fez, <strong>Quando</strong> e <strong>De onde</strong> (IP)',
      'Use os filtros para buscar ações específicas',
    ],
    tip: 'Útil para verificar quem fez o quê e quando, garantindo responsabilidade.',
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    desc: 'Tema, cores, logo e modo escuro',
    icon: <Settings size={20} />,
    steps: [
      'No menu, clique em <strong>"Configurações"</strong>',
      'Escolha o <strong>tema de cor</strong> entre 10 opções',
      'Alterne entre <strong>modo escuro</strong> e <strong>modo claro</strong>',
      'Faça upload do <strong>logo</strong> do condomínio',
      'Imprima todos os <strong>QR Codes</strong> do sistema em folha A4',
    ],
  },
  {
    id: 'perfil',
    title: 'Perfil do Usuário',
    desc: 'Editar dados pessoais e senha',
    icon: <User size={20} />,
    steps: [
      'Clique no seu <strong>nome/avatar</strong> no canto superior direito',
      'Clique em <strong>"Perfil"</strong>',
      'Altere: <strong>Nome</strong>, <strong>Foto</strong>, <strong>Telefone</strong>, <strong>Senha</strong>',
      'Clique em <strong>"Salvar"</strong>',
    ],
  },
];

const rolePermissions = [
  { func: 'Ver Dashboard', f: '✅', s: '✅', a: '✅', m: '✅' },
  { func: 'Executar tarefas', f: '✅', s: '✅', a: '✅', m: '✅' },
  { func: 'Criar checklists/vistorias', f: '❌', s: '✅', a: '✅', m: '✅' },
  { func: 'Gerenciar equipe', f: '❌', s: '✅', a: '✅', m: '✅' },
  { func: 'Criar ordens de serviço', f: '❌', s: '✅', a: '✅', m: '✅' },
  { func: 'Gerenciar condomínios', f: '❌', s: '❌', a: '✅', m: '✅' },
  { func: 'Gerenciar usuários', f: '❌', s: '❌', a: '✅', m: '✅' },
  { func: 'Configurar permissões', f: '❌', s: '❌', a: '❌', m: '✅' },
  { func: 'Ver auditoria', f: '❌', s: '❌', a: '❌', m: '✅' },
  { func: 'Acesso total', f: '❌', s: '❌', a: '❌', m: '✅' },
];

const generalTips = [
  { icon: <Camera size={18} />, text: 'Sempre tire fotos quando solicitado — servem como prova do serviço' },
  { icon: <MapPin size={18} />, text: 'Mantenha a localização ativada no celular para registro automático de GPS' },
  { icon: <Smartphone size={18} />, text: 'O sistema funciona no celular — acesse pelo navegador do seu smartphone' },
  { icon: <FileDown size={18} />, text: 'Todas as telas com dados permitem exportar para PDF' },
  { icon: <Search size={18} />, text: 'Use a barra de busca no topo das listas para encontrar itens rapidamente' },
  { icon: <MessageCircle size={18} />, text: 'Clique no ícone do WhatsApp na tela de login para contato direto' },
];

const TutorialPage: React.FC = () => {
  const [busca, setBusca] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!busca.trim()) return sections;
    const q = busca.toLowerCase();
    return sections.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.steps.some(st => st.toLowerCase().includes(q))
    );
  }, [busca]);

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className={styles.page} ref={printRef}>
      <PageHeader
        titulo="Tutorial do Sistema"
        subtitulo="Passo a passo de como utilizar cada função"
        onCompartilhar={() => compartilharConteudo('Tutorial do Sistema', 'Guia passo a passo do Gestão e Limpeza')}
        onImprimir={() => printRef.current && imprimirElemento(printRef.current)}
        onGerarPdf={() => printRef.current && gerarPdfDeElemento(printRef.current, 'tutorial-sistema')}
      />

      {/* Busca */}
      <div className={styles.searchBar}>
        <Search size={18} />
        <input
          className={styles.searchInput}
          placeholder="Buscar função... (ex: checklist, qr code, relatório)"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Seções do tutorial */}
      <div className={styles.grid}>
        {filtered.map(section => (
          <div key={section.id} className={styles.sectionCard}>
            <div className={styles.sectionHeader} role="button" tabIndex={0} onClick={() => toggle(section.id)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle(section.id)}>
              <div className={styles.sectionIcon}>{section.icon}</div>
              <div className={styles.sectionInfo}>
                <p className={styles.sectionTitle}>{section.title}</p>
                <p className={styles.sectionDesc}>{section.desc}</p>
              </div>
              <ChevronDown size={18} className={`${styles.chevron} ${openId === section.id ? styles.chevronOpen : ''}`} />
            </div>
            {openId === section.id && (
              <div className={styles.sectionBody}>
                <ol className={styles.stepList}>
                  {section.steps.map((step, i) => (
                    <li key={`${section.id}-step-${i}`} className={styles.step}>
                      <span className={styles.stepNumber}>{i + 1}</span>
                      <span className={styles.stepText} dangerouslySetInnerHTML={{ __html: step }} />
                    </li>
                  ))}
                </ol>
                {section.tip && (
                  <div className={styles.tip}>
                    <Lightbulb size={16} />
                    <span>{section.tip}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabela de Permissões por Nível */}
      <Card>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cor-texto)', margin: '0 0 4px' }}>
          Permissões por Nível de Acesso
        </h2>
        <p style={{ fontSize: 13, color: 'var(--cor-texto-secundario)', margin: 0 }}>
          O que cada nível pode fazer no sistema
        </p>
        <table className={styles.roleTable}>
          <thead>
            <tr>
              <th>Função</th>
              <th>Funcionário</th>
              <th>Supervisor</th>
              <th>Administrador</th>
              <th>Master</th>
            </tr>
          </thead>
          <tbody>
            {rolePermissions.map((row, i) => (
              <tr key={row.func}>
                <td>{row.func}</td>
                <td>{row.f}</td>
                <td>{row.s}</td>
                <td>{row.a}</td>
                <td>{row.m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Dicas Gerais */}
      <Card>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cor-texto)', margin: '0 0 4px' }}>
          💡 Dicas Gerais
        </h2>
        <div className={styles.tipsGrid}>
          {generalTips.map((tip, i) => (
            <div key={tip.text} className={styles.tipCard}>
              {tip.icon}
              <span>{tip.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TutorialPage;
