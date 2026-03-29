import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, FileText, Star, CheckSquare, BarChart3, Image,
  MessageCircle, AlertTriangle, Bell, Mail, Phone, Siren,
  CalendarPlus, ClipboardCheck, Fingerprint, Hourglass, PenTool,
  Camera, Wrench, ChevronDown, ChevronUp, User, Clock, QrCode, Filter, FileDown,
} from 'lucide-react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { compartilharConteudo, imprimirElemento, gerarPdfDeElemento, gerarPdfResposta } from '../../utils/exportUtils';
import { qrcodes as qrcodesApi } from '../../services/api';

/* ═══ Tipos ═══ */
interface RespostaFormulario {
  id: string;
  qrConteudo: string;
  funcionarioNome: string;
  funcionarioEmail: string | null;
  funcionarioCargo: string | null;
  dataHora: string;
  identificacao: any;
  respostasFormulario: Record<string, any>;
  qrNome: string;
  qrDescricao: string;
  qrBlocos: any[];
}

const BLOCOS_INFO: Record<string, { icone: React.ReactNode; cor: string; label: string }> = {
  titulo: { icone: <FileText size={16} />, cor: '#1565c0', label: 'Título' },
  subtitulo: { icone: <FileText size={16} />, cor: '#1976d2', label: 'Sub-título' },
  texto: { icone: <FileText size={16} />, cor: '#2196f3', label: 'Texto' },
  galeria: { icone: <Image size={16} />, cor: '#7b1fa2', label: 'Galeria' },
  descricao: { icone: <FileText size={16} />, cor: '#00838f', label: 'Descrição' },
  checklist: { icone: <CheckSquare size={16} />, cor: '#2e7d32', label: 'Checklist' },
  status: { icone: <BarChart3 size={16} />, cor: '#f57c00', label: 'Status' },
  prioridade: { icone: <AlertTriangle size={16} />, cor: '#d32f2f', label: 'Prioridade' },
  avaliacao_estrela: { icone: <Star size={16} />, cor: '#fbc02d', label: 'Avaliação' },
  avaliacao_escala: { icone: <BarChart3 size={16} />, cor: '#e65100', label: 'Escala' },
  pergunta: { icone: <MessageCircle size={16} />, cor: '#5c6bc0', label: 'Perguntas' },
  aviso: { icone: <AlertTriangle size={16} />, cor: '#ff6f00', label: 'Aviso' },
  comunicado: { icone: <Bell size={16} />, cor: '#00695c', label: 'Comunicado' },
  feedback: { icone: <Mail size={16} />, cor: '#0277bd', label: 'Feedback' },
  urgencia: { icone: <Siren size={16} />, cor: '#b71c1c', label: 'Urgência' },
  agendar_servico: { icone: <CalendarPlus size={16} />, cor: '#4a148c', label: 'Agendar Serviço' },
  pesquisa_satisfacao: { icone: <ClipboardCheck size={16} />, cor: '#00695c', label: 'Pesq. Satisfação' },
  controle_ponto: { icone: <Fingerprint size={16} />, cor: '#1565c0', label: 'Ponto' },
  sla_tempo: { icone: <Hourglass size={16} />, cor: '#e65100', label: 'SLA' },
  assinatura_digital: { icone: <PenTool size={16} />, cor: '#4527a0', label: 'Assinatura' },
  ocorrencia: { icone: <Camera size={16} />, cor: '#c62828', label: 'Ocorrência' },
  manutencao: { icone: <Wrench size={16} />, cor: '#e65100', label: 'Manutenção' },
};

/* ═══ Helpers para renderValor ═══ */
function getEscalaCor(valor: number): string {
  if (valor >= 7) return '#2e7d32';
  if (valor >= 4) return '#f57c00';
  return '#d32f2f';
}

function renderEstrela(valor: any): React.ReactNode {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={16} fill={n <= valor ? '#fbc02d' : 'none'} color={n <= valor ? '#fbc02d' : '#ccc'} />
      ))}
      <span style={{ marginLeft: 6, fontWeight: 600, fontSize: 13 }}>{valor}/5</span>
    </span>
  );
}

function renderChecklist(bloco: any, valor: any[]): React.ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {bloco.opcoes?.map((op: string, idx: number) => (
        <span key={`${op}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <CheckSquare size={14} color={valor[idx] ? '#2e7d32' : '#bbb'} fill={valor[idx] ? '#2e7d3220' : 'none'} />
          <span style={{ textDecoration: valor[idx] ? 'none' : undefined, color: valor[idx] ? 'var(--cor-texto)' : '#999' }}>{op}</span>
        </span>
      ))}
    </div>
  );
}

function renderPergunta(bloco: any, valor: any[]): React.ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bloco.opcoes?.map((pergunta: string, idx: number) => (
        <div key={`${pergunta}-${idx}`} style={{ fontSize: 13 }}>
          <strong style={{ color: 'var(--cor-texto-secundario)' }}>{pergunta || `Pergunta ${idx + 1}`}:</strong>
          <p style={{ margin: '2px 0 0', color: 'var(--cor-texto)' }}>{valor[idx] || '—'}</p>
        </div>
      ))}
    </div>
  );
}

function renderSatisfacao(bloco: any, valor: any): React.ReactNode {
  const notas = Array.isArray(valor) ? valor : valor?.notas;
  const comentario = typeof valor === 'object' && !Array.isArray(valor) ? valor?.comentario : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {bloco.opcoes?.map((criterio: string, idx: number) => (
        <div key={`${criterio}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ minWidth: 140, color: 'var(--cor-texto-secundario)' }}>{criterio}:</span>
          <span style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={14} fill={n <= (notas?.[idx] || 0) ? '#00897b' : 'none'} color={n <= (notas?.[idx] || 0) ? '#00897b' : '#ccc'} />
            ))}
          </span>
          <span style={{ fontWeight: 600, fontSize: 12 }}>{notas?.[idx] || 0}/5</span>
        </div>
      ))}
      {comentario && <p style={{ fontSize: 13, marginTop: 4, color: 'var(--cor-texto)', fontStyle: 'italic' }}>"{comentario}"</p>}
    </div>
  );
}

function parseBlocos(raw: any): any[] {
  try {
    const b = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(b) ? b : [];
  } catch { return []; }
}

const TIPO_ESTILO: Record<string, { bg: string; cor: string; label: string }> = {
  morador: { bg: '#e8f5e9', cor: '#2e7d32', label: 'Morador' },
  funcionario: { bg: '#e3f2fd', cor: '#1565c0', label: 'Funcionário' },
  prestador: { bg: '#f3e5f5', cor: '#7b1fa2', label: 'Prestador' },
};

function renderObjeto(tipo: string, valor: any): React.ReactNode | null {
  if (tipo === 'urgencia' && typeof valor === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        <span><strong>Tipo:</strong> {valor.tipo || '—'}</span>
        {valor.descricao && <span><strong>Descrição:</strong> {valor.descricao}</span>}
      </div>
    );
  }

  if (tipo === 'agendar_servico' && typeof valor === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        {valor.tipoServico && <span><strong>Serviço:</strong> {valor.tipoServico}</span>}
        {valor.data && <span><strong>Data:</strong> {new Date(valor.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
        {valor.horario && <span><strong>Horário:</strong> {valor.horario}</span>}
        {valor.observacoes && <span><strong>Obs:</strong> {valor.observacoes}</span>}
      </div>
    );
  }

  if (tipo === 'feedback' && typeof valor === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        {valor.whatsapp && <span><Phone size={12} /> {valor.whatsapp}</span>}
        {valor.email && <span><Mail size={12} /> {valor.email}</span>}
      </div>
    );
  }

  if ((tipo === 'ocorrencia' || tipo === 'manutencao') && typeof valor === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        {valor.categoria && <span><strong>Categoria:</strong> {valor.categoria}</span>}
        {valor.tipo && <span><strong>Tipo:</strong> {valor.tipo}</span>}
        {valor.prioridade && <span><strong>Prioridade:</strong> {valor.prioridade}</span>}
        {valor.local && <span><strong>Local:</strong> {valor.local}</span>}
        {valor.descricao && <span><strong>Descrição:</strong> {valor.descricao}</span>}
        {valor.fotos?.length > 0 && <span><strong>Fotos:</strong> {valor.fotos.length} anexada(s)</span>}
      </div>
    );
  }

  return null;
}

/* ═══ Render de valor da resposta ═══ */
function renderValor(bloco: any, valor: any): React.ReactNode {
  if (valor === undefined || valor === null || valor === '') return <span style={{ color: '#999', fontStyle: 'italic' }}>Não respondido</span>;

  const tipo = bloco?.tipo;

  if (tipo === 'avaliacao_estrela') return renderEstrela(valor);
  if (tipo === 'avaliacao_escala') return <span style={{ fontWeight: 600, color: getEscalaCor(valor) }}>{valor}/10</span>;
  if (tipo === 'checklist' && Array.isArray(valor)) return renderChecklist(bloco, valor);
  if (tipo === 'pergunta' && Array.isArray(valor)) return renderPergunta(bloco, valor);
  if (tipo === 'pesquisa_satisfacao') return renderSatisfacao(bloco, valor);
  if (tipo === 'galeria' && Array.isArray(valor)) return <span style={{ fontSize: 13 }}>{valor.length} foto(s) anexada(s)</span>;

  const objRender = renderObjeto(tipo, valor);
  if (objRender) return objRender;

  if (typeof valor === 'string') return <span style={{ fontSize: 13 }}>{valor}</span>;
  if (typeof valor === 'number') return <span style={{ fontSize: 13, fontWeight: 600 }}>{valor}</span>;

  return <span style={{ fontSize: 13 }}>{JSON.stringify(valor)}</span>;
}

/* ═══ Componente Principal ═══ */
const RespostasQRCodePage: React.FC = () => {
  const [respostas, setRespostas] = useState<RespostaFormulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroQR, setFiltroQR] = useState<string>('');
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    qrcodesApi.listRespostas()
      .then((data: any[]) => {
        setRespostas(data.map((r: any) => ({
          id: r.id,
          qrConteudo: r.qrConteudo,
          funcionarioNome: r.funcionarioNome || 'Anônimo',
          funcionarioEmail: r.funcionarioEmail,
          funcionarioCargo: r.funcionarioCargo,
          dataHora: r.dataHora,
          identificacao: typeof r.identificacao === 'string' ? JSON.parse(r.identificacao) : r.identificacao,
          respostasFormulario: typeof r.respostasFormulario === 'string' ? JSON.parse(r.respostasFormulario) : (r.respostasFormulario || {}),
          qrNome: r.qrNome || 'QR Code removido',
          qrDescricao: r.qrDescricao || '',
          qrBlocos: parseBlocos(r.qrBlocos),
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const qrCodesUnicos = useMemo(() => {
    const map = new Map<string, string>();
    respostas.forEach(r => { if (!map.has(r.qrConteudo)) map.set(r.qrConteudo, r.qrNome); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [respostas]);

  const filtrados = useMemo(() => {
    let lista = respostas;
    if (filtroQR) lista = lista.filter(r => r.qrConteudo === filtroQR);
    if (busca.trim()) {
      const termos = busca.toLowerCase().split(/\s+/);
      lista = lista.filter(r => {
        const texto = `${r.funcionarioNome} ${r.funcionarioEmail || ''} ${r.qrNome} ${r.funcionarioCargo || ''}`.toLowerCase();
        return termos.every(t => texto.includes(t));
      });
    }
    return lista;
  }, [respostas, filtroQR, busca]);

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>;

  return (
    <div id="respostas-qrcode-content">
      <PageHeader
        titulo="Respostas dos QR Codes"
        subtitulo={`${filtrados.length} resposta${filtrados.length === 1 ? '' : 's'} recebida${filtrados.length === 1 ? '' : 's'}`}
        onCompartilhar={() => compartilharConteudo('Respostas QR Codes', 'Respostas dos formulários QR Code')}
        onImprimir={() => imprimirElemento('respostas-qrcode-content')}
        onGerarPdf={() => gerarPdfDeElemento('respostas-qrcode-content', 'respostas-qrcodes')}
      />

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{
          flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)',
          borderRadius: 'var(--raio-borda-sm)', padding: '8px 12px',
        }}>
          <Search size={18} style={{ color: 'var(--cor-texto-secundario)', flexShrink: 0 }} />
          <input
            style={{
              border: 'none', background: 'transparent', outline: 'none', flex: 1,
              fontSize: 13, color: 'var(--cor-texto)', fontFamily: 'inherit',
            }}
            placeholder="Buscar por nome, email, formulário..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {busca && (
            <button onClick={() => setBusca('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--cor-texto-secundario)' }}>
              <X size={16} />
            </button>
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)',
          borderRadius: 'var(--raio-borda-sm)', padding: '8px 12px',
        }}>
          <Filter size={16} style={{ color: 'var(--cor-texto-secundario)' }} />
          <select
            value={filtroQR}
            onChange={e => setFiltroQR(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, color: 'var(--cor-texto)', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">Todos os formulários</option>
            {qrCodesUnicos.map(([id, nome]) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: 'var(--cor-texto-secundario)',
        }}>
          <QrCode size={48} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 15 }}>{respostas.length === 0 ? 'Nenhuma resposta recebida ainda' : 'Nenhuma resposta encontrada com esses filtros'}</p>
          {respostas.length === 0 && <p style={{ fontSize: 13, marginTop: 6 }}>As respostas aparecerão aqui quando moradores ou funcionários responderem seus formulários QR Code.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(resp => {
            const aberto = expandido === resp.id;
            const ident = resp.identificacao || {};
            const respostasObj = resp.respostasFormulario || {};
            const temRespostas = Object.keys(respostasObj).length > 0;

            return (
              <Card key={resp.id} padding="md" hover>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <button
                    type="button"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14, background: 'none', border: 'none', padding: 0, flex: 1, textAlign: 'left', font: 'inherit', color: 'inherit', minWidth: 0 }}
                    onClick={() => setExpandido(aberto ? null : resp.id)}
                  >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--cor-primaria)' + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={20} style={{ color: 'var(--cor-primaria)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 14, color: 'var(--cor-texto)' }}>{resp.funcionarioNome}</strong>
                      {ident.tipo && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                          background: TIPO_ESTILO[ident.tipo]?.bg || '#f3e5f5',
                          color: TIPO_ESTILO[ident.tipo]?.cor || '#7b1fa2',
                        }}>
                          {TIPO_ESTILO[ident.tipo]?.label || ident.tipo}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--cor-texto-secundario)', marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <QrCode size={12} /> {resp.qrNome}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {formatarData(resp.dataHora)}
                      </span>
                      {resp.funcionarioEmail && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={12} /> {resp.funcionarioEmail}
                        </span>
                      )}
                      {ident.bloco && <span>Bloco: {ident.bloco}</span>}
                      {ident.unidade && <span>Apt: {ident.unidade}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, color: 'var(--cor-texto-secundario)' }}>
                    {aberto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  </button>
                  <button
                    title="Gerar PDF"
                    onClick={e => {
                      e.stopPropagation();
                      gerarPdfResposta({ id: resp.id, funcionarioNome: resp.funcionarioNome, funcionarioEmail: resp.funcionarioEmail, funcionarioCargo: resp.funcionarioCargo, dataHora: resp.dataHora, identificacao: resp.identificacao, respostasFormulario: resp.respostasFormulario, qrNome: resp.qrNome, qrBlocos: resp.qrBlocos } as any);
                    }}
                    style={{
                      background: 'none', border: '1px solid var(--cor-borda)', borderRadius: 6,
                      cursor: 'pointer', padding: '6px 8px', color: 'var(--cor-primaria)',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                      flexShrink: 0, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--cor-primaria)'; (e.target as HTMLElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; (e.target as HTMLElement).style.color = 'var(--cor-primaria)'; }}
                  >
                    <FileDown size={14} /> PDF
                  </button>
                </div>

                {/* Conteúdo expandido */}
                {aberto && (
                  <div style={{
                    marginTop: 16, paddingTop: 16,
                    borderTop: '1px solid var(--cor-borda)',
                  }}>
                    {temRespostas ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {resp.qrBlocos.map((bloco: any) => {
                          const info = BLOCOS_INFO[bloco.tipo];
                          const valor = respostasObj[bloco.id];

                          return (
                            <div key={bloco.id} style={{
                              padding: '12px 16px',
                              background: 'var(--cor-fundo)',
                              borderRadius: 'var(--raio-borda-sm)',
                              border: '1px solid var(--cor-borda)',
                            }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                              }}>
                                <span style={{ color: info?.cor || '#666' }}>{info?.icone || <FileText size={16} />}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  {bloco.label}
                                </span>
                              </div>
                              <div>{renderValor(bloco, valor)}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>Esta resposta não contém dados de formulário (enviada antes da atualização).</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RespostasQRCodePage;
