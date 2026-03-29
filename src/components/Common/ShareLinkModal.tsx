import React, { useMemo, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import Modal from './Modal';
import { copyShareUrl, sharePublicLink } from '../../utils/shareLinks';
import styles from './ShareLinkModal.module.css';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  descricao?: string;
  url: string;
}

const ShareLinkModal: React.FC<Props> = ({ aberto, onFechar, titulo, descricao, url }) => {
  const [copiado, setCopiado] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);

  const qrValue = useMemo(() => url, [url]);

  const handleCopy = async () => {
    await copyShareUrl(url);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  };

  const handleNativeShare = async () => {
    setCompartilhando(true);
    try {
      const usedNativeShare = await sharePublicLink(titulo, url, descricao);
      if (!usedNativeShare) {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 1800);
      }
    } finally {
      setCompartilhando(false);
    }
  };

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Compartilhar acesso" largura="sm">
      <div className={styles.wrapper}>
        <div className={styles.headerBlock}>
          <h4 className={styles.title}>{titulo}</h4>
          {descricao && <p className={styles.description}>{descricao}</p>}
        </div>

        <div className={styles.qrCard}>
          <QRCodeCanvas value={qrValue} size={208} includeMargin bgColor="#ffffff" fgColor="#111827" />
        </div>

        <div className={styles.inputBlock}>
          <label htmlFor="share-link-url" className={styles.label}>Link público</label>
          <input id="share-link-url" className={styles.input} value={url} readOnly onFocus={e => e.target.select()} />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryAction} onClick={handleCopy}>
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
          <button type="button" className={styles.secondaryAction} onClick={handleNativeShare} disabled={compartilhando}>
            <Share2 size={16} />
            {compartilhando ? 'Compartilhando...' : 'Compartilhar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareLinkModal;