import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Building2, Calendar, Check, CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react';
import type { ChecklistLimpeza } from '../../types';
import { publicApi } from '../../services/api';
import styles from './PublicExecution.module.css';

type LoadState = 'loading' | 'ready' | 'error' | 'saving' | 'saved';

const PublicChecklistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [checklist, setChecklist] = useState<ChecklistLimpeza | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setState('error');
      setError('Checklist não informado.');
      return;
    }

    publicApi.getChecklist(id)
      .then(data => {
        setChecklist(data as ChecklistLimpeza);
        setState('ready');
      })
      .catch(err => {
        setError(err.message || 'Não foi possível carregar este checklist.');
        setState('error');
      });
  }, [id]);

  const concluidoCount = useMemo(() => checklist?.itens.filter(item => item.concluido).length || 0, [checklist]);

  const toggleItem = async (itemId: string) => {
    if (!checklist || state === 'saving') return;
    const itensAtualizados = checklist.itens.map(item => item.id === itemId ? { ...item, concluido: !item.concluido } : item);
    const todosConcluidos = itensAtualizados.every(item => item.concluido);
    const algumConcluido = itensAtualizados.some(item => item.concluido);
    const status = todosConcluidos ? 'concluido' : algumConcluido ? 'em_andamento' : 'pendente';

    setChecklist({ ...checklist, itens: itensAtualizados, status });
    setState('saving');

    try {
      await publicApi.updateChecklistItens(checklist.id, { itens: itensAtualizados, status });
      setState('saved');
      window.setTimeout(() => setState(current => current === 'saved' ? 'ready' : current), 1500);
    } catch (err: any) {
      setChecklist(checklist);
      setState('ready');
      setError(err.message || 'Não foi possível atualizar o checklist.');
    }
  };

  if (state === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.stateBlock}>
            <div className={styles.stateIconLoading}><Loader2 size={28} className={styles.spinner} /></div>
            <strong>Carregando checklist...</strong>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error' || !checklist) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.stateBlock}>
            <div className={styles.stateIconError}><AlertTriangle size={28} /></div>
            <strong>Checklist indisponível</strong>
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
          <span className={styles.eyebrow}><ClipboardCheck size={14} /> Checklist público</span>
          <h1 className={styles.title}>{checklist.local}</h1>
          <p className={styles.subtitle}>Marque os itens conforme a execução avança. As alterações são salvas em tempo real.</p>
          <div className={styles.meta}>
            <span className={styles.metaItem}><Building2 size={14} /> {checklist.condominioId}</span>
            <span className={styles.metaItem}><Calendar size={14} /> {checklist.data}</span>
            <span className={`${styles.statusBadge} ${checklist.status === 'concluido' ? styles.statusSuccess : checklist.status === 'em_andamento' ? styles.statusWarning : styles.statusNeutral}`}>
              {checklist.status === 'concluido' ? 'Concluído' : checklist.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
            </span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Itens do checklist</h2>
            <p className={styles.muted}>{concluidoCount} de {checklist.itens.length} item(ns) concluído(s).</p>
            <div className={styles.list}>
              {checklist.itens.map(item => (
                <div key={item.id} className={`${styles.listItem} ${item.concluido ? styles.listItemDone : ''}`}>
                  <button
                    type="button"
                    className={`${styles.checkButton} ${item.concluido ? styles.checkButtonDone : ''}`}
                    onClick={() => toggleItem(item.id)}
                    aria-pressed={item.concluido}
                    aria-label={item.concluido ? `Desmarcar ${item.descricao}` : `Marcar ${item.descricao}`}
                  >
                    {item.concluido && <Check size={14} />}
                  </button>
                  <div className={styles.listContent}>
                    <span className={styles.listTitle}>{item.descricao}</span>
                    <span className={styles.muted}>Item {item.id}</span>
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

export default PublicChecklistPage;