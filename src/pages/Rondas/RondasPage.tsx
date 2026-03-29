import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { useDemo } from '../../contexts/DemoContext';
import {
  Plus, X, Trash2, Search, Building2, Eye, EyeOff,
  Download, Copy, QrCode, Edit2, Check, Loader2,
  MapPin, Clock, Image,
} from 'lucide-react';
import { rondas as api, condominios as condominiosApi, upload } from '../../services/api';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './Rondas.module.css';

interface PontoRonda {
  id: string;
  condominioId: string;
  condominioNome?: string;
  titulo: string;
  descricao: string | null;
  imagem: string | null;
  ativo: boolean;
  criadoEm: string;
}

interface RegistroRonda {
  id: string;
  pontoId: string;
  pontoTitulo: string;
  pontoDescricao: string | null;
  condominioNome: string;
  funcionarioId: string | null;
  funcionarioNome: string;
  dataHora: string;
  latitude: number | null;
  longitude: number | null;
  endereco: string | null;
  observacao: string | null;
  fotoSelfie: string | null;
}

interface Condominio {
  id: string;
  nome: string;
}

const RondasPage: React.FC = () => {
  const { tentarAcao } = useDemo();

  // ─── Tab ───
  const [tab, setTab] = useState<'pontos' | 'relatorio'>('pontos');

  // ─── Pontos ───
  const [pontos, setPontos] = useState<PontoRonda[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // ─── Modal ───
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<PontoRonda | null>(null);
  const [salvando, setSalvando] = useState(false);

  // ─── Form ───
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagem, setImagem] = useState('');
  const [condominioId, setCondominioId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Delete ───
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ─── Relatório ───
  const [registros, setRegistros] = useState<RegistroRonda[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [filtroDe, setFiltroDe] = useState('');
  const [filtroAte, setFiltroAte] = useState('');
  const [filtroFunc, setFiltroFunc] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.list(),
        condominiosApi.list().catch(() => []),
      ]);
      setPontos(p as PontoRonda[]);
      setCondominios(c.map((cc: any) => ({ id: cc.id, nome: cc.nome })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const getScanUrl = (id: string) => `${globalThis.location.origin}/ronda/${id}`;

  // ─── Modal helpers ───
  const abrirModal = (p?: PontoRonda) => {
    if (p) {
      setEditando(p);
      setTitulo(p.titulo);
      setDescricao(p.descricao || '');
      setImagem(p.imagem || '');
      setCondominioId(p.condominioId);
    } else {
      setEditando(null);
      setTitulo('');
      setDescricao('');
      setImagem('');
      setCondominioId(condominios[0]?.id || '');
    }
    setModalAberto(true);
  };

  const fecharModal = () => { setModalAberto(false); setEditando(null); };

  const salvar = async () => {
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      if (editando) {
        await api.update(editando.id, { titulo, descricao: descricao || null, imagem: imagem || null });
      } else {
        if (!condominioId) return;
        await api.create({ condominioId, titulo, descricao: descricao || null, imagem: imagem || null });
      }
      fecharModal();
      await carregar();
    } catch (e) { console.error(e); }
    finally { setSalvando(false); }
  };

  const toggleAtivo = async (p: PontoRonda) => {
    try { await api.toggle(p.id); await carregar(); } catch (e) { console.error(e); }
  };

  const excluir = async (id: string) => {
    try { await api.remove(id); setConfirmDelete(null); await carregar(); } catch (e) { console.error(e); }
  };

  const copiarUrl = (id: string) => {
    navigator.clipboard.writeText(getScanUrl(id)).catch(() => {});
  };

  const downloadQR = (p: PontoRonda) => {
    const el = document.getElementById(`qr-ronda-${p.id}`);
    const canvas = el?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ronda-${p.titulo.replaceAll(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ─── Upload imagem ───
  const handleImgUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await upload.document(file);
      setImagem(url);
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const onImgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleImgUpload(f);
    e.target.value = '';
  };

  // ─── Relatório ───
  const carregarRelatorio = useCallback(async () => {
    setRegLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroDe) params.set('de', new Date(filtroDe).toISOString());
      if (filtroAte) params.set('ate', new Date(`${filtroAte}T23:59:59`).toISOString());
      if (filtroFunc) params.set('funcionarioId', filtroFunc);
      const rows = await api.registros(params.toString());
      setRegistros(rows as RegistroRonda[]);
    } catch (e) { console.error(e); }
    finally { setRegLoading(false); }
  }, [filtroDe, filtroAte, filtroFunc]);

  useEffect(() => {
    if (tab === 'relatorio') carregarRelatorio();
  }, [tab, carregarRelatorio]);

  // ─── Funcionários únicos p/ filtro ───
  const funcionariosUnicos = [...new Map(registros.map(r => [r.funcionarioNome, r])).values()];

  const pontosFiltrados = pontos.filter(p =>
    !busca || p.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  const formatData = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatHora = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getMapUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--cor-primaria)' }} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        titulo="QR Code para Rondas"
        subtitulo="Crie QR Codes fixos em pontos de ronda. O funcionário escaneia e registra data, horário e localização automaticamente."
        acoes={
          <button className={styles.addBtn} onClick={() => { if (tentarAcao()) abrirModal(); }}>
            <Plus size={16} /> Novo Ponto
          </button>
        }
      />

      {/* ─── Tabs ─── */}
      <div className={styles.tabs}>
        <button className={tab === 'pontos' ? styles.tabActive : styles.tab} onClick={() => setTab('pontos')}>
          <QrCode size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
          Pontos de Ronda
        </button>
        <button className={tab === 'relatorio' ? styles.tabActive : styles.tab} onClick={() => setTab('relatorio')}>
          <Clock size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
          Relatório
        </button>
      </div>

      {/* ═══════ ABA: PONTOS ═══════ */}
      {tab === 'pontos' && (
        <Card>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search size={16} />
              <input className={styles.searchInput} placeholder="Buscar ponto..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
          </div>

          {pontosFiltrados.length === 0 ? (
            <div className={styles.vazio}>
              <QrCode size={48} />
              <p>Nenhum ponto de ronda cadastrado.</p>
              <p style={{ fontSize: 13 }}>Crie pontos de ronda e fixe o QR Code impresso em cada local.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {pontosFiltrados.map(p => (
                <div key={p.id} className={styles.pontoCard}>
                  <div className={styles.pontoHeader}>
                    {p.imagem && (
                      <div className={styles.pontoImgWrap}>
                        <img src={p.imagem} alt={p.titulo} />
                      </div>
                    )}
                    <div className={styles.pontoInfo}>
                      <div className={styles.pontoTitulo}>{p.titulo}</div>
                      {p.descricao && <div className={styles.pontoDesc}>{p.descricao}</div>}
                    </div>
                  </div>

                  <div className={styles.pontoMeta}>
                    <span className={p.ativo ? styles.statusAtivo : styles.statusInativo}>
                      {p.ativo ? '● Ativo' : '● Inativo'}
                    </span>
                    {p.condominioNome && <span><Building2 size={12} /> {p.condominioNome}</span>}
                  </div>

                  <div className={styles.qrPreview} id={`qr-ronda-${p.id}`}>
                    <QRCodeCanvas value={getScanUrl(p.id)} size={120} fgColor="#1a1a2e" bgColor="#ffffff" level="M" />
                    <div className={styles.qrUrl}>{getScanUrl(p.id)}</div>
                  </div>

                  <div className={styles.pontoActions}>
                    <button className={styles.actionBtn} onClick={() => { if (tentarAcao()) abrirModal(p); }}>
                      <Edit2 size={14} /> Editar
                    </button>
                    <button className={styles.actionBtn} onClick={() => toggleAtivo(p)}>
                      {p.ativo ? <><EyeOff size={14} /> Desativar</> : <><Eye size={14} /> Ativar</>}
                    </button>
                    <button className={styles.actionBtn} onClick={() => downloadQR(p)}>
                      <Download size={14} /> QR
                    </button>
                    <button className={styles.actionBtn} onClick={() => copiarUrl(p.id)}>
                      <Copy size={14} /> URL
                    </button>
                    {confirmDelete === p.id ? (
                      <>
                        <button className={styles.dangerBtn} onClick={() => excluir(p.id)}>
                          <Check size={14} /> Confirmar
                        </button>
                        <button className={styles.actionBtn} onClick={() => setConfirmDelete(null)}>
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button className={styles.dangerBtn} onClick={() => setConfirmDelete(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ═══════ ABA: RELATÓRIO ═══════ */}
      {tab === 'relatorio' && (
        <Card>
          <div className={styles.filtrosRow}>
            <div className={styles.filtroGroup}>
              <span className={styles.filtroLabel}>De</span>
              <input type="date" className={styles.filtroInput} value={filtroDe} onChange={e => setFiltroDe(e.target.value)} />
            </div>
            <div className={styles.filtroGroup}>
              <span className={styles.filtroLabel}>Até</span>
              <input type="date" className={styles.filtroInput} value={filtroAte} onChange={e => setFiltroAte(e.target.value)} />
            </div>
            <div className={styles.filtroGroup}>
              <span className={styles.filtroLabel}>Funcionário</span>
              <select className={styles.filtroInput} value={filtroFunc} onChange={e => setFiltroFunc(e.target.value)}>
                <option value="">Todos</option>
                {funcionariosUnicos.map((r, i) => (
                  <option key={`func-${i}-${r.funcionarioNome}`} value={r.funcionarioId || ''}>
                    {r.funcionarioNome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {regLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--cor-texto-secundario)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : null}

          {!regLoading && registros.length === 0 && (
            <div className={styles.vazio}>
              <Clock size={48} />
              <p>Nenhum registro de ronda encontrado.</p>
            </div>
          )}

          {!regLoading && registros.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Selfie</th>
                    <th>Local (Ponto)</th>
                    <th>Condomínio</th>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Funcionário</th>
                    <th>Localização</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(r => (
                    <tr key={r.id}>
                      <td>
                        {r.fotoSelfie ? (
                          <img src={r.fotoSelfie} alt="Selfie" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                      <td><strong>{r.pontoTitulo}</strong></td>
                      <td>{r.condominioNome}</td>
                      <td>{formatData(r.dataHora)}</td>
                      <td>{formatHora(r.dataHora)}</td>
                      <td>{r.funcionarioNome}</td>
                      <td>
                        {r.latitude && r.longitude ? (
                          <a
                            href={getMapUrl(r.latitude, r.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.mapLink}
                          >
                            <MapPin size={13} />
                            {r.endereco || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}
                          </a>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                      <td>{r.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ═══════ MODAL CRIAR/EDITAR ═══════ */}
      {modalAberto && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className={styles.modalTitle}>{editando ? 'Editar Ponto' : 'Novo Ponto de Ronda'}</h2>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)' }}>
                <X size={20} />
              </button>
            </div>

            {!editando && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="ronda-condo">Condomínio</label>
                <select id="ronda-condo" className={styles.formSelect} value={condominioId} onChange={e => setCondominioId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {condominios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="ronda-titulo">Título</label>
              <input
                id="ronda-titulo"
                className={styles.formInput}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Portaria Principal, Garagem B2, Hall 3º andar"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="ronda-desc">Descrição (opcional)</label>
              <textarea
                id="ronda-desc"
                className={styles.formTextarea}
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Detalhes do ponto de ronda..."
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="ronda-img-upload">Imagem (opcional)</label>
              <input
                id="ronda-img-upload"
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onImgSelect}
              />
              {uploading ? (
                <div style={{ textAlign: 'center', padding: 16, color: 'var(--cor-texto-secundario)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...
                </div>
              ) : null}

              {!uploading && imagem && (
                <div className={styles.uploadedImg}>
                  <img src={imagem} alt="Preview" />
                  <button type="button" className={styles.uploadedImgRemove} onClick={() => setImagem('')}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {!uploading && !imagem && (
                <button type="button" className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
                  <Image size={24} />
                  <span>Clique para adicionar imagem</span>
                </button>
              )}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={fecharModal}>Cancelar</button>
              <button
                className={styles.saveBtn}
                onClick={() => { if (tentarAcao()) salvar(); }}
                disabled={!titulo.trim() || (!editando && !condominioId) || salvando}
              >
                {salvando ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {editando ? 'Salvar' : 'Criar Ponto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RondasPage;
