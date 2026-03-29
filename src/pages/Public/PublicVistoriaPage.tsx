import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Building2, Calendar, CheckCircle2, ClipboardCheck, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { publicApi } from '../../services/api';
import styles from './PublicExecution.module.css';

interface FotoVistoria {
  id: string;
  url: string;
  descricao: string;
}

interface ItemVistoria {
  id: string;
  local: string;
  descricao: string;
  fotos: FotoVistoria[];
  status: 'pendente' | 'conforme' | 'nao_conforme' | 'atencao';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  observacao: string;
}

interface VistoriaPublica {
  id: string;
  titulo: string;
  condominioId: string;
  condominioNome: string;
  tipo: string;
  data: string;
  responsavelNome: string;
  itens: ItemVistoria[];
  status: 'pendente' | 'em_andamento' | 'concluida';
}

type LoadState = 'loading' | 'ready' | 'error' | 'saving' | 'saved';

const STATUS_LABEL: Record<ItemVistoria['status'], string> = {
  pendente: 'Pendente',
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  atencao: 'Atenção',
};

const PublicVistoriaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [vistoria, setVistoria] = useState<VistoriaPublica | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setState('error');
      setError('Vistoria não informada.');
      return;
    }

    publicApi.getVistoria(id)
      .then(data => {
        setVistoria(data as VistoriaPublica);
        setState('ready');
      })
      .catch(err => {
        setError(err.message || 'Não foi possível carregar esta vistoria.');
        setState('error');
      });
  }, [id]);

  const resumo = useMemo(() => {
    if (!vistoria) return { conformes: 0, total: 0 };
    return {
      conformes: vistoria.itens.filter(item => item.status === 'conforme').length,
      total: vistoria.itens.length,
    };
  }, [vistoria]);

  const updateItemStatus = async (itemId: string, status: ItemVistoria['status']) => {
    if (!vistoria || state === 'saving') return;

    const itens = vistoria.itens.map(item => item.id === itemId ? { ...item, status } : item);
    const todosConcluidos = itens.every(item => item.status !== 'pendente');
    const algumConcluido = itens.some(item => item.status !== 'pendente');
    const statusVistoria = todosConcluidos ? 'concluida' : algumConcluido ? 'em_andamento' : 'pendente';
    const previous = vistoria;

    setVistoria({ ...vistoria, itens, status: statusVistoria });
    setState('saving');

    try {
      await publicApi.updateVistoria(vistoria.id, { itens, status: statusVistoria });
      setState('saved');
      window.setTimeout(() => setState(current => current === 'saved' ? 'ready' : current), 1500);
    } catch (err: any) {
      setVistoria(previous);
      setState('ready');
      setError(err.message || 'Não foi possível atualizar a vistoria.');
    }
  };

  if (state === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.stateBlock}>
            <div className={styles.stateIconLoading}><Loader2 size={28} className={styles.spinner} /></div>
            <strong>Carregando vistoria...</strong>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error' || !vistoria) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.stateBlock}>
            <div className={styles.stateIconError}><AlertTriangle size={28} /></div>
            <strong>Vistoria indisponível</strong>
            <p className={styles.subtitle}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.eyebrow}><ClipboardCheck size={14} /> Vistoria pública</span>
          <h1 className={styles.title}>{vistoria.titulo}</h1>
          <p className={styles.subtitle}>Atualize o status de cada item diretamente pelo link compartilhado.</p>
          <div className={styles.meta}>
            <span className={styles.metaItem}><Building2 size={14} /> {vistoria.condominioNome || vistoria.condominioId}</span>
            <span className={styles.metaItem}><Calendar size={14} /> {vistoria.data}</span>
            <span className={styles.metaItem}><CheckCircle2 size={14} /> {resumo.conformes}/{resumo.total} conformes</span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Itens da vistoria</h2>
            <div className={styles.list}>
              {vistoria.itens.map(item => (
                <div key={item.id} className={styles.listItem}>
                  <div className={styles.listContent}>
                    <span className={styles.listTitle}>{item.local}</span>
                    <span className={styles.listText}>{item.descricao}</span>
                    <span className={styles.muted}>Prioridade: {item.prioridade}</span>
                    {item.fotos.length > 0 && <span className={styles.muted}>{item.fotos.length} foto(s) anexada(s)</span>}
                    <div className={styles.statusGroup}>
                      {(['pendente', 'conforme', 'nao_conforme', 'atencao'] as ItemVistoria['status'][]).map(status => (
                        <button
                          key={status}
                          type="button"
                          className={`${styles.statusButton} ${item.status === status ? styles.statusButtonActive : ''}`}
                          onClick={() => updateItemStatus(item.id, status)}
                        >
                          {status === 'conforme' && <ShieldCheck size={14} />}
                          {status === 'nao_conforme' && <ShieldAlert size={14} />}
                          {status === 'atencao' && <AlertTriangle size={14} />}
                          {status === 'pendente' && <ShieldQuestion size={14} />}
                          {STATUS_LABEL[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {state === 'saved' && (
            <div className={`${styles.statusBadge} ${styles.statusSuccess}`}>
              <CheckCircle2 size={14} /> Atualização salva
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicVistoriaPage;