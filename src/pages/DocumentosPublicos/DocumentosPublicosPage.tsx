import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { useDemo } from '../../contexts/DemoContext';
import {
  Plus, X, Trash2, Search, Building2, Eye, EyeOff,
  Download, Copy, ExternalLink, QrCode, Edit2, Check, Loader2,
  Settings, Upload,
} from 'lucide-react';
import { documentosPublicos as api, condominios as condominiosApi, upload } from '../../services/api';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './DocumentosPublicos.module.css';

interface Categoria { value: string; label: string; }

interface DocPublico {
  id: string;
  condominioId: string;
  condominioNome?: string;
  slug: string;
  titulo: string;
  tipo: string;
  conteudo: string | null;
  arquivoUrl: string | null;
  arquivoNome: string | null;
  ativo: boolean;
  visualizacoes: number;
  criadoEm: string;
  atualizadoEm: string;
}

interface Condominio {
  id: string;
  nome: string;
}

const DocumentosPublicosPage: React.FC = () => {
  const { tentarAcao } = useDemo();
  const [docs, setDocs] = useState<DocPublico[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCond, setFiltroCond] = useState('');

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<DocPublico | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Form
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('comunicado');
  const [conteudo, setConteudo] = useState('');
  const [arquivoUrl, setArquivoUrl] = useState('');
  const [arquivoNome, setArquivoNome] = useState('');
  const [condominioId, setCondominioId] = useState('');

  // Categorias dinâmicas
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showCatConfig, setShowCatConfig] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Confirmação delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [d, c, cats] = await Promise.all([
        api.list(),
        condominiosApi.list().catch(() => []),
        api.getCategorias().catch(() => []),
      ]);
      setDocs(d as DocPublico[]);
      setCondominios(c.map((cc: any) => ({ id: cc.id, nome: cc.nome })));
      if ((cats as Categoria[]).length > 0) setCategorias(cats as Categoria[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const getPublicUrl = (slug: string) => {
    const base = globalThis.location.origin;
    return `${base}/doc/${slug}`;
  };

  const abrirModal = (doc?: DocPublico) => {
    if (doc) {
      setEditando(doc);
      setTitulo(doc.titulo);
      setTipo(doc.tipo);
      setConteudo(doc.conteudo || '');
      setArquivoUrl(doc.arquivoUrl || '');
      setArquivoNome(doc.arquivoNome || '');
      setCondominioId(doc.condominioId);
    } else {
      setEditando(null);
      setTitulo('');
      setTipo('comunicado');
      setConteudo('');
      setArquivoUrl('');
      setArquivoNome('');
      setCondominioId(condominios[0]?.id || '');
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
  };

  const salvar = async () => {
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      if (editando) {
        await api.update(editando.id, { titulo, tipo, conteudo: conteudo || null, arquivoUrl: arquivoUrl || null, arquivoNome: arquivoNome || null });
      } else {
        if (!condominioId) return;
        await api.create({ condominioId, titulo, tipo, conteudo: conteudo || null, arquivoUrl: arquivoUrl || null, arquivoNome: arquivoNome || null });
      }
      fecharModal();
      await carregar();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (doc: DocPublico) => {
    try {
      await api.toggle(doc.id);
      await carregar();
    } catch (e) {
      console.error(e);
    }
  };

  const excluir = async (id: string) => {
    try {
      await api.remove(id);
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      console.error(e);
    }
  };

  const copiarUrl = (slug: string) => {
    navigator.clipboard.writeText(getPublicUrl(slug)).catch(() => {});
  };

  // ─── Categorias ───
  const addCategoria = async () => {
    const label = novaCategoria.trim();
    if (!label) return;
    const value = label.toLowerCase().normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').replaceAll(/\s+/g, '-').replaceAll(/[^a-z0-9-]/g, '');
    if (categorias.some(c => c.value === value)) return;
    const updated = [...categorias, { value, label }];
    try {
      await api.setCategorias(updated);
      setCategorias(updated);
      setNovaCategoria('');
    } catch (e) { console.error(e); }
  };

  const removeCategoria = async (value: string) => {
    const updated = categorias.filter(c => c.value !== value);
    try {
      await api.setCategorias(updated);
      setCategorias(updated);
    } catch (e) { console.error(e); }
  };

  // ─── Upload ───
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await upload.document(file);
      setArquivoUrl(url);
      setArquivoNome(file.name);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const removeArquivo = () => {
    setArquivoUrl('');
    setArquivoNome('');
  };

  const downloadQR = (doc: DocPublico) => {
    const qrContainer = document.getElementById(`qr-${doc.id}`);
    const canvas = qrContainer?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${doc.titulo.replaceAll(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Filtros
  const docsFiltrados = docs.filter(d => {
    if (busca && !d.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroCond && d.condominioId !== filtroCond) return false;
    return true;
  });

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
        titulo="QR Codes — Documentos Públicos"
        subtitulo="QR Codes fixos para disponibilizar documentos. A URL nunca muda — atualize apenas o conteúdo."
        acoes={
          <button className={styles.addBtn} onClick={() => { if (tentarAcao()) abrirModal(); }}>
            <Plus size={16} /> Novo Documento
          </button>
        }
      />

      {/* Toolbar */}
      <Card>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={16} />
            <input
              className={styles.searchInput}
              placeholder="Buscar documento..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          {condominios.length > 1 && (
            <select className={styles.filtroSelect} value={filtroCond} onChange={e => setFiltroCond(e.target.value)}>
              <option value="">Todos os condomínios</option>
              {condominios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
        </div>

        {docsFiltrados.length === 0 ? (
          <div className={styles.vazio}>
            <QrCode size={48} />
            <p>Nenhum documento público cadastrado.</p>
            <p style={{ fontSize: 13 }}>Crie um documento e gere um QR Code fixo para exibir em murais, elevadores, etc.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {docsFiltrados.map(doc => (
              <div key={doc.id} className={styles.docCard}>
                <div className={styles.docCardHeader}>
                  <div className={styles.docInfo}>
                    <div className={styles.docTitulo}>{doc.titulo}</div>
                    <div className={styles.docMeta}>
                      <span className={doc.ativo ? styles.statusAtivo : styles.statusInativo}>
                        {doc.ativo ? '● Ativo' : '● Inativo'}
                      </span>
                      <span className={styles.tipoBadge}>
                        {categorias.find(t => t.value === doc.tipo)?.label || doc.tipo}
                      </span>
                      <span className={styles.viewCount}>
                        <Eye size={12} /> {doc.visualizacoes}
                      </span>
                      {doc.condominioNome && (
                        <span><Building2 size={12} /> {doc.condominioNome}</span>
                      )}
                    </div>
                  </div>
                </div>

                {doc.conteudo && (
                  <div className={styles.docConteudo}>{doc.conteudo}</div>
                )}

                {/* QR Code preview */}
                <div className={styles.qrPreview} id={`qr-${doc.id}`}>
                  <QRCodeCanvas
                    value={getPublicUrl(doc.slug)}
                    size={140}
                    fgColor="#1a1a2e"
                    bgColor="#ffffff"
                    level="M"
                  />
                  <div className={styles.qrUrl}>{getPublicUrl(doc.slug)}</div>
                </div>

                {/* Actions */}
                <div className={styles.docActions}>
                  <button className={styles.actionBtn} onClick={() => { if (tentarAcao()) abrirModal(doc); }}>
                    <Edit2 size={14} /> Editar
                  </button>
                  <button className={styles.actionBtn} onClick={() => toggleAtivo(doc)}>
                    {doc.ativo ? <><EyeOff size={14} /> Desativar</> : <><Eye size={14} /> Ativar</>}
                  </button>
                  <button className={styles.actionBtn} onClick={() => downloadQR(doc)}>
                    <Download size={14} /> QR
                  </button>
                  <button className={styles.actionBtn} onClick={() => copiarUrl(doc.slug)}>
                    <Copy size={14} /> URL
                  </button>
                  <a
                    className={styles.actionBtn}
                    href={getPublicUrl(doc.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} /> Ver
                  </a>
                  {confirmDelete === doc.id ? (
                    <>
                      <button className={styles.dangerBtn} onClick={() => excluir(doc.id)}>
                        <Check size={14} /> Confirmar
                      </button>
                      <button className={styles.actionBtn} onClick={() => setConfirmDelete(null)}>
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button className={styles.dangerBtn} onClick={() => setConfirmDelete(doc.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal Criar/Editar */}
      {modalAberto && (
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className={styles.modalTitle}>{editando ? 'Editar Documento' : 'Novo Documento Público'}</h2>
              <button onClick={fecharModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)' }}>
                <X size={20} />
              </button>
            </div>

            {!editando && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="doc-condo">Condomínio</label>
                <select
                  id="doc-condo"
                  className={styles.formSelect}
                  value={condominioId}
                  onChange={e => setCondominioId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {condominios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="doc-titulo">Título</label>
              <input
                id="doc-titulo"
                className={styles.formInput}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Regulamento do Condomínio"
              />
            </div>

            <div className={styles.formGroup}>
              <div className={styles.formLabelRow}>
                <label className={styles.formLabel} htmlFor="doc-tipo">Categoria</label>
                <button type="button" className={styles.settingsBtn} onClick={() => setShowCatConfig(!showCatConfig)}>
                  <Settings size={12} /> Configurar
                </button>
              </div>
              <select id="doc-tipo" className={styles.formSelect} value={tipo} onChange={e => setTipo(e.target.value)}>
                {categorias.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {showCatConfig && (
                <div className={styles.catConfig}>
                  <div className={styles.catConfigTitle}>Gerenciar Categorias</div>
                  <div className={styles.catList}>
                    {categorias.map(c => (
                      <span key={c.value} className={styles.catTag}>
                        {c.label}
                        <button type="button" className={styles.catRemoveBtn} onClick={() => removeCategoria(c.value)}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className={styles.catAddRow}>
                    <input
                      className={styles.catAddInput}
                      value={novaCategoria}
                      onChange={e => setNovaCategoria(e.target.value)}
                      placeholder="Nova categoria..."
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategoria(); } }}
                    />
                    <button type="button" className={styles.catAddBtn} onClick={addCategoria}>
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="doc-conteudo">Conteúdo (texto)</label>
              <textarea
                id="doc-conteudo"
                className={styles.formTextarea}
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                placeholder="Digite o conteúdo do documento..."
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Arquivo (opcional)</label>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={onFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              />
              {uploading ? (
                <div className={styles.uploadProgress}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Enviando arquivo...
                </div>
              ) : arquivoUrl ? (
                <div className={styles.uploadedFile}>
                  <Check size={16} style={{ color: 'var(--cor-primaria)' }} />
                  <span className={styles.uploadedFileName}>{arquivoNome || 'Arquivo'}</span>
                  <button type="button" className={styles.uploadRemoveBtn} onClick={removeArquivo}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={dragging ? styles.uploadAreaDrag : styles.uploadArea}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onFileDrop}
                >
                  <Upload size={24} />
                  <span>Clique ou arraste um arquivo aqui</span>
                  <span className={styles.uploadHint}>PDF, DOC, XLS, imagens (máx. 10MB)</span>
                </button>
              )}
            </div>

            {editando && (
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 12, color: '#666', marginBottom: 8 }}>
                <strong>URL fixa:</strong> {getPublicUrl(editando.slug)}<br />
                <span>O QR Code e a URL nunca mudam — apenas o conteúdo é atualizado.</span>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={fecharModal}>Cancelar</button>
              <button
                className={styles.saveBtn}
                onClick={() => { if (tentarAcao()) salvar(); }}
                disabled={!titulo.trim() || (!editando && !condominioId) || salvando}
              >
                {salvando ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {editando ? 'Salvar Alterações' : 'Criar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentosPublicosPage;
