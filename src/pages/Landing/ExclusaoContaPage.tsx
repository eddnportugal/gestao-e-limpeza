import React, { useState } from 'react';
import { ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExclusaoContaPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const texto = encodeURIComponent(
      `Olá, solicito a exclusão da minha conta no app Gestão e Limpeza.\n\nE-mail: ${email}\nMotivo: ${motivo || 'Não informado'}`
    );
    window.open(`https://wa.me/5511933284364?text=${texto}`, '_blank');
    setEnviado(true);
  };

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
          Exclusão de Conta e Dados
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>
          Gestão e Limpeza — Solicitação de exclusão conforme LGPD
        </p>

        <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', border: '1px solid #e5e7eb', lineHeight: 1.8, color: '#374151', fontSize: 15 }}>

          <h2 style={h2Style}>Como solicitar a exclusão da sua conta</h2>
          <p>
            Você pode solicitar a exclusão da sua conta e dados pessoais do aplicativo
            <strong> Gestão e Limpeza</strong> seguindo as etapas abaixo:
          </p>

          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '24px 28px', margin: '20px 0 28px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={stepStyle}>
                <span style={stepNumStyle}>1</span>
                <div>
                  <strong>Preencha o formulário abaixo</strong> com o e-mail cadastrado na sua conta
                  ou entre em contato diretamente pelo WhatsApp: <strong>(11) 93328-4364</strong>.
                </div>
              </div>
              <div style={stepStyle}>
                <span style={stepNumStyle}>2</span>
                <div>
                  <strong>Confirme sua identidade.</strong> Nossa equipe poderá solicitar uma verificação
                  para garantir que a solicitação é legítima.
                </div>
              </div>
              <div style={stepStyle}>
                <span style={stepNumStyle}>3</span>
                <div>
                  <strong>Aguarde o processamento.</strong> A exclusão será realizada em até
                  <strong> 30 dias úteis</strong> após a confirmação.
                </div>
              </div>
            </div>
          </div>

          <h2 style={h2Style}>Dados que serão excluídos</h2>
          <ul style={ulStyle}>
            <li><strong>Dados pessoais:</strong> nome, e-mail, telefone e foto de perfil</li>
            <li><strong>Registros de atividade:</strong> ordens de serviço, checklists, vistorias e inspeções criadas pelo usuário</li>
            <li><strong>Dados de localização:</strong> histórico de geolocalização e registros de ponto</li>
            <li><strong>Imagens e documentos:</strong> fotos enviadas em vistorias, inspeções e ordens de serviço</li>
            <li><strong>Preferências:</strong> configurações pessoais e notificações</li>
          </ul>

          <h2 style={h2Style}>Dados que podem ser mantidos</h2>
          <p>
            Alguns dados podem ser mantidos por obrigação legal ou interesse legítimo, conforme a LGPD:
          </p>
          <ul style={ulStyle}>
            <li><strong>Registros de auditoria:</strong> logs de ações críticas no sistema podem ser retidos por até <strong>5 anos</strong> para fins de compliance e segurança</li>
            <li><strong>Dados anonimizados:</strong> informações estatísticas agregadas que não permitem identificação pessoal podem ser mantidas indefinidamente</li>
            <li><strong>Dados vinculados a condomínios:</strong> ordens de serviço e vistorias associadas a um condomínio podem ser desvinculadas do seu perfil (anonimizadas) e mantidas como histórico operacional do condomínio</li>
          </ul>

          <h2 style={h2Style}>Formulário de Solicitação</h2>

          {enviado ? (
            <div style={{
              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12,
              padding: '32px', textAlign: 'center',
            }}>
              <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: 12 }} />
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#065f46', margin: '0 0 8px' }}>
                Solicitação enviada!
              </h3>
              <p style={{ color: '#047857', fontSize: 14 }}>
                Você será redirecionado ao WhatsApp para confirmar. Nossa equipe processará
                sua solicitação em até 30 dias úteis.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>E-mail cadastrado na conta *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Motivo da exclusão (opcional)</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Conte-nos por que deseja excluir sua conta..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <button
                type="submit"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, background: '#dc2626', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', width: 'fit-content', transition: 'background 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#b91c1c')}
                onMouseOut={e => (e.currentTarget.style.background = '#dc2626')}
              >
                <Trash2 size={18} /> Solicitar Exclusão da Conta
              </button>
            </form>
          )}

          <h2 style={h2Style}>Contato</h2>
          <p>
            Em caso de dúvidas sobre a exclusão dos seus dados:
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

const stepStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
};

const stepNumStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#f57c00',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 13,
  flexShrink: 0,
  marginTop: 2,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  fontSize: 15,
  color: '#1f2937',
  outline: 'none',
  boxSizing: 'border-box',
};

export default ExclusaoContaPage;
