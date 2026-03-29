import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Clock, AlertTriangle, FileText, Eye } from 'lucide-react';
import styles from './DocumentosPublicos.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getFileType(url: string, nome?: string): 'pdf' | 'image' | 'other' {
  const src = (nome || url || '').toLowerCase();
  if (src.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|svg|bmp)$/.test(src)) return 'image';
  return 'other';
}

const VerDocumentoPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/public/doc/${encodeURIComponent(slug)}`)
      .then(async r => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || 'Documento não encontrado');
        }
        return r.json();
      })
      .then(data => setDoc(data))
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const fileType = useMemo(() => {
    if (!doc?.arquivo_url) return 'other';
    return getFileType(doc.arquivo_url, doc.arquivo_nome);
  }, [doc]);

  if (loading) {
    return (
      <div className={styles.publicContainer}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #ddd', borderTop: '3px solid #1565c0', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Carregando documento...
        </div>
      </div>
    );
  }

  if (erro || !doc) {
    return (
      <div className={styles.publicContainer}>
        <div className={styles.publicError}>
          <AlertTriangle size={48} style={{ color: '#c62828', margin: '0 auto 12px' }} />
          <h2>{erro || 'Documento não encontrado'}</h2>
          <p>Este documento pode ter sido removido ou desativado.</p>
        </div>
      </div>
    );
  }

  const dataFormatada = doc.atualizado_em || doc.atualizadoEm
    ? new Date(doc.atualizado_em || doc.atualizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={styles.publicContainer}>
      <div className={styles.publicCard}>
        <h1 className={styles.publicTitulo}>{doc.titulo}</h1>
        <div className={styles.publicMeta}>
          {dataFormatada && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> Atualizado em {dataFormatada}
            </span>
          )}
        </div>

        {/* ─── Conteúdo texto ─── */}
        {doc.conteudo && (
          <div className={styles.publicConteudo}>{doc.conteudo}</div>
        )}

        {/* ─── Visualização inline do arquivo ─── */}
        {doc.arquivo_url && fileType === 'pdf' && (
          <div className={styles.inlineViewer}>
            <div className={styles.inlineViewerHeader}>
              <Eye size={16} />
              <span>Visualização do documento</span>
            </div>
            <iframe
              src={`${doc.arquivo_url}#toolbar=0&navpanes=0`}
              className={styles.pdfFrame}
              title={doc.titulo}
            />
          </div>
        )}

        {doc.arquivo_url && fileType === 'image' && (
          <div className={styles.inlineViewer}>
            <div className={styles.inlineViewerHeader}>
              <Eye size={16} />
              <span>Visualização</span>
            </div>
            <img
              src={doc.arquivo_url}
              alt={doc.titulo}
              className={styles.inlineImage}
            />
          </div>
        )}

        {/* ─── Área de download no final ─── */}
        {doc.arquivo_url && (
          <div className={styles.downloadSection}>
            <div className={styles.downloadInfo}>
              <FileText size={20} />
              <div>
                <div className={styles.downloadFileName}>{doc.arquivo_nome || 'Documento'}</div>
                <div className={styles.downloadHint}>Precisa salvar? Baixe o arquivo para o seu dispositivo.</div>
              </div>
            </div>
            <a
              href={doc.arquivo_url}
              download={doc.arquivo_nome || true}
              className={styles.downloadBtn}
            >
              <Download size={16} />
              Baixar
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerDocumentoPage;
