import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import HowItWorks from '../../components/Common/HowItWorks';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import StatusBadge from '../../components/Common/StatusBadge';
import Modal from '../../components/Common/Modal';
import ShareLinkModal from '../../components/Common/ShareLinkModal';
import { validarImagem } from '../../utils/imageUtils';
import { compartilharConteudo, imprimirElemento, gerarPdfDeElemento } from '../../utils/exportUtils';
import { buildPublicShareUrl } from '../../utils/shareLinks';
import type { ChecklistLimpeza } from '../../types';
import { Plus, CheckCircle2, ClipboardCheck, MoreVertical, AlertTriangle, Camera, X, Upload, ChevronRight, MessageCircle, Settings, Save, Trash2, Hash, Search, Minus, Share2, Pencil } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { checklists as checklistsApi, reportes as reportesApi, moradores as moradoresApi, condominios as condominiosApi, antesDepois as antesDepoisApi, usuarios as usuariosApi } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import EmptyState from '../../components/Common/EmptyState';
import Pagination from '../../components/Common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import styles from './Checklists.module.css';

interface ProblemaReport {
  itemId: string;
  checklistId: string;
  descricao: string;
  status: string;
  prioridade: string;
  imagens: string[];
}

interface AntesDepois {
  itemId: string;
  checklistId: string;
  fotoAntes: string | null;
  descAntes: string;
  fotoDepois: string | null;
  descDepois: string;
}

interface ContatoWhats {
  id: string;
  nome: string;
  telefone: string;
}

interface FuncionarioChecklist {
  id: string;
  nome: string;
  condominioId?: string;
  role?: string;
  ativo?: boolean;
}

function nomeCondominio(condominios: { id: string; nome: string }[], condominioId?: string): string {
  if (!condominioId) return 'Sem condomínio';
  return condominios.find(condominio => condominio.id === condominioId)?.nome || condominioId;
}

function gerarProtocolo(): string {
  const agora = new Date();
  const ano = agora.getFullYear().toString().slice(2);
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `RPT-${ano}${mes}${dia}-${seq}`;
}

const CORES = ['#2e7d32', '#f57c00', '#9e9e9e'];

type FilterKey = 'todos' | 'pendente' | 'em_andamento' | 'concluido';

const TAB_BASE_CLASS: Record<FilterKey, string> = {
  todos: 'tabTodos', pendente: 'tabPendente', em_andamento: 'tabAndamento', concluido: 'tabConcluido',
};
const TAB_ACTIVE_CLASS: Record<FilterKey, string> = {
  todos: 'tabTodosActive', pendente: 'tabPendenteActive', em_andamento: 'tabAndamentoActive', concluido: 'tabConcluidoActive',
};
const TAB_LABEL: Record<FilterKey, string> = {
  todos: 'Todos', pendente: 'Pendentes', em_andamento: 'Em Andamento', concluido: 'Concluídos',
};
const STATUS_TEXTO: Record<string, string> = {
  concluido: 'Concluído', em_andamento: 'Em Andamento', pendente: 'Pendente',
};
const STATUS_VARIANTE: Record<string, 'sucesso' | 'aviso' | 'neutro'> = {
  concluido: 'sucesso', em_andamento: 'aviso', pendente: 'neutro',
};

function normalizarItensChecklist(itens: string[]): string[] {
  return itens.map(item => item.trim()).filter(Boolean);
}

const ChecklistsPage: React.FC = () => {
  const { usuario } = useAuth();
  const { tentarAcao } = useDemo();
  const [checklists, setChecklists] = useState<ChecklistLimpeza[]>([]);
  const [condominiosList, setCondominiosList] = useState<{id:string;nome:string}[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [filtroCondominioAdmin, setFiltroCondominioAdmin] = useState('todos');
  const [filtroFuncionarioAdmin, setFiltroFuncionarioAdmin] = useState('todos');
  const [shareChecklist, setShareChecklist] = useState<ChecklistLimpeza | null>(null);
  const [checklistEmEdicao, setChecklistEmEdicao] = useState<ChecklistLimpeza | null>(null);

  // Modal Novo Checklist
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [novoLocal, setNovoLocal] = useState('');
  const [novoTipo, setNovoTipo] = useState<'diaria' | 'semanal' | 'mensal' | 'especial'>('diaria');
  const [novoCond, setNovoCond] = useState('');
  const [novoResponsavelId, setNovoResponsavelId] = useState('');
  const [novosItens, setNovosItens] = useState<string[]>(['']);

  const podeEscolherResponsavel = usuario?.role === 'master' || usuario?.role === 'administrador' || usuario?.role === 'supervisor';
  const funcionariosFiltrados = useMemo(() => {
    const base = funcionarios.filter(funcionario => funcionario.ativo !== false && funcionario.role === 'funcionario');
    if (!novoCond) return base;
    const filtrados = base.filter(funcionario => !funcionario.condominioId || funcionario.condominioId === novoCond);
    return filtrados.length > 0 ? filtrados : base;
  }, [funcionarios, novoCond]);

  const funcionariosFiltroAdmin = useMemo(() => {
    const base = funcionarios.filter(funcionario => funcionario.ativo !== false && funcionario.role === 'funcionario');
    if (filtroCondominioAdmin === 'todos') return base;
    const filtrados = base.filter(funcionario => !funcionario.condominioId || funcionario.condominioId === filtroCondominioAdmin);
    return filtrados.length > 0 ? filtrados : base;
  }, [filtroCondominioAdmin, funcionarios]);

  useEffect(() => {
    setFiltroFuncionarioAdmin(prev => prev !== 'todos' && !funcionariosFiltroAdmin.some(funcionario => funcionario.id === prev) ? 'todos' : prev);
  }, [funcionariosFiltroAdmin]);

  useEffect(() => {
    setNovoResponsavelId(prev => {
      if (prev && funcionariosFiltrados.some(funcionario => funcionario.id === prev)) return prev;
      if (!podeEscolherResponsavel) return usuario?.id || '';
      return funcionariosFiltrados[0]?.id || '';
    });
  }, [funcionariosFiltrados, podeEscolherResponsavel, usuario?.id]);

  const adicionarItem = () => setNovosItens(prev => [...prev, '']);
  const removerItem = (idx: number) => setNovosItens(prev => prev.filter((_, i) => i !== idx));
  const atualizarItem = (idx: number, val: string) => setNovosItens(prev => prev.map((v, i) => i === idx ? val : v));

  const resetFormularioChecklist = useCallback(() => {
    setNovoLocal('');
    setNovoTipo('diaria');
    setNovoCond(condominiosList[0]?.id || '');
    setNovoResponsavelId('');
    setNovosItens(['']);
    setChecklistEmEdicao(null);
  }, [condominiosList]);

  const checklistEdicaoAlterada = useMemo(() => {
    if (!checklistEmEdicao) return false;
    return (
      novoLocal.trim() !== checklistEmEdicao.local ||
      novoTipo !== checklistEmEdicao.tipo ||
      novoCond !== checklistEmEdicao.condominioId ||
      novoResponsavelId !== (checklistEmEdicao.responsavelId || '') ||
      JSON.stringify(normalizarItensChecklist(novosItens)) !== JSON.stringify(checklistEmEdicao.itens.map(item => item.descricao.trim()))
    );
  }, [checklistEmEdicao, novoCond, novoLocal, novoResponsavelId, novoTipo, novosItens]);

  const fecharModalChecklist = useCallback(() => {
    if (checklistEmEdicao && checklistEdicaoAlterada && !globalThis.confirm('Descartar as alterações deste checklist?')) {
      return;
    }
    setShowNovoModal(false);
    resetFormularioChecklist();
  }, [checklistEdicaoAlterada, checklistEmEdicao, resetFormularioChecklist]);

  const abrirNovoChecklist = useCallback(() => {
    resetFormularioChecklist();
    setShowNovoModal(true);
  }, [resetFormularioChecklist]);

  const editarChecklist = (checklist: ChecklistLimpeza) => {
    setChecklistEmEdicao(checklist);
    setNovoLocal(checklist.local);
    setNovoTipo(checklist.tipo);
    setNovoCond(checklist.condominioId);
    setNovoResponsavelId(checklist.responsavelId || '');
    setNovosItens(checklist.itens.length > 0 ? checklist.itens.map(item => item.descricao) : ['']);
    setShowNovoModal(true);
  };

  const criarChecklist = async () => {
    if (!tentarAcao()) return;
    if (!novoLocal.trim() || novosItens.every(i => !i.trim())) return;
    if (!novoCond) { alert('Selecione um condomínio'); return; }
    const responsavelId = podeEscolherResponsavel ? novoResponsavelId : (usuario?.id || '');
    if (!responsavelId) { alert('Selecione o funcionário responsável pelo checklist'); return; }
    const itensNormalizados = normalizarItensChecklist(novosItens);
    const payload = {
      condominioId: novoCond,
      local: novoLocal.trim(),
      tipo: novoTipo,
      itens: itensNormalizados.map((desc, idx) => ({ id: String(idx + 1), descricao: desc, concluido: false })),
      responsavelId,
      data: new Date().toISOString().split('T')[0],
      status: 'pendente',
    };
    try {
      if (checklistEmEdicao) {
        const itensAtualizados = itensNormalizados.map((desc, idx) => {
          const existente = checklistEmEdicao.itens[idx];
          return existente
            ? { ...existente, descricao: desc }
            : { id: String(idx + 1), descricao: desc, concluido: false };
        });
        let statusAtualizado: ChecklistLimpeza['status'] = 'pendente';
        if (itensAtualizados.every(item => item.concluido)) {
          statusAtualizado = 'concluido';
        } else if (itensAtualizados.some(item => item.concluido)) {
          statusAtualizado = 'em_andamento';
        }

        await checklistsApi.update(checklistEmEdicao.id, {
          condominioId: novoCond,
          local: novoLocal.trim(),
          tipo: novoTipo,
          itens: itensAtualizados,
          responsavelId,
          data: checklistEmEdicao.data,
          status: statusAtualizado,
        });

        const checklistAtualizado: ChecklistLimpeza = {
          ...checklistEmEdicao,
          condominioId: novoCond,
          local: novoLocal.trim(),
          tipo: novoTipo,
          itens: itensAtualizados,
          responsavelId,
          status: statusAtualizado,
        };
        setChecklists(prev => prev.map(item => item.id === checklistEmEdicao.id ? checklistAtualizado : item));
      } else {
        const criado = await checklistsApi.create(payload) as ChecklistLimpeza;
        setChecklists(prev => [criado, ...prev]);
      }
      resetFormularioChecklist();
      setShowNovoModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar checklist. Tente recarregar a página (Ctrl+Shift+R).');
    }
  };

  const toggleItem = async (ckId: string, itemId: string) => {
    if (!tentarAcao()) return;
    const ck = checklists.find(c => c.id === ckId);
    if (!ck) return;
    const novosItens = ck.itens.map(i =>
      i.id === itemId ? { ...i, concluido: !i.concluido } : i
    );
    const todosConcluidos = novosItens.every(i => i.concluido);
    const algumConcluido = novosItens.some(i => i.concluido);
    const novoStatus = todosConcluidos ? 'concluido' : algumConcluido ? 'em_andamento' : 'pendente';
    setChecklists(prev => prev.map(c =>
      c.id === ckId ? { ...c, itens: novosItens, status: novoStatus as any } : c
    ));
    try {
      await checklistsApi.updateItens(ckId, { itens: novosItens, status: novoStatus });
    } catch (err: any) {
      setChecklists(prev => prev.map(c =>
        c.id === ckId ? { ...c, itens: ck.itens, status: ck.status } : c
      ));
      alert(err.message || 'Erro ao atualizar item');
    }
  };

  // Ações modal (2 opções: Reportar Problema + Antes/Depois)
  const [acoesModal, setAcoesModal] = useState<{ ckId: string; itemId: string; itemDesc: string } | null>(null);

  // Reportar Problema
  const [problemaModal, setProblemaModal] = useState<{ ckId: string; itemId: string; itemDesc: string } | null>(null);
  const [problema, setProblema] = useState<ProblemaReport>({ itemId: '', checklistId: '', descricao: '', status: 'aberto', prioridade: 'media', imagens: [] });
  const [protocolo, setProtocolo] = useState('');
  const problemaInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Contatos
  const [contatosWhats, setContatosWhats] = useState<ContatoWhats[]>([]);
  const [contatoSelecionado, setContatoSelecionado] = useState<string>('');
  const [whatsNome, setWhatsNome] = useState('');
  const [whatsTelefone, setWhatsTelefone] = useState('');
  const [showWhatsConfig, setShowWhatsConfig] = useState(false);

  useEffect(() => {
    Promise.all([
      checklistsApi.list(),
      moradoresApi.listWhatsContatos().catch(() => []),
      condominiosApi.list().catch(() => []),
      usuariosApi.list().catch(() => []),
    ]).then(([cks, contatos, conds, usrs]) => {
      setChecklists(cks as ChecklistLimpeza[]);
      setContatosWhats(contatos as ContatoWhats[]);
      if ((contatos as ContatoWhats[]).length > 0) setContatoSelecionado((contatos as ContatoWhats[])[0].id);
      const lista = (conds as any[]).map(c => ({ id: c.id, nome: c.nome }));
      setCondominiosList(lista);
      if (lista.length > 0) setNovoCond(lista[0].id);
      setFuncionarios((usrs as FuncionarioChecklist[]) || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const salvarNovoContato = async () => {
    if (!whatsNome.trim() || !whatsTelefone.trim()) return;
    try {
      const novo = await moradoresApi.addWhatsContato({ nome: whatsNome.trim(), telefone: whatsTelefone.trim() }) as ContatoWhats;
      setContatosWhats(prev => [...prev, novo]);
      if (!contatoSelecionado) setContatoSelecionado(novo.id);
    } catch (err) { console.error(err); }
    setWhatsNome('');
    setWhatsTelefone('');
  };

  const removerContato = async (id: string) => {
    try {
      await moradoresApi.removeWhatsContato(id);
      setContatosWhats(prev => prev.filter(c => c.id !== id));
      if (contatoSelecionado === id) setContatoSelecionado(contatosWhats.find(c => c.id !== id)?.id || '');
    } catch (err) { console.error(err); }
  };

  const formatarTelefone = (value: string) => {
    let v = value.replaceAll(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    return v;
  };

  // Antes/Depois
  const [antesDepoisModal, setAntesDepoisModal] = useState<{ ckId: string; itemId: string; itemDesc: string } | null>(null);
  const [antesDepois, setAntesDepois] = useState<AntesDepois>({ itemId: '', checklistId: '', fotoAntes: null, descAntes: '', fotoDepois: null, descDepois: '' });
  const antesInputRef = useRef<HTMLInputElement>(null);
  const depoisInputRef = useRef<HTMLInputElement>(null);

  const enviarReporte = async () => {
    if (!tentarAcao()) return;
    const ckReporte = checklists.find(c => c.id === problema.checklistId);
    const reporte = {
      protocolo,
      condominioId: ckReporte?.condominioId || '',
      itemDesc: problemaModal?.itemDesc || '',
      checklistId: problema.checklistId,
      descricao: problema.descricao,
      status: problema.status,
      prioridade: problema.prioridade,
      imagens: problema.imagens,
      data: new Date().toISOString(),
    };
    try {
      await reportesApi.create(reporte);
    } catch { /* ignore */ }
    alert('Problema reportado com sucesso! Protocolo: ' + protocolo);
    setProblemaModal(null);
  };

  const abrirAcoes = (ckId: string, itemId: string, itemDesc: string) => {
    setAcoesModal({ ckId, itemId, itemDesc });
  };

  const abrirProblema = () => {
    if (!acoesModal) return;
    setProblema({ itemId: acoesModal.itemId, checklistId: acoesModal.ckId, descricao: '', status: 'aberto', prioridade: 'media', imagens: [] });
    setProtocolo(gerarProtocolo());
    setProblemaModal({ ...acoesModal });
    setAcoesModal(null);
  };

  const abrirAntesDepois = () => {
    if (!acoesModal) return;
    setAntesDepois({ itemId: acoesModal.itemId, checklistId: acoesModal.ckId, fotoAntes: null, descAntes: '', fotoDepois: null, descDepois: '' });
    setAntesDepoisModal({ ...acoesModal });
    setAcoesModal(null);
  };

  const addImagemProblema = (result: string) => {
    setProblema(prev => ({ ...prev, imagens: [...prev.imagens, result] }));
  };

  const handleImagemProblema = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const erro = validarImagem(file);
      if (erro) { alert(erro); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) addImagemProblema(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removerImagemProblema = (idx: number) => {
    setProblema(prev => ({ ...prev, imagens: prev.imagens.filter((_, i) => i !== idx) }));
  };

  const setFotoResult = (tipo: 'antes' | 'depois', result: string) => {
    const key = tipo === 'antes' ? 'fotoAntes' : 'fotoDepois';
    setAntesDepois(prev => ({ ...prev, [key]: result }));
  };

  const handleFoto = (tipo: 'antes' | 'depois', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const erro = validarImagem(file);
    if (erro) { alert(erro); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setFotoResult(tipo, ev.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const checklistsVisiveis = useMemo(() => {
    if (podeEscolherResponsavel) return checklists;
    return checklists.filter(checklist => {
      if (usuario?.id && checklist.responsavelId === usuario.id) return true;
      return false;
    });
  }, [checklists, podeEscolherResponsavel, usuario?.id]);

  const filtered = checklistsVisiveis.filter(c => {
    if (podeEscolherResponsavel && filtroCondominioAdmin !== 'todos' && c.condominioId !== filtroCondominioAdmin) return false;
    if (podeEscolherResponsavel && filtroFuncionarioAdmin !== 'todos' && c.responsavelId !== filtroFuncionarioAdmin) return false;
    if (filtro !== 'todos' && c.status !== filtro) return false;
    if (busca.trim()) {
      const termos = busca.toLowerCase().split(/\s+/);
      const responsavelNome = funcionarios.find(funcionario => funcionario.id === c.responsavelId)?.nome || '';
      const condominioNome = nomeCondominio(condominiosList, c.condominioId);
      const texto = `${c.local} ${c.tipo} ${c.id} ${responsavelNome} ${condominioNome} ${c.itens.map(i => i.descricao).join(' ')}`.toLowerCase();
      return termos.every(t => texto.includes(t));
    }
    return true;
  });

  const pag = usePagination(filtered, { pageSize: 15 });

  if (loading) return <LoadingSpinner texto="Carregando checklists..." />;

  return (
    <div id="checklists-content">
      <HowItWorks
        titulo="Checklists de Limpeza"
        descricao="Crie e gerencie checklists para controle de qualidade da limpeza em cada área do condomínio."
        passos={[
          'Crie um novo checklist definindo o local e tipo (diário, semanal, mensal)',
          'Adicione os itens a serem verificados',
          'Atribua o responsável pelo checklist',
          'O funcionário marca cada item conforme vai concluindo',
          'Clique no ícone de ações para reportar problemas ou registrar fotos antes/depois',
          'Ao concluir, o checklist fica registrado no histórico',
        ]}
      />

      <PageHeader
        titulo="Checklists de Limpeza"
        subtitulo={`${filtered.length} checklists`}
        onCompartilhar={() => compartilharConteudo('Checklists', 'Listagem de checklists')}
        onImprimir={() => imprimirElemento('checklists-content')}
        onGerarPdf={() => gerarPdfDeElemento('checklists-content', 'checklists')}
        acoes={
          <button className={styles.addBtn} onClick={abrirNovoChecklist}>
            <Plus size={18} /> <span>Novo Checklist</span>
          </button>
        }
      />

      <div className={styles.buscaArea}>
        <Search size={18} className={styles.buscaIcon} />
        <input
          type="text"
          className={styles.buscaInput}
          placeholder="Buscar checklists por local, tipo, item..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        {busca && (
          <button className={styles.buscaLimpar} onClick={() => setBusca('')}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.filters}>
        {podeEscolherResponsavel && (
          <>
            <select className={styles.formSelect} style={{ minWidth: 220 }} value={filtroCondominioAdmin} onChange={e => setFiltroCondominioAdmin(e.target.value)}>
              <option value="todos">Todos os Condomínios</option>
              {condominiosList.map(condominio => <option key={condominio.id} value={condominio.id}>{condominio.nome}</option>)}
            </select>
            <select className={styles.formSelect} style={{ minWidth: 240 }} value={filtroFuncionarioAdmin} onChange={e => setFiltroFuncionarioAdmin(e.target.value)}>
              <option value="todos">Todos os Funcionários</option>
              {funcionariosFiltroAdmin.map(funcionario => (
                <option key={funcionario.id} value={funcionario.id}>{funcionario.nome} {`(${nomeCondominio(condominiosList, funcionario.condominioId)})`}</option>
              ))}
            </select>
          </>
        )}
        {(['todos', 'pendente', 'em_andamento', 'concluido'] as const).map(f => (
            <button
              key={f}
              className={`${styles.filterTab} ${styles[TAB_BASE_CLASS[f]]} ${filtro === f ? styles[TAB_ACTIVE_CLASS[f]] : ''}`}
              onClick={() => setFiltro(f)}
            >
              {TAB_LABEL[f]}
            </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={48} strokeWidth={1.5} />}
            titulo="Nenhum checklist encontrado"
            descricao="Crie um checklist para começar a acompanhar a limpeza."
          />
        ) : pag.items.map(ck => {
          const concluidos = ck.itens.filter(i => i.concluido).length;
          const total = ck.itens.length;
          const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
          return (
            <Card key={ck.id} hover padding="md">
              <div className={styles.ckCard}>
                <div className={styles.ckTop}>
                  <div className={styles.ckId}>{ck.id}</div>
                  <StatusBadge
                    texto={STATUS_TEXTO[ck.status] || 'Pendente'}
                    variante={STATUS_VARIANTE[ck.status] || 'neutro'}
                  />
                </div>
                <h4 className={styles.ckLocal}>{ck.local}</h4>
                <span className={styles.ckTipo}>{ck.tipo.charAt(0).toUpperCase() + ck.tipo.slice(1)}</span>

                <div className={styles.progress}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.progressText}>{concluidos}/{total} ({pct}%)</span>
                </div>

                <div className={styles.cardActions}>
                  <button className={styles.shareButton} onClick={() => setShareChecklist(ck)}>
                    <Share2 size={14} /> Compartilhar link / QR
                  </button>
                  {podeEscolherResponsavel && (
                    <button className={styles.editButton} onClick={() => editarChecklist(ck)}>
                      <Pencil size={14} /> Editar
                    </button>
                  )}
                </div>

                <div className={styles.itemsList}>
                  {ck.itens.map(item => (
                    <div key={item.id} className={`${styles.item} ${item.concluido ? styles.itemDone : ''}`}>
                      <div className={styles.itemCheck} role="button" tabIndex={0} onClick={() => toggleItem(ck.id, item.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(ck.id, item.id); } }} style={{ cursor: 'pointer' }}>
                        {item.concluido ? <CheckCircle2 size={16} color="#2e7d32" /> : <div className={styles.unchecked} />}
                      </div>
                      <span className={styles.itemText}>{item.descricao}</span>
                      <button
                        className={styles.itemAction}
                        onClick={() => abrirAcoes(ck.id, item.id, item.descricao)}
                        title="Ações"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Pagination page={pag.page} totalPages={pag.totalPages} totalItems={pag.totalItems} pageSize={pag.pageSize} onPageChange={pag.goToPage} hasNext={pag.hasNext} hasPrev={pag.hasPrev} />

      <div style={{ marginTop: '1cm' }}>
        <Card padding="md">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cor-texto)', margin: '0 0 20px' }}>Status dos Checklists</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={[
                { nome: 'Concluídos', valor: checklistsVisiveis.filter(c => c.status === 'concluido').length || 0 },
                { nome: 'Em Andamento', valor: checklistsVisiveis.filter(c => c.status === 'em_andamento').length || 0 },
                { nome: 'Pendentes', valor: checklistsVisiveis.filter(c => c.status === 'pendente').length || 0 },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="valor" nameKey="nome" label>
                {[0, 1, 2].map(i => <Cell key={i} fill={CORES[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ===== MODAL AÇÕES (2 opções) ===== */}
      <Modal aberto={!!acoesModal} onFechar={() => setAcoesModal(null)} titulo="Ações do Item" largura="sm">
        <p className={styles.modalItemDesc}>{acoesModal?.itemDesc}</p>
        <div className={styles.acoesGrid}>
          <button className={styles.acaoCard} onClick={abrirProblema}>
            <div className={styles.acaoIcone} style={{ background: '#fff3e0', color: '#e65100' }}>
              <AlertTriangle size={26} />
            </div>
            <div className={styles.acaoTextos}>
              <strong>Reportar um Problema</strong>
              <span>Adicione fotos, descrição, status e prioridade do problema encontrado</span>
            </div>
            <ChevronRight size={18} className={styles.acaoSeta} />
          </button>
          <button className={styles.acaoCard} onClick={abrirAntesDepois}>
            <div className={styles.acaoIcone} style={{ background: '#e8f5e9', color: '#2e7d32' }}>
              <Camera size={26} />
            </div>
            <div className={styles.acaoTextos}>
              <strong>Antes e Depois</strong>
              <span>Registre fotos com descrição do antes e depois da execução</span>
            </div>
            <ChevronRight size={18} className={styles.acaoSeta} />
          </button>
        </div>
      </Modal>

      <ShareLinkModal
        aberto={!!shareChecklist}
        onFechar={() => setShareChecklist(null)}
        titulo={shareChecklist ? `Checklist: ${shareChecklist.local}` : 'Checklist'}
        descricao="Compartilhe este link ou QR Code para permitir a execução pública deste checklist."
        url={shareChecklist ? buildPublicShareUrl('checklist', shareChecklist.id) : ''}
      />

      {/* ===== MODAL REPORTAR PROBLEMA ===== */}
      <Modal aberto={!!problemaModal} onFechar={() => setProblemaModal(null)} titulo="Reportar Problema" largura="md">
        <div className={styles.problemaForm}>
          <div className={styles.protocoloHeader}>
            <div className={styles.protocoloTag}>
              <Hash size={14} />
              <span>{protocolo}</span>
            </div>
          </div>
          <p className={styles.modalItemDesc}>Item: <strong>{problemaModal?.itemDesc}</strong></p>

          <span className={styles.formLabel}>Imagens</span>
          <div className={styles.imagensArea}>
            {problema.imagens.map((img, i) => (
              <div key={`img-${img.slice(-20)}`} className={styles.imagemThumb}>
                <img src={img} alt={`Imagem ${i + 1}`} />
                <button className={styles.imagemRemover} onClick={() => removerImagemProblema(i)}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button className={styles.imagemAdd} onClick={() => problemaInputRef.current?.click()}>
              <Upload size={20} />
              <span>Adicionar</span>
            </button>
            <input ref={problemaInputRef} type="file" accept="image/*" multiple hidden onChange={handleImagemProblema} />
          </div>

          <label htmlFor="prob-descricao" className={styles.formLabel}>Descrição do Problema</label>
          <textarea
            id="prob-descricao"
            className={styles.formTextarea}
            placeholder="Descreva o problema encontrado..."
            value={problema.descricao}
            onChange={e => setProblema(prev => ({ ...prev, descricao: e.target.value }))}
            rows={4}
          />

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="prob-status" className={styles.formLabel}>Status</label>
              <select id="prob-status" className={styles.formSelect} value={problema.status} onChange={e => setProblema(prev => ({ ...prev, status: e.target.value }))}>
                <option value="aberto">Aberto</option>
                <option value="em_analise">Em Análise</option>
                <option value="resolvido">Resolvido</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="prob-prioridade" className={styles.formLabel}>Prioridade</label>
              <select id="prob-prioridade" className={styles.formSelect} value={problema.prioridade} onChange={e => setProblema(prev => ({ ...prev, prioridade: e.target.value }))}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <button className={styles.formSubmit} onClick={enviarReporte}>
            <AlertTriangle size={16} /> Enviar Reporte
          </button>

          <div className={styles.whatsSection}>
            <div className={styles.whatsHeader}>
              <button
                className={styles.whatsBtn}
                onClick={() => {
                  const contato = contatosWhats.find(c => c.id === contatoSelecionado);
                  if (!contato) { setShowWhatsConfig(true); return; }
                  const num = contato.telefone.replaceAll(/\D/g, '');
                  const texto = encodeURIComponent(`*Problema Reportado*\n*Protocolo:* ${protocolo}\n\n*Item:* ${problemaModal?.itemDesc}\n*Descrição:* ${problema.descricao || 'N/A'}\n*Status:* ${problema.status}\n*Prioridade:* ${problema.prioridade}\n*Enviado para:* ${contato.nome}`);
                  window.open(`https://wa.me/55${num}?text=${texto}`, '_blank');
                }}
              >
                <MessageCircle size={18} /> Enviar para WhatsApp
              </button>
              <button
                className={`${styles.whatsConfigBtn} ${showWhatsConfig ? styles.whatsConfigBtnActive : ''}`}
                onClick={() => setShowWhatsConfig(prev => !prev)}
                title="Configurar Contatos"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Dropdown de contatos salvos */}
            {contatosWhats.length > 0 && (
              <div className={styles.whatsContatoSelect}>
                <label htmlFor="whats-contato" className={styles.formLabel}>Enviar para:</label>
                <select
                  id="whats-contato"
                  className={styles.formSelect}
                  value={contatoSelecionado}
                  onChange={e => setContatoSelecionado(e.target.value)}
                >
                  {contatosWhats.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} — {c.telefone}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Painel de config para adicionar/remover contatos */}
            {showWhatsConfig && (
              <div className={styles.whatsConfigPanel}>
                <h5 className={styles.whatsConfigTitle}>Adicionar Contato</h5>
                <div className={styles.whatsConfigFields}>
                  <div className={styles.formGroup}>
                    <label htmlFor="whats-nome" className={styles.formLabel}>Nome</label>
                    <input
                      id="whats-nome"
                      className={styles.formInput}
                      placeholder="Nome do contato"
                      value={whatsNome}
                      onChange={e => setWhatsNome(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="whats-telefone" className={styles.formLabel}>WhatsApp</label>
                    <input
                      id="whats-telefone"
                      className={styles.formInput}
                      placeholder="(00) 00000-0000"
                      value={whatsTelefone}
                      maxLength={15}
                      onChange={e => setWhatsTelefone(formatarTelefone(e.target.value))}
                    />
                  </div>
                  <button className={styles.whatsSaveBtn} onClick={salvarNovoContato}>
                    <Save size={15} /> Salvar
                  </button>
                </div>

                {/* Lista de contatos salvos */}
                {contatosWhats.length > 0 && (
                  <div className={styles.whatsContatosList}>
                    <h5 className={styles.whatsConfigTitle}>Contatos Salvos</h5>
                    {contatosWhats.map((c, i) => (
                      <div key={c.id} className={styles.whatsContatoItem}>
                        <div className={styles.whatsContatoInfo}>
                          <strong>{c.nome}</strong>
                          <span>{c.telefone}</span>
                          {i === 0 && <span className={styles.whatsContatoBadge}>Padrão</span>}
                        </div>
                        <button className={styles.whatsContatoRemover} onClick={() => removerContato(c.id)} title="Remover">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ===== MODAL ANTES E DEPOIS ===== */}
      <Modal aberto={!!antesDepoisModal} onFechar={() => setAntesDepoisModal(null)} titulo="Antes e Depois" largura="lg">
        <div className={styles.antesDepoisForm}>
          <p className={styles.modalItemDesc}>Item: <strong>{antesDepoisModal?.itemDesc}</strong></p>

          <div className={styles.antesDepoisGrid}>
            {/* ANTES */}
            <div className={styles.adColuna}>
              <h4 className={styles.adTitulo}>
                <span className={styles.adBadgeAntes}>ANTES</span>
              </h4>
              {antesDepois.fotoAntes ? (
                <div className={styles.adFotoContainer}>
                  <img src={antesDepois.fotoAntes} alt="Antes" className={styles.adFoto} />
                  <button className={styles.adFotoRemover} onClick={() => setAntesDepois(prev => ({ ...prev, fotoAntes: null }))}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button className={styles.adUploadArea} onClick={() => antesInputRef.current?.click()}>
                  <Camera size={32} />
                  <span>Tirar / Selecionar Foto</span>
                </button>
              )}
              <input ref={antesInputRef} type="file" accept="image/*" hidden onChange={e => handleFoto('antes', e)} />
              <textarea
                className={styles.formTextarea}
                placeholder="Descrição do estado antes..."
                value={antesDepois.descAntes}
                onChange={e => setAntesDepois(prev => ({ ...prev, descAntes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* DEPOIS */}
            <div className={styles.adColuna}>
              <h4 className={styles.adTitulo}>
                <span className={styles.adBadgeDepois}>DEPOIS</span>
              </h4>
              {antesDepois.fotoDepois ? (
                <div className={styles.adFotoContainer}>
                  <img src={antesDepois.fotoDepois} alt="Depois" className={styles.adFoto} />
                  <button className={styles.adFotoRemover} onClick={() => setAntesDepois(prev => ({ ...prev, fotoDepois: null }))}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button className={styles.adUploadArea} onClick={() => depoisInputRef.current?.click()}>
                  <Camera size={32} />
                  <span>Tirar / Selecionar Foto</span>
                </button>
              )}
              <input ref={depoisInputRef} type="file" accept="image/*" hidden onChange={e => handleFoto('depois', e)} />
              <textarea
                className={styles.formTextarea}
                placeholder="Descrição do estado depois..."
                value={antesDepois.descDepois}
                onChange={e => setAntesDepois(prev => ({ ...prev, descDepois: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Preview lado a lado quando ambas fotos existem */}
          {antesDepois.fotoAntes && antesDepois.fotoDepois && (
            <div className={styles.adComparacao}>
              <h4 className={styles.adCompTitulo}>Comparação</h4>
              <div className={styles.adCompGrid}>
                <div className={styles.adCompItem}>
                  <span className={styles.adBadgeAntes}>ANTES</span>
                  <img src={antesDepois.fotoAntes} alt="Antes" />
                  <p>{antesDepois.descAntes || 'Sem descrição'}</p>
                </div>
                <div className={styles.adCompItem}>
                  <span className={styles.adBadgeDepois}>DEPOIS</span>
                  <img src={antesDepois.fotoDepois} alt="Depois" />
                  <p>{antesDepois.descDepois || 'Sem descrição'}</p>
                </div>
              </div>
            </div>
          )}

          <button className={styles.formSubmit} onClick={async () => {
            if (!tentarAcao()) return;
            if (!antesDepoisModal) return;
            const ck = checklists.find(c => c.id === antesDepoisModal.ckId);
            try {
              await antesDepoisApi.create({
                condominioId: ck?.condominioId || '',
                checklistId: antesDepoisModal.ckId,
                itemId: antesDepoisModal.itemId,
                itemDesc: antesDepoisModal.itemDesc,
                fotoAntes: antesDepois.fotoAntes,
                descAntes: antesDepois.descAntes,
                fotoDepois: antesDepois.fotoDepois,
                descDepois: antesDepois.descDepois,
              });
              alert('Registro de antes e depois salvo com sucesso!');
              setAntesDepoisModal(null);
            } catch (err: any) {
              alert(err.message || 'Erro ao salvar registro');
            }
          }}>
            <Camera size={16} /> Salvar Registro
          </button>
        </div>
      </Modal>

      {/* Modal Novo Checklist */}
      <Modal aberto={showNovoModal} onFechar={fecharModalChecklist} titulo={checklistEmEdicao ? 'Editar Checklist' : 'Novo Checklist'} largura="md">
        <div className={styles.novoForm}>
          {checklistEmEdicao && (
            <div className={styles.editingBanner}>
              <Pencil size={16} /> Você está editando este checklist. As mudanças substituem o cadastro atual.
            </div>
          )}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="novo-local" className={styles.formLabel}>Local</label>
              <input id="novo-local" className={styles.formInput} placeholder="Ex: Hall de Entrada - Bloco A" value={novoLocal} onChange={e => setNovoLocal(e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="novo-tipo" className={styles.formLabel}>Tipo</label>
              <select id="novo-tipo" className={styles.formSelect} value={novoTipo} onChange={e => setNovoTipo(e.target.value as any)}>
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="especial">Especial</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="novo-cond" className={styles.formLabel}>Condomínio</label>
              <select id="novo-cond" className={styles.formSelect} value={novoCond} onChange={e => setNovoCond(e.target.value)}>
                <option value="">Selecione o condomínio</option>
                {condominiosList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {podeEscolherResponsavel && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="novo-responsavel" className={styles.formLabel}>Funcionário Responsável</label>
                <select
                  id="novo-responsavel"
                  className={styles.formSelect}
                  value={novoResponsavelId}
                  onChange={e => setNovoResponsavelId(e.target.value)}
                  disabled={funcionariosFiltrados.length === 0}
                >
                  <option value="">{funcionariosFiltrados.length === 0 ? 'Nenhum funcionário disponível' : 'Selecione o funcionário'}</option>
                  {funcionariosFiltrados.map(funcionario => (
                    <option key={funcionario.id} value={funcionario.id}>{funcionario.nome} {`(${nomeCondominio(condominiosList, funcionario.condominioId)})`}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <span className={styles.formLabel}>Itens do Checklist</span>
          <div className={styles.itensLista}>
            {novosItens.map((item, idx) => (
              <div key={idx} className={styles.itemRow}>
                <input
                  className={styles.formInput}
                  placeholder={`Item ${idx + 1}`}
                  value={item}
                  onChange={e => atualizarItem(idx, e.target.value)}
                />
                {novosItens.length > 1 && (
                  <button className={styles.itemRemoveBtn} onClick={() => removerItem(idx)}>
                    <Minus size={16} />
                  </button>
                )}
              </div>
            ))}
            <button className={styles.itemAddBtn} onClick={adicionarItem}>
              <Plus size={16} /> Adicionar Item
            </button>
          </div>

          <div className={styles.formActions}>
            <button className={styles.secondaryButton} onClick={fecharModalChecklist}>
              Cancelar
            </button>
            <button className={styles.formSubmit} onClick={criarChecklist}>
              <Plus size={18} /> {checklistEmEdicao ? 'Salvar Alterações' : 'Criar Checklist'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChecklistsPage;
