import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Building2, Calendar, CheckCircle2, ClipboardCheck, Loader2, Send, User } from 'lucide-react';
import { publicApi } from '../../services/api';
import styles from './PublicExecution.module.css';

type StatusExecucao = 'realizada' | 'pendente' | 'nao_executada';

interface TarefaPublica {
  id: string;
  titulo: string;
  descricao: string;
  funcionarioNome: string;
  condominio: string;
  bloco: string;
  local: string;
  recorrencia: string;
  prioridade: string;
}

type LoadState = 'loading' | 'ready' | 'sending' | 'success' | 'error';

const PublicTarefaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [tarefa, setTarefa] = useState<TarefaPublica | null>(null);
  const [status, setStatus] = useState<StatusExecucao>('realizada');
  const [observacao, setObservacao] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setState('error');
      setError('Tarefa não informada.');
      return;
    }

    publicApi.getTarefa(id)
      .then(data => {
        setTarefa(data as TarefaPublica);
        setState('ready');
      })
      .catch(err => {
        setError(err.message || 'Não foi possível carregar esta tarefa.');
        setState('error');
      });
  }, [id]);

  const enviarExecucao = async () => {
    if (!tarefa || state === 'sending') return;
    setState('sending');

    try {
      await publicApi.addTarefaExecucao(tarefa.id, {
        status,
        observacao: observacao.trim(),
      });
      setState('success');
    } catch (err: any) {
      setError(err.message || 'Não foi possível registrar a execução.');
      setState('ready');
    }
  };

  if (state === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.stateBlock}>
            <div className={styles.stateIconLoading}><Loader2 size={28} className={styles.spinner} /></div>
            <strong>Carregando tarefa...</strong>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error' || !tarefa) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.stateBlock}>
            <div className={styles.stateIconError}><AlertTriangle size={28} /></div>
            <strong>Tarefa indisponível</strong>
            <p className={styles.subtitle}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.stateBlock}>
            <div className={styles.stateIconOk}><CheckCircle2 size={28} /></div>
            <strong>Execução registrada</strong>
            <p className={styles.subtitle}>O status da tarefa foi salvo com sucesso.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.eyebrow}><ClipboardCheck size={14} /> Tarefa pública</span>
          <h1 className={styles.title}>{tarefa.titulo}</h1>
          <p className={styles.subtitle}>{tarefa.descricao || 'Registre a execução desta tarefa pelo link compartilhado.'}</p>
          <div className={styles.meta}>
            <span className={styles.metaItem}><User size={14} /> {tarefa.funcionarioNome}</span>
            <span className={styles.metaItem}><Building2 size={14} /> {tarefa.condominio}{tarefa.bloco ? ` / ${tarefa.bloco}` : ''}</span>
            {tarefa.local && <span className={styles.metaItem}><Calendar size={14} /> {tarefa.local}</span>}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Status da execução</h2>
            <div className={styles.statusGroup}>
              {(['realizada', 'pendente', 'nao_executada'] as StatusExecucao[]).map(item => (
                <button
                  key={item}
                  type="button"
                  className={`${styles.statusButton} ${status === item ? styles.statusButtonActive : ''}`}
                  onClick={() => setStatus(item)}
                >
                  {item === 'realizada' ? 'Realizada' : item === 'pendente' ? 'Pendente' : 'Não executada'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Observações</h2>
            <textarea
              className={styles.textarea}
              placeholder="Descreva o que foi feito ou o motivo do status informado."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
            />
          </div>

          {error && <div className={`${styles.statusBadge} ${styles.statusDanger}`}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={enviarExecucao} disabled={state === 'sending'}>
              <Send size={16} />
              {state === 'sending' ? 'Enviando...' : 'Registrar execução'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTarefaPage;