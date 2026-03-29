import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Star, CheckSquare, Home, UserCheck, Building2, ChevronRight,
  Upload, Phone, Mail, AlertTriangle, Siren, CalendarPlus,
  ClipboardCheck, Camera, Wrench, Flag, X, FileText, Image,
  BarChart3, Loader2, FileDown,
} from 'lucide-react';
import styles from './QRCode.module.css';

/* ═══ Tipos ═══ */
type BlocoTipo =
  | 'titulo' | 'subtitulo' | 'texto' | 'galeria' | 'descricao'
  | 'checklist' | 'status' | 'prioridade' | 'avaliacao_estrela'
  | 'avaliacao_escala' | 'pergunta' | 'aviso' | 'comunicado' | 'feedback'
  | 'urgencia' | 'agendar_servico' | 'pesquisa_satisfacao' | 'controle_ponto'
  | 'sla_tempo' | 'assinatura_digital' | 'ocorrencia' | 'manutencao' | 'download_documento';

interface BlocoConfig {
  id: string;
  tipo: BlocoTipo;
  label: string;
  obrigatorio: boolean;
  opcoes?: string[];
  maxFotos?: number;
  maxEstrelas?: number;
  escalaMax?: number;
  documentoUrl?: string;
  documentoNome?: string;
}

interface QRCodeFormulario {
  id: string;
  nome: string;
  descricao: string;
  logo: string | null;
  blocos: BlocoConfig[];
  dispensarIdentificacao: boolean;
  blocosCadastrados: string[];
  ativo: boolean;
}

interface Identificacao {
  tipo: 'morador' | 'funcionario' | 'prestador' | '';
  nome: string;
  bloco: string;
  unidade: string;
  anonimo: boolean;
}

const BLOCOS_INFO: Record<string, { icone: React.ReactNode; cor: string }> = {
  titulo: { icone: <FileText size={18} />, cor: '#1565c0' },
  subtitulo: { icone: <FileText size={18} />, cor: '#1976d2' },
  texto: { icone: <FileText size={18} />, cor: '#2196f3' },
  galeria: { icone: <Image size={18} />, cor: '#7b1fa2' },
  descricao: { icone: <FileText size={18} />, cor: '#00838f' },
  checklist: { icone: <CheckSquare size={18} />, cor: '#2e7d32' },
  status: { icone: <BarChart3 size={18} />, cor: '#f57c00' },
  prioridade: { icone: <AlertTriangle size={18} />, cor: '#d32f2f' },
  avaliacao_estrela: { icone: <Star size={18} />, cor: '#fbc02d' },
  avaliacao_escala: { icone: <BarChart3 size={18} />, cor: '#00897b' },
  pergunta: { icone: <FileText size={18} />, cor: '#5e35b1' },
  aviso: { icone: <AlertTriangle size={18} />, cor: '#ef6c00' },
  comunicado: { icone: <FileText size={18} />, cor: '#0277bd' },
  feedback: { icone: <Phone size={18} />, cor: '#00695c' },
  urgencia: { icone: <Siren size={18} />, cor: '#b71c1c' },
  agendar_servico: { icone: <CalendarPlus size={18} />, cor: '#4527a0' },
  pesquisa_satisfacao: { icone: <ClipboardCheck size={18} />, cor: '#00897b' },
  controle_ponto: { icone: <ClipboardCheck size={18} />, cor: '#37474f' },
  sla_tempo: { icone: <ClipboardCheck size={18} />, cor: '#1565c0' },
  assinatura_digital: { icone: <FileText size={18} />, cor: '#4e342e' },
  ocorrencia: { icone: <Camera size={18} />, cor: '#e65100' },
  manutencao: { icone: <Wrench size={18} />, cor: '#bf360c' },
  download_documento: { icone: <FileDown size={18} />, cor: '#0d47a1' },
};

/* ═══ snake_case → camelCase ═══ */
function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  const out: any = {};
  for (const key of Object.keys(obj)) {
    const camel = key.replaceAll(/_([a-z0-9])/gi, (_, c: string) => c.toUpperCase());
    out[camel] = toCamel(obj[key]);
  }
  return out;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ResponderQRCodePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [qr, setQr] = useState<QRCodeFormulario | null>(null);
  const [etapa, setEtapa] = useState<'carregando' | 'erro' | 'identificacao' | 'formulario' | 'enviado'>('carregando');
  const [erro, setErro] = useState('');
  const [identificacao, setIdentificacao] = useState<Identificacao>({ tipo: '', nome: '', bloco: '', unidade: '', anonimo: false });
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [enviando, setEnviando] = useState(false);

  /* ═══ Helpers para reduzir nesting ═══ */
  const updateResposta = useCallback((blocoId: string, value: any) => {
    setRespostas(prev => ({ ...prev, [blocoId]: value }));
  }, []);

  const updateRespostaProp = useCallback((blocoId: string, prop: string, value: any) => {
    setRespostas(prev => ({ ...prev, [blocoId]: { ...prev[blocoId], [prop]: value } }));
  }, []);

  const updateArrayItem = useCallback((blocoId: string, index: number, value: any, defaultArr: any[]) => {
    setRespostas(prev => {
      const arr = [...(prev[blocoId] || defaultArr)];
      arr[index] = value;
      return { ...prev, [blocoId]: arr };
    });
  }, []);

  const removeFromArray = useCallback((blocoId: string, index: number) => {
    setRespostas(prev => ({
      ...prev,
      [blocoId]: (prev[blocoId] || []).filter((_: any, i: number) => i !== index)
    }));
  }, []);

  const addGalleryPhoto = useCallback((blocoId: string, item: any, max: number) => {
    setRespostas(prev => {
      const arr = prev[blocoId] || [];
      if (arr.length >= max) return prev;
      return { ...prev, [blocoId]: [...arr, item] };
    });
  }, []);

  const removePhotoProp = useCallback((blocoId: string, index: number) => {
    setRespostas(prev => {
      const fotos = (prev[blocoId]?.fotos || []).filter((_: any, i: number) => i !== index);
      return { ...prev, [blocoId]: { ...prev[blocoId], fotos } };
    });
  }, []);

  const addPhotoProp = useCallback((blocoId: string, dataUrl: string) => {
    setRespostas(prev => {
      const fotos = [...(prev[blocoId]?.fotos || []), dataUrl];
      return { ...prev, [blocoId]: { ...prev[blocoId], fotos } };
    });
  }, []);

  const handleFileRead = useCallback((blocoId: string, files: FileList, max: number) => {
    const current = respostas[blocoId] || [];
    const remaining = max - current.length;
    if (remaining <= 0) return;
    Array.from(files).slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        addGalleryPhoto(blocoId, { nome: file.name, dataUrl: reader.result as string }, max);
      };
      reader.readAsDataURL(file);
    });
  }, [respostas, addGalleryPhoto]);

  const handlePhotoFile = useCallback((blocoId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        addPhotoProp(blocoId, ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, [addPhotoProp]);

  useEffect(() => {
    if (!id) { setErro('ID do QR Code não fornecido'); setEtapa('erro'); return; }
    fetch(`${API_BASE}/public/qrcodes/${encodeURIComponent(id)}`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'QR Code não encontrado');
        }
        return res.json();
      })
      .then(data => {
        const parsed = toCamel(data) as QRCodeFormulario;
        if (typeof parsed.blocos === 'string') {
          parsed.blocos = JSON.parse(parsed.blocos);
        }
        setQr(parsed);
        setEtapa(parsed.dispensarIdentificacao ? 'formulario' : 'identificacao');
      })
      .catch(err => {
        setErro(err.message);
        setEtapa('erro');
      });
  }, [id]);

  const avancarIdentificacao = () => {
    if (!identificacao.anonimo && (!identificacao.tipo || !identificacao.nome || !identificacao.bloco || !identificacao.unidade)) return;
    setEtapa('formulario');
  };

  const enviarRespostas = useCallback(async () => {
    if (!qr || enviando) return;
    setEnviando(true);
    try {
      await fetch(`${API_BASE}/public/qrcodes/${encodeURIComponent(qr.id)}/resposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacao, respostas }),
      });
      setEtapa('enviado');
    } catch {
      setEtapa('enviado');
    } finally {
      setEnviando(false);
    }
  }, [qr, identificacao, respostas, enviando]);

  const renderPesquisaStars = useCallback((blocoId: string, idx: number, currentValue: number, numOpcoes: number) => (
    [1, 2, 3, 4, 5].map(n => (
      <button key={n}
        className={`${styles.pesquisaEstrela} ${currentValue >= n ? styles.pesquisaEstrelaAtiva : ''}`}
        onClick={() => updateArrayItem(blocoId, idx, n, Array.from<number>({ length: numOpcoes }).fill(0))}>
        <Star size={20} fill={currentValue >= n ? '#00897b' : 'none'} />
      </button>
    ))
  ), [updateArrayItem]);

  const renderBlocoResposta = (bloco: BlocoConfig) => {
    const info = BLOCOS_INFO[bloco.tipo];
    const valor = respostas[bloco.id];
    const numOpcoes = bloco.opcoes?.length || 0;
    const defaultBools = Array.from<boolean>({ length: numOpcoes }).fill(false);
    const defaultTexts = Array.from<string>({ length: numOpcoes }).fill('');
    const defaultNums = Array.from<number>({ length: numOpcoes }).fill(0);

    return (
      <div key={bloco.id} className={styles.blocoResposta}>
        <div className={styles.blocoRespostaHeader}>
          <span className={styles.blocoRespostaIcone} style={{ color: info?.cor }}>{info?.icone}</span>
          <span className={styles.blocoRespostaLabel}>{bloco.label}</span>
          {bloco.obrigatorio && <span className={styles.blocoReq}>*</span>}
        </div>

        {(bloco.tipo === 'titulo' || bloco.tipo === 'subtitulo' || bloco.tipo === 'texto' || bloco.tipo === 'descricao') && (
          <textarea
            className={styles.respostaTextarea}
            placeholder={`Digite ${bloco.label.toLowerCase()}...`}
            value={valor || ''}
            onChange={e => updateResposta(bloco.id, e.target.value)}
            rows={bloco.tipo === 'titulo' || bloco.tipo === 'subtitulo' ? 1 : 3}
          />
        )}

        {bloco.tipo === 'galeria' && (
          <div className={styles.respostaGaleria}>
            <p className={styles.respostaHint}>Anexe até {bloco.maxFotos || 5} fotos</p>
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              id={`foto-input-${bloco.id}`}
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                handleFileRead(bloco.id, files, bloco.maxFotos || 5);
                e.target.value = '';
              }}
            />
            {(valor || []).length < (bloco.maxFotos || 5) && (
              <button className={styles.respostaUploadBtn} onClick={() => {
                document.getElementById(`foto-input-${bloco.id}`)?.click();
              }}>
                <Upload size={16} /> Adicionar Foto
              </button>
            )}
            {(valor || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {(valor as any[]).map((foto: any, i: number) => (
                  <div key={`gallery-${bloco.id}-${i}-${foto.nome}`} style={{ position: 'relative' }}>
                    <img src={foto.dataUrl} alt={foto.nome} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e0e0e0' }} />
                    <button
                      onClick={() => removeFromArray(bloco.id, i)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#e53935', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            {(valor || []).length > 0 && <span className={styles.respostaFotoCount}>{(valor || []).length} foto(s) anexada(s)</span>}
          </div>
        )}

        {bloco.tipo === 'checklist' && (
          <div className={styles.respostaChecklist}>
            {bloco.opcoes?.map((op, idx) => (
              <label key={`check-${bloco.id}-${op}`} className={styles.checkItem}>
                <input type="checkbox" checked={valor?.[idx] || false} onChange={e => {
                  updateArrayItem(bloco.id, idx, e.target.checked, defaultBools);
                }} />
                <span>{op}</span>
              </label>
            ))}
          </div>
        )}

        {(bloco.tipo === 'status' || bloco.tipo === 'prioridade') && (
          <select className={styles.respostaSelect} value={valor || ''} onChange={e => updateResposta(bloco.id, e.target.value)}>
            <option value="">Selecione...</option>
            {bloco.opcoes?.map(op => <option key={`sel-${bloco.id}-${op}`} value={op}>{op}</option>)}
          </select>
        )}

        {bloco.tipo === 'avaliacao_estrela' && (
          <div className={styles.respostaEstrelas}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} className={`${styles.estrela} ${(valor || 0) >= n ? styles.estrelaAtiva : ''}`}
                onClick={() => updateResposta(bloco.id, n)}>
                <Star size={28} fill={(valor || 0) >= n ? '#fbc02d' : 'none'} />
              </button>
            ))}
            <span className={styles.estrelaTexto}>{valor ? `${valor}/5` : 'Toque para avaliar'}</span>
          </div>
        )}

        {bloco.tipo === 'avaliacao_escala' && (
          <div className={styles.respostaEscala}>
            <div className={styles.escalaNumeros}>
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} className={`${styles.escalaNum} ${valor === i ? styles.escalaNumAtivo : ''}`}
                  onClick={() => updateResposta(bloco.id, i)}>
                  {i}
                </button>
              ))}
            </div>
            <div className={styles.escalaLabels}>
              <span>Muito ruim</span>
              <span>Excelente</span>
            </div>
          </div>
        )}

        {bloco.tipo === 'pergunta' && (
          <div className={styles.respostaPerguntas}>
            {bloco.opcoes?.map((pergunta, idx) => (
              <div key={`perg-${bloco.id}-${pergunta}`} className={styles.perguntaItem}>
                <label className={styles.perguntaLabel} htmlFor={`pergunta-${bloco.id}-${idx}`}>{pergunta || `Pergunta ${idx + 1}`}</label>
                <textarea
                  id={`pergunta-${bloco.id}-${idx}`}
                  className={styles.respostaTextarea}
                  placeholder="Sua resposta..."
                  value={valor?.[idx] || ''}
                  onChange={e => {
                    updateArrayItem(bloco.id, idx, e.target.value, defaultTexts);
                  }}
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        {(bloco.tipo === 'aviso' || bloco.tipo === 'comunicado') && (
          <textarea
            className={styles.respostaTextarea}
            placeholder={bloco.tipo === 'aviso' ? 'Registre o aviso...' : 'Registre o comunicado...'}
            value={valor || ''}
            onChange={e => updateResposta(bloco.id, e.target.value)}
            rows={3}
          />
        )}

        {bloco.tipo === 'feedback' && (
          <div className={styles.feedbackFields}>
            <p className={styles.feedbackHint}>Informe seu contato para receber um retorno:</p>
            <div className={styles.feedbackRow}>
              <Phone size={16} className={styles.feedbackIcon} />
              <input
                className={styles.formInput}
                placeholder="WhatsApp (ex: 11 99999-9999)"
                value={valor?.whatsapp || ''}
                onChange={e => updateRespostaProp(bloco.id, 'whatsapp', e.target.value)}
              />
            </div>
            <div className={styles.feedbackRow}>
              <Mail size={16} className={styles.feedbackIcon} />
              <input
                className={styles.formInput}
                type="email"
                placeholder="E-mail (ex: nome@email.com)"
                value={valor?.email || ''}
                onChange={e => updateRespostaProp(bloco.id, 'email', e.target.value)}
              />
            </div>
          </div>
        )}

        {bloco.tipo === 'urgencia' && (
          <div className={styles.urgenciaFields}>
            <div className={styles.urgenciaBanner}>
              <Siren size={20} />
              <span>Selecione o tipo de urgência e descreva o ocorrido</span>
            </div>
            <div className={styles.urgenciaOpcoes}>
              {bloco.opcoes?.map(op => (
                <label key={`urg-${bloco.id}-${op}`} className={`${styles.urgenciaItem} ${valor?.tipo === op ? styles.urgenciaItemAtivo : ''}`}>
                  <input type="radio" name={`urgencia-${bloco.id}`} checked={valor?.tipo === op}
                    onChange={() => updateRespostaProp(bloco.id, 'tipo', op)} hidden />
                  <AlertTriangle size={14} />
                  <span>{op}</span>
                </label>
              ))}
            </div>
            <textarea
              className={styles.respostaTextarea}
              placeholder="Descreva a urgência com detalhes..."
              value={valor?.descricao || ''}
              onChange={e => updateRespostaProp(bloco.id, 'descricao', e.target.value)}
              rows={3}
            />
          </div>
        )}

        {bloco.tipo === 'agendar_servico' && (
          <div className={styles.agendarFields}>
            <div className={styles.agendarBanner}>
              <CalendarPlus size={20} />
              <span>Solicite limpeza fora do horário</span>
            </div>
            <div className={styles.agendarOpcoes}>
              {bloco.opcoes?.map(op => (
                <label key={`ag-${bloco.id}-${op}`} className={`${styles.agendarItem} ${valor?.tipoServico === op ? styles.agendarItemAtivo : ''}`}>
                  <input type="radio" name={`agendar-${bloco.id}`} checked={valor?.tipoServico === op}
                    onChange={() => updateRespostaProp(bloco.id, 'tipoServico', op)} hidden />
                  <span>{op}</span>
                </label>
              ))}
            </div>
            <div className={styles.agendarCampos}>
              <div className={styles.agendarRow}>
                <label htmlFor={`agendar-date-${bloco.id}`}>Data desejada</label>
                <input id={`agendar-date-${bloco.id}`} type="date" className={styles.formInput} value={valor?.data || ''}
                  onChange={e => updateRespostaProp(bloco.id, 'data', e.target.value)} />
              </div>
              <div className={styles.agendarRow}>
                <label htmlFor={`agendar-time-${bloco.id}`}>Horário preferido</label>
                <input id={`agendar-time-${bloco.id}`} type="time" className={styles.formInput} value={valor?.horario || ''}
                  onChange={e => updateRespostaProp(bloco.id, 'horario', e.target.value)} />
              </div>
            </div>
            <textarea
              className={styles.respostaTextarea}
              placeholder="Observações..."
              value={valor?.observacoes || ''}
              onChange={e => updateRespostaProp(bloco.id, 'observacoes', e.target.value)}
              rows={3}
            />
          </div>
        )}

        {bloco.tipo === 'pesquisa_satisfacao' && (
          <div className={styles.pesquisaFields}>
            <div className={styles.pesquisaBanner}>
              <ClipboardCheck size={20} />
              <span>Avalie o serviço geral da empresa</span>
            </div>
            <div className={styles.pesquisaCriterios}>
              {bloco.opcoes?.map((criterio, idx) => (
                <div key={`pesq-${bloco.id}-${criterio}`} className={styles.pesquisaCriterio}>
                  <span className={styles.pesquisaCriterioLabel}>{criterio}</span>
                  <div className={styles.pesquisaEstrelas}>
                    {renderPesquisaStars(bloco.id, idx, valor?.[idx] || 0, bloco.opcoes?.length || 0)}
                    <span className={styles.pesquisaNota}>{valor?.[idx] ? `${valor[idx]}/5` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <textarea
              className={styles.respostaTextarea}
              placeholder="Comentários ou sugestões (opcional)..."
              value={valor?.comentario || ''}
              onChange={e => {
                const notas = Array.isArray(valor) ? valor : defaultNums;
                updateResposta(bloco.id, { notas, comentario: e.target.value });
              }}
              rows={2}
            />
          </div>
        )}

        {bloco.tipo === 'ocorrencia' && (
          <div className={styles.ocorrenciaFields}>
            <div className={styles.ocorrenciaBanner}>
              <Camera size={20} />
              <span>Informe a ocorrência com foto e descrição</span>
            </div>
            <div className={styles.ocorrenciaCategoria}>
              <span className={styles.ocorrenciaCatLabel}>Categoria:</span>
              <div className={styles.ocorrenciaOpcoes}>
                {bloco.opcoes?.map(op => (
                  <label key={`ocor-${bloco.id}-${op}`} className={`${styles.ocorrenciaItem} ${valor?.categoria === op ? styles.ocorrenciaItemAtivo : ''}`}>
                    <input type="radio" name={`ocorrencia-${bloco.id}`} checked={valor?.categoria === op}
                      onChange={() => updateRespostaProp(bloco.id, 'categoria', op)} hidden />
                    <AlertTriangle size={14} />
                    <span>{op}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.ocorrenciaLocal}>
              <label className={styles.ocorrenciaCatLabel} htmlFor={`ocor-local-${bloco.id}`}>Local:</label>
              <input id={`ocor-local-${bloco.id}`} className={styles.formInput} placeholder="Ex: Hall do Bloco A..."
                value={valor?.local || ''}
                onChange={e => updateRespostaProp(bloco.id, 'local', e.target.value)} />
            </div>
            <div className={styles.ocorrenciaDescricao}>
              <label className={styles.ocorrenciaCatLabel} htmlFor={`ocor-desc-${bloco.id}`}>Descrição:</label>
              <textarea id={`ocor-desc-${bloco.id}`} className={styles.respostaTextarea} placeholder="Descreva o problema..."
                value={valor?.descricao || ''}
                onChange={e => updateRespostaProp(bloco.id, 'descricao', e.target.value)} rows={4} />
            </div>
            <div className={styles.ocorrenciaFotos}>
              <span className={styles.ocorrenciaCatLabel}>Fotos:</span>
              <div className={styles.ocorrenciaFotoGrid}>
                {(valor?.fotos || []).map((foto: string, idx: number) => (
                  <div key={`ocor-foto-${bloco.id}-${idx}`} className={styles.ocorrenciaFotoThumb}>
                    <img src={foto} alt={`Foto ${idx + 1}`} />
                    <button type="button" className={styles.ocorrenciaFotoRemover}
                      onClick={() => removePhotoProp(bloco.id, idx)}><X size={14} /></button>
                  </div>
                ))}
                {(valor?.fotos || []).length < 5 && (
                  <label className={styles.ocorrenciaFotoAdd}>
                    <Camera size={24} /><span>Adicionar foto</span>
                    <input type="file" accept="image/*" capture="environment" hidden
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handlePhotoFile(bloco.id, file);
                        e.target.value = '';
                      }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {bloco.tipo === 'manutencao' && (
          <div className={styles.manutencaoFields}>
            <div className={styles.manutencaoBanner}>
              <Wrench size={20} />
              <span>Reportar problema de manutenção</span>
            </div>
            <div className={styles.manutencaoSecao}>
              <span className={styles.manutencaoLabel}>Tipo:</span>
              <div className={styles.manutencaoOpcoes}>
                {bloco.opcoes?.map(op => (
                  <label key={`manut-${bloco.id}-${op}`} className={`${styles.manutencaoItem} ${valor?.tipo === op ? styles.manutencaoItemAtivo : ''}`}>
                    <input type="radio" name={`manutencao-${bloco.id}`} checked={valor?.tipo === op}
                      onChange={() => updateRespostaProp(bloco.id, 'tipo', op)} hidden />
                    <Wrench size={14} /><span>{op}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.manutencaoSecao}>
              <span className={styles.manutencaoLabel}>Prioridade:</span>
              <div className={styles.manutencaoPrioridades}>
                {['Baixa', 'Média', 'Alta', 'Urgente'].map(p => (
                  <button key={p} type="button"
                    className={`${styles.manutencaoPri} ${styles['manutencaoPri' + p]} ${valor?.prioridade === p ? styles.manutencaoPriAtivo : ''}`}
                    onClick={() => updateRespostaProp(bloco.id, 'prioridade', p)}>
                    <Flag size={14} />{p}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.manutencaoSecao}>
              <label className={styles.manutencaoLabel} htmlFor={`manut-local-${bloco.id}`}>Local:</label>
              <input id={`manut-local-${bloco.id}`} className={styles.formInput} placeholder="Ex: Banheiro do 3º andar..."
                value={valor?.local || ''}
                onChange={e => updateRespostaProp(bloco.id, 'local', e.target.value)} />
            </div>
            <div className={styles.manutencaoSecao}>
              <label className={styles.manutencaoLabel} htmlFor={`manut-desc-${bloco.id}`}>Descrição:</label>
              <textarea id={`manut-desc-${bloco.id}`} className={styles.respostaTextarea} placeholder="Descreva o problema..."
                value={valor?.descricao || ''}
                onChange={e => updateRespostaProp(bloco.id, 'descricao', e.target.value)} rows={4} />
            </div>
            <div className={styles.manutencaoSecao}>
              <span className={styles.manutencaoLabel}>Fotos:</span>
              <div className={styles.manutencaoFotoGrid}>
                {(valor?.fotos || []).map((foto: string, idx: number) => (
                  <div key={`manut-foto-${bloco.id}-${idx}`} className={styles.manutencaoFotoThumb}>
                    <img src={foto} alt={`Foto ${idx + 1}`} />
                    <button type="button" className={styles.manutencaoFotoRemover}
                      onClick={() => removePhotoProp(bloco.id, idx)}><X size={14} /></button>
                  </div>
                ))}
                {(valor?.fotos || []).length < 5 && (
                  <label className={styles.manutencaoFotoAdd}>
                    <Camera size={24} /><span>Tirar / anexar foto</span>
                    <input type="file" accept="image/*" capture="environment" hidden
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handlePhotoFile(bloco.id, file);
                        e.target.value = '';
                      }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tipos que dependem de auth (controle_ponto, sla_tempo, assinatura_digital) ficam como texto simples na versão pública */}
        {(bloco.tipo === 'controle_ponto' || bloco.tipo === 'sla_tempo' || bloco.tipo === 'assinatura_digital') && (
          <textarea
            className={styles.respostaTextarea}
            placeholder={`Resposta para ${bloco.label}...`}
            value={valor || ''}
            onChange={e => updateResposta(bloco.id, e.target.value)}
            rows={3}
          />
        )}

        {bloco.tipo === 'download_documento' && (
          <div className={styles.documentoDownloadArea}>
            {bloco.documentoUrl ? (
              <a
                href={bloco.documentoUrl.startsWith('http') ? bloco.documentoUrl : `${API_BASE.replace('/api', '')}${bloco.documentoUrl}`}
                download={bloco.documentoNome || 'documento'}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.documentoDownloadBtn}
              >
                <FileDown size={24} />
                <div>
                  <strong>{bloco.documentoNome || 'Documento'}</strong>
                  <span>Toque para baixar o documento</span>
                </div>
              </a>
            ) : (
              <p className={styles.documentoVazio}>Nenhum documento disponível para download.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ═══ RENDER ═══ */

  if (etapa === 'carregando') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f7fa', flexDirection: 'column', gap: 16 }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#f57c00' }} />
        <p style={{ color: '#65676b', fontSize: 14 }}>Carregando formulário...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (etapa === 'erro') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f7fa', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>😔</div>
        <h2 style={{ fontSize: 20, color: '#1a1a2e', margin: 0 }}>QR Code indisponível</h2>
        <p style={{ color: '#65676b', fontSize: 14, maxWidth: 400 }}>{erro}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '24px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {qr?.logo && <img src={qr.logo} alt="Logo" style={{ height: 56, marginBottom: 12, borderRadius: 8 }} />}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>{qr?.nome}</h1>
          {qr?.descricao && <p style={{ color: '#65676b', fontSize: 14, margin: 0 }}>{qr.descricao}</p>}
        </div>

        {/* Identificação */}
        {etapa === 'identificacao' && qr && (
          <div className={styles.idForm} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h4 className={styles.idTitulo}>Identificação</h4>
            <p className={styles.idDesc}>Por favor, identifique-se antes de continuar.</p>

            <span className={styles.formLabel}>Você é:</span>
            <div className={styles.idTipoGrid}>
              {([
                { val: 'morador', label: 'Morador', icon: <Home size={20} /> },
                { val: 'funcionario', label: 'Funcionário', icon: <UserCheck size={20} /> },
                { val: 'prestador', label: 'Prestador', icon: <Building2 size={20} /> },
              ] as const).map(t => (
                <button key={t.val}
                  className={`${styles.idTipoBtn} ${identificacao.tipo === t.val ? styles.idTipoBtnAtivo : ''}`}
                  onClick={() => setIdentificacao(prev => ({ ...prev, tipo: t.val }))}>
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <label className={styles.formLabel} htmlFor="id-nome">Seu Nome</label>
            <input id="id-nome" className={styles.formInput} placeholder="Digite seu nome completo..."
              value={identificacao.nome}
              onChange={e => setIdentificacao(prev => ({ ...prev, nome: e.target.value }))} />

            <label className={styles.formLabel} htmlFor="id-bloco">Bloco</label>
            <select id="id-bloco" className={styles.formSelect} value={identificacao.bloco}
              onChange={e => setIdentificacao(prev => ({ ...prev, bloco: e.target.value }))}>
              <option value="">Selecione o bloco...</option>
              {qr.blocosCadastrados?.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <label className={styles.formLabel} htmlFor="id-unidade">Apartamento / Casa</label>
            <input id="id-unidade" className={styles.formInput} placeholder="Ex: 204, Casa 12..."
              value={identificacao.unidade}
              onChange={e => setIdentificacao(prev => ({ ...prev, unidade: e.target.value }))} />

            <label className={`${styles.checkboxLabel} ${styles.checkboxDestaque}`}>
              <input type="checkbox" checked={identificacao.anonimo}
                onChange={e => setIdentificacao(prev => ({
                  ...prev, anonimo: e.target.checked,
                  tipo: e.target.checked ? '' : prev.tipo,
                  nome: e.target.checked ? '' : prev.nome,
                  bloco: e.target.checked ? '' : prev.bloco,
                  unidade: e.target.checked ? '' : prev.unidade,
                }))} />
              <span>Não quero me identificar</span>
            </label>

            <button className={styles.formSubmit} onClick={avancarIdentificacao}
              disabled={!identificacao.anonimo && (!identificacao.tipo || !identificacao.nome || !identificacao.bloco || !identificacao.unidade)}>
              Continuar <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Formulário */}
        {etapa === 'formulario' && qr && (
          <div className={styles.respForm} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className={styles.respBlocos}>
              {qr.blocos.map(renderBlocoResposta)}
            </div>
            <button className={styles.formSubmit} onClick={enviarRespostas} disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Respostas'}
            </button>
          </div>
        )}

        {/* Enviado */}
        {etapa === 'enviado' && (
          <div className={styles.enviadoMsg} style={{ background: '#fff', borderRadius: 12, padding: 40, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className={styles.enviadoIcone}>
              <CheckSquare size={48} />
            </div>
            <h4>Respostas enviadas!</h4>
            <p>Obrigado por participar. Suas respostas foram registradas com sucesso.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 16 }}>
          <p style={{ color: '#aaa', fontSize: 12 }}>Powered by Gestão e Limpeza</p>
        </div>
      </div>
    </div>
  );
};

export default ResponderQRCodePage;
