import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacidadePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: '#f57c00',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} /> Voltar
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>Gestão e Limpeza</span>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
          Política de Privacidade
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>
          Última atualização: 12 de março de 2026
        </p>

        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', border: '1px solid #e5e7eb', lineHeight: 1.8, color: '#374151', fontSize: 15 }}>

          <h2 style={h2Style}>1. Introdução</h2>
          <p>
            O aplicativo <strong>Gestão e Limpeza</strong> ("nós", "nosso") é operado por Gestão e Limpeza Tecnologia.
            Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações
            pessoais quando você utiliza nosso aplicativo e serviços.
          </p>
          <p>
            Ao utilizar o aplicativo, você concorda com as práticas descritas nesta política.
          </p>

          <h2 style={h2Style}>2. Informações que Coletamos</h2>
          <p>Podemos coletar os seguintes tipos de informações:</p>
          <ul style={ulStyle}>
            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone e empresa/condomínio associado.</li>
            <li><strong>Dados de uso:</strong> registros de acesso, ações realizadas no app (ordens de serviço, checklists, vistorias, etc.).</li>
            <li><strong>Dados de localização:</strong> quando habilitado pelo usuário, para funcionalidades de geolocalização e ponto eletrônico.</li>
            <li><strong>Imagens e documentos:</strong> fotos enviadas em vistorias, inspeções ou ordens de serviço.</li>
            <li><strong>Dados do dispositivo:</strong> modelo, sistema operacional e identificadores para notificações push.</li>
          </ul>

          <h2 style={h2Style}>3. Como Usamos suas Informações</h2>
          <p>Utilizamos suas informações para:</p>
          <ul style={ulStyle}>
            <li>Fornecer e manter os serviços do aplicativo;</li>
            <li>Autenticar seu acesso e gerenciar permissões;</li>
            <li>Enviar notificações relevantes sobre suas atividades;</li>
            <li>Gerar relatórios e dashboards para administradores do condomínio;</li>
            <li>Melhorar a experiência do usuário e o desempenho do app;</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>

          <h2 style={h2Style}>4. Compartilhamento de Dados</h2>
          <p>
            Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing.
            Seus dados podem ser compartilhados apenas:
          </p>
          <ul style={ulStyle}>
            <li>Com administradores do condomínio ao qual você está vinculado, conforme as permissões do sistema;</li>
            <li>Com provedores de infraestrutura (hospedagem e banco de dados) que operam sob contratos de confidencialidade;</li>
            <li>Quando exigido por lei, ordem judicial ou autoridade competente.</li>
          </ul>

          <h2 style={h2Style}>5. Armazenamento e Segurança</h2>
          <p>
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS).
            Implementamos medidas técnicas e organizacionais para proteger suas informações contra acesso
            não autorizado, perda ou alteração, incluindo:
          </p>
          <ul style={ulStyle}>
            <li>Criptografia de dados em trânsito;</li>
            <li>Controle de acesso baseado em papéis (RBAC);</li>
            <li>Backups periódicos;</li>
            <li>Monitoramento de acessos e auditoria.</li>
          </ul>

          <h2 style={h2Style}>6. Seus Direitos (LGPD)</h2>
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
          </p>
          <ul style={ulStyle}>
            <li>Confirmação da existência de tratamento de dados;</li>
            <li>Acesso aos seus dados pessoais;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
            <li>Portabilidade dos dados;</li>
            <li>Eliminação dos dados tratados com consentimento;</li>
            <li>Revogação do consentimento a qualquer momento.</li>
          </ul>

          <h2 style={h2Style}>7. Retenção de Dados</h2>
          <p>
            Mantemos seus dados pelo tempo necessário para fornecer os serviços ou conforme exigido por lei.
            Após o encerramento da conta ou solicitação de exclusão, seus dados pessoais serão removidos
            em até 30 dias, exceto quando houver obrigação legal de retenção.
          </p>

          <h2 style={h2Style}>8. Cookies e Tecnologias Semelhantes</h2>
          <p>
            O aplicativo pode utilizar armazenamento local (localStorage) para manter suas preferências
            e sessão de login. Não utilizamos cookies de rastreamento de terceiros.
          </p>

          <h2 style={h2Style}>9. Menores de Idade</h2>
          <p>
            O aplicativo Gestão e Limpeza é destinado exclusivamente a profissionais e administradores
            de condomínios. Não coletamos intencionalmente dados de menores de 13 anos. Se tomarmos
            conhecimento de que coletamos dados de uma criança, tomaremos medidas para excluí-los imediatamente.
          </p>

          <h2 style={h2Style}>10. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças
            significativas por meio do aplicativo ou por e-mail. Recomendamos revisar esta página
            regularmente.
          </p>

          <h2 style={h2Style}>11. Contato</h2>
          <p>
            Se você tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados,
            entre em contato conosco:
          </p>
          <ul style={{ ...ulStyle, listStyle: 'none', paddingLeft: 0 }}>
            <li>📧 E-mail: <strong>contato@gestaoelimpeza.com.br</strong></li>
            <li>📱 WhatsApp: <strong>(11) 93328-4364</strong></li>
            <li>🌐 Site: <strong>gestaoelimpeza.com.br</strong></li>
          </ul>
        </div>
      </main>
    </div>
  );
};

const h2Style: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#1a1a2e',
  marginTop: 32,
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '1px solid #f0f0f0',
};

const ulStyle: React.CSSProperties = {
  paddingLeft: 24,
  marginTop: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

export default PrivacidadePage;
