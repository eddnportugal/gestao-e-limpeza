import React, { useState, useRef, useEffect, useMemo } from 'react';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import Modal from '../../components/Common/Modal';
import HowItWorks from '../../components/Common/HowItWorks';
import { validarImagem } from '../../utils/imageUtils';
import { compartilharConteudo, imprimirElemento, gerarPdfDeElemento } from '../../utils/exportUtils';
import {
  Plus, CalendarClock, Trash2, Save, Edit2, X, Mail, Bell, AlertTriangle,
  Clock, CheckCircle2, FileText, Wrench, Building2, Search, ChevronDown, ChevronUp, BookmarkPlus, ImagePlus
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { vencimentos as vencimentosApi, condominios as condominiosApi } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Pagination from '../../components/Common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import styles from './Vencimentos.module.css';

/* ═══════ types ═══════ */
type TipoVencimento = 'contrato' | 'servico' | 'manutencao';
type StatusVencimento = 'em_dia' | 'proximo' | 'vencido';

interface Aviso {
  id: string;
  tipo: 'dias_antes' | 'data_especifica';
  valor: number;     // dias antes do vencimento
  dataEspecifica?: string;  // ISO date when tipo=data_especifica
  descricao?: string;
  imagens?: string[];  // base64 data URLs
}

interface Vencimento {
  id: string;
  titulo: string;
  tipo: TipoVencimento;
  descricao: string;
  condominioId: string;
  condominioNome?: string;
  dataVencimento: string;       // ISO date
  dataUltimaManutencao?: string; // ISO date
  dataProximaManutencao?: string; // ISO date
  emails: string[];
  avisos: Aviso[];
  qtdNotificacoes: number;       // quantas vezes notificar
  imagens?: string[];             // base64 data URLs
  criadoEm: string;
}



/* ═══════ helpers ═══════ */
const gerarId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function diasRestantes(dataVenc: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVenc); venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoje.getTime()) / 86400000);
}

function statusVencimento(dataVenc: string): StatusVencimento {
  const dias = diasRestantes(dataVenc);
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'proximo';
  return 'em_dia';
}

const TIPO_LABELS: Record<TipoVencimento, string> = { contrato: 'Contrato', servico: 'Serviço', manutencao: 'Manutenção' };
const STATUS_LABELS: Record<StatusVencimento, { texto: string; cor: string; bg: string }> = {
  em_dia: { texto: 'Em dia', cor: '#2e7d32', bg: '#e8f5e9' },
  proximo: { texto: 'Próximo ao vencimento', cor: '#e65100', bg: '#fff3e0' },
  vencido: { texto: 'Vencido', cor: '#c62828', bg: '#ffebee' },
};

function formatarData(iso: string) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

/* ═══════ default form ═══════ */
const formVazio = (): Omit<Vencimento, 'id' | 'criadoEm'> => ({
  titulo: '', tipo: 'contrato', descricao: '', condominioId: '',
  dataVencimento: '', dataUltimaManutencao: '', dataProximaManutencao: '',
  emails: [], avisos: [], qtdNotificacoes: 1, imagens: [],
});

/* ═══════ Component ═══════ */
const VencimentosPage: React.FC = () => {
  const { tentarAcao } = useDemo();
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [condominiosList, setCondominiosList] = useState<{id:string;nome:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(formVazio());
  const [emailInput, setEmailInput] = useState('');
  const [emailsSalvos, setEmailsSalvos] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      vencimentosApi.list(),
      vencimentosApi.getEmails().catch(() => []),
      condominiosApi.list().catch(() => []),
    ]).then(([vencs, emails, conds]) => {
      setVencimentos(vencs as Vencimento[]);
      const listaEmails = Array.isArray(emails) ? emails : (emails as any)?.emails ?? [];
      setEmailsSalvos(listaEmails);
      setCondominiosList((conds as any[]).map(c => ({ id: c.id, nome: c.nome })));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);
  const [filtroTipo, setFiltroTipo] = useState<TipoVencimento | 'todos'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusVencimento | 'todos'>('todos');
  const [filtroCondominio, setFiltroCondominio] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);



  /* ── modal open/close ── */
  const abrirNovo = () => {
    if (!tentarAcao()) return;
    setForm({ ...formVazio(), condominioId: condominiosList[0]?.id || '' });
    setEditandoId(null);
    setEmailInput('');
    setModalAberto(true);
  };
  const abrirEditar = (v: Vencimento) => {
    if (!tentarAcao()) return;
    setForm({ titulo: v.titulo, tipo: v.tipo, descricao: v.descricao, condominioId: v.condominioId, dataVencimento: v.dataVencimento, dataUltimaManutencao: v.dataUltimaManutencao || '', dataProximaManutencao: v.dataProximaManutencao || '', emails: [...v.emails], avisos: v.avisos.map(a => ({ ...a })), qtdNotificacoes: v.qtdNotificacoes, imagens: [...(v.imagens || [])] });
    setEditandoId(v.id); setEmailInput(''); setModalAberto(true);
  };
  const fecharModal = () => { setModalAberto(false); setEditandoId(null); };

  /* ── imagens do vencimento ── */
  const handleImagemVencimento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const erro = validarImagem(file);
    if (erro) { alert(erro); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setForm(p => ({ ...p, imagens: [...(p.imagens || []), url] }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const removerImagemVencimento = (idx: number) => {
    setForm(p => ({ ...p, imagens: (p.imagens || []).filter((_, i) => i !== idx) }));
  };

  /* ── emails ── */
  const adicionarEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (form.emails.includes(e)) return;
    setForm(p => ({ ...p, emails: [...p.emails, e] }));
    // auto-salvar no banco de e-mails
    if (!emailsSalvos.includes(e)) {
      const novos = [...emailsSalvos, e];
      setEmailsSalvos(novos);
      vencimentosApi.setEmails(novos).catch(console.error);
    }
    setEmailInput('');
  };
  const removerEmail = (email: string) => setForm(p => ({ ...p, emails: p.emails.filter(e => e !== email) }));
  const selecionarEmailSalvo = (e: string) => {
    if (!e || form.emails.includes(e)) return;
    setForm(p => ({ ...p, emails: [...p.emails, e] }));
  };
  const removerEmailSalvo = (email: string) => {
    const novos = emailsSalvos.filter(e => e !== email);
    setEmailsSalvos(novos);
    vencimentosApi.setEmails(novos).catch(console.error);
  };

  /* ── avisos ── */
  const adicionarAviso = () => {
    if (form.avisos.length >= 3) return;
    setForm(p => ({ ...p, avisos: [...p.avisos, { id: gerarId(), tipo: 'dias_antes', valor: 7 }] }));
  };
  const atualizarAviso = (id: string, campo: Partial<Aviso>) => {
    setForm(p => ({ ...p, avisos: p.avisos.map(a => a.id === id ? { ...a, ...campo } : a) }));
  };
  const removerAviso = (id: string) => setForm(p => ({ ...p, avisos: p.avisos.filter(a => a.id !== id) }));

  const handleImagemAviso = (avisoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const erro = validarImagem(file);
    if (erro) { alert(erro); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setForm(p => ({ ...p, avisos: p.avisos.map(a =>
        a.id === avisoId ? { ...a, imagens: [...(a.imagens || []), url] } : a
      ) }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const removerImagemAviso = (avisoId: string, idx: number) => {
    setForm(p => ({ ...p, avisos: p.avisos.map(a =>
      a.id === avisoId ? { ...a, imagens: (a.imagens || []).filter((_, i) => i !== idx) } : a
    ) }));
  };

  /* ── save ── */
  const salvar = async () => {
    if (!form.titulo.trim() || !form.dataVencimento || !form.condominioId) return;
    try {
      if (editandoId) {
        await vencimentosApi.update(editandoId, form);
        setVencimentos(prev => prev.map(v => v.id === editandoId ? { ...v, ...form } : v));
      } else {
        const criado = await vencimentosApi.create(form) as Vencimento;
        setVencimentos(prev => [...prev, criado]);
      }
      fecharModal();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar vencimento. Tente recarregar a página (Ctrl+Shift+R).');
    }
  };

  /* ── delete ── */
  const excluir = async (id: string) => {
    if (!tentarAcao()) return;
    try {
      await vencimentosApi.remove(id);
      setVencimentos(prev => prev.filter(v => v.id !== id));
    } catch (err) { console.error(err); }
  };

  /* ── filter ── */
  const vencimentosFiltrados = useMemo(() => {
    return vencimentos.filter(v => {
      if (filtroCondominio !== 'todos' && v.condominioId !== filtroCondominio) return false;
      if (filtroTipo !== 'todos' && v.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'todos' && statusVencimento(v.dataVencimento) !== filtroStatus) return false;
      if (filtroDataInicio && v.dataVencimento < filtroDataInicio) return false;
      if (filtroDataFim && v.dataVencimento > filtroDataFim) return false;
      if (busca) {
        const b = busca.toLowerCase();
        return v.titulo.toLowerCase().includes(b) || (v.condominioNome || '').toLowerCase().includes(b) || v.descricao.toLowerCase().includes(b);
      }
      return true;
    }).sort((a, b) => diasRestantes(a.dataVencimento) - diasRestantes(b.dataVencimento));
  }, [busca, filtroCondominio, filtroDataFim, filtroDataInicio, filtroStatus, filtroTipo, vencimentos]);

  /* ── stats ── */
  const totalVencidos = vencimentosFiltrados.filter(v => statusVencimento(v.dataVencimento) === 'vencido').length;
  const totalProximos = vencimentosFiltrados.filter(v => statusVencimento(v.dataVencimento) === 'proximo').length;
  const totalEmDia = vencimentosFiltrados.filter(v => statusVencimento(v.dataVencimento) === 'em_dia').length;

  /* ── export ── */
  const handleCompartilhar = () => compartilharConteudo('Agenda de Vencimentos', `Total: ${vencimentosFiltrados.length} vencimentos cadastrados.\nVencidos: ${totalVencidos}\nPróximos: ${totalProximos}\nEm dia: ${totalEmDia}`);
  const handleImprimir = () => printRef.current && imprimirElemento(printRef.current);
  const handlePdf = () => printRef.current && gerarPdfDeElemento(printRef.current, 'agenda-vencimentos');

  const pag = usePagination(vencimentosFiltrados, { pageSize: 15 });

  if (loading) return <LoadingSpinner texto="Carregando vencimentos..." />;

  return (
    <div className={styles.page}>
      <PageHeader
        titulo="Agenda de Vencimentos"
        subtitulo="Controle de contratos, serviços e manutenções"
        acoes={<button className={styles.btnNovo} onClick={abrirNovo}><Plus size={18} /> Novo Vencimento</button>}
        onCompartilhar={handleCompartilhar}
        onImprimir={handleImprimir}
        onGerarPdf={handlePdf}
      />

      <HowItWorks
        titulo="Como funciona a Agenda de Vencimentos"
        descricao="Cadastre vencimentos de contratos, serviços e manutenções. Configure alertas por e-mail para ser notificado antes dos prazos."
        passos={[
          'Cadastre um vencimento com título, tipo, datas e descrição',
          'Adicione e-mails para receber notificações automáticas',
          'Configure até 3 avisos com dias de antecedência ou datas específicas',
          'Acompanhe no painel quais itens estão próximos ou vencidos',
        ]}
      />

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <Card padding="md">
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statVencido}`}><AlertTriangle size={22} /></div>
            <div><span className={styles.statNum}>{totalVencidos}</span><span className={styles.statLabel}>Vencidos</span></div>
          </div>
        </Card>
        <Card padding="md">
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statProximo}`}><Clock size={22} /></div>
            <div><span className={styles.statNum}>{totalProximos}</span><span className={styles.statLabel}>Próximos</span></div>
          </div>
        </Card>
        <Card padding="md">
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statEmDia}`}><CheckCircle2 size={22} /></div>
            <div><span className={styles.statNum}>{totalEmDia}</span><span className={styles.statLabel}>Em dia</span></div>
          </div>
        </Card>
      </div>

      {/* ── Filtros ── */}
      <div className={styles.filtros}>
        <div className={styles.filtroSearch}>
          <Search size={16} />
          <input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className={styles.filtroInput} />
        </div>
        <select className={styles.filtroSelect} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}>
          <option value="todos">Todos os tipos</option>
          <option value="contrato">Contrato</option>
          <option value="servico">Serviço</option>
          <option value="manutencao">Manutenção</option>
        </select>
        <select className={styles.filtroSelect} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}>
          <option value="todos">Todos os status</option>
          <option value="vencido">Vencidos</option>
          <option value="proximo">Próximos</option>
          <option value="em_dia">Em dia</option>
        </select>
        <select className={styles.filtroSelect} value={filtroCondominio} onChange={e => setFiltroCondominio(e.target.value)}>
          <option value="todos">Todos os condomínios</option>
          {condominiosList.map(condominio => <option key={condominio.id} value={condominio.id}>{condominio.nome}</option>)}
        </select>
        <input type="date" className={styles.filtroDate} value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
        <input type="date" className={styles.filtroDate} value={filtroDataFim} min={filtroDataInicio || undefined} onChange={e => setFiltroDataFim(e.target.value)} />
      </div>

      {/* ── Lista ── */}
      <div className={styles.lista} ref={printRef}>
        {vencimentosFiltrados.length === 0 && (
          <Card padding="lg">
            <div className={styles.vazio}>
              <CalendarClock size={48} strokeWidth={1.2} />
              <h3>Nenhum vencimento encontrado</h3>
              <p>Cadastre contratos, serviços ou manutenções para acompanhar seus prazos.</p>
              <button className={styles.btnNovo} onClick={abrirNovo}><Plus size={18} /> Cadastrar Vencimento</button>
            </div>
          </Card>
        )}

        {pag.items.map(v => {
          const dias = diasRestantes(v.dataVencimento);
          const st = statusVencimento(v.dataVencimento);
          const stInfo = STATUS_LABELS[st];
          const isExpanded = expandido === v.id;
          return (
            <Card key={v.id} padding="md" hover>
              <div className={styles.vencCard}>
                <div className={styles.vencTop}>
                  <div className={styles.vencTipo}>
                    {v.tipo === 'contrato' && <FileText size={16} />}
                    {v.tipo === 'servico' && <Wrench size={16} />}
                    {v.tipo === 'manutencao' && <Building2 size={16} />}
                    <span>{TIPO_LABELS[v.tipo]}</span>
                  </div>
                  <span className={styles.statusBadge} style={{ background: stInfo.bg, color: stInfo.cor }}>{stInfo.texto}</span>
                </div>

                <h3 className={styles.vencTitulo}>{v.titulo}</h3>
                {v.condominioNome && <p className={styles.vencCond}>{v.condominioNome}</p>}

                <div className={styles.vencDatas}>
                  <div className={styles.vencDataItem}>
                    <span className={styles.vencDataLabel}>Vencimento</span>
                    <span className={styles.vencDataValor}>{formatarData(v.dataVencimento)}</span>
                  </div>
                  <div className={styles.vencDataItem}>
                    <span className={styles.vencDataLabel}>Dias</span>
                    <span className={`${styles.vencDias} ${styles[`dias_${st}`]}`}>
                      {dias === 0 ? 'Vence hoje' : dias > 0 ? `${dias} dia${dias > 1 ? 's' : ''} restante${dias > 1 ? 's' : ''}` : `${Math.abs(dias)} dia${Math.abs(dias) > 1 ? 's' : ''} vencido${Math.abs(dias) > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>

                {v.tipo === 'manutencao' && (
                  <div className={styles.vencDatas}>
                    {v.dataUltimaManutencao && (
                      <div className={styles.vencDataItem}>
                        <span className={styles.vencDataLabel}>Última Manutenção</span>
                        <span className={styles.vencDataValor}>{formatarData(v.dataUltimaManutencao)}</span>
                      </div>
                    )}
                    {v.dataProximaManutencao && (
                      <div className={styles.vencDataItem}>
                        <span className={styles.vencDataLabel}>Próxima Manutenção</span>
                        <span className={styles.vencDataValor}>{formatarData(v.dataProximaManutencao)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.vencMeta}>
                  <span className={styles.metaItem}><Mail size={13} /> {v.emails.length} e-mail{v.emails.length !== 1 ? 's' : ''}</span>
                  <span className={styles.metaItem}><Bell size={13} /> {v.avisos.length} aviso{v.avisos.length !== 1 ? 's' : ''}</span>
                  <span className={styles.metaItem}><CalendarClock size={13} /> {v.qtdNotificacoes}x notificação</span>
                </div>

                <button className={styles.expandBtn} onClick={() => setExpandido(isExpanded ? null : v.id)}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {isExpanded ? 'Menos detalhes' : 'Mais detalhes'}
                </button>

                {isExpanded && (
                  <div className={styles.detalhes}>
                    {v.descricao && <p className={styles.detalheDesc}>{v.descricao}</p>}

                    {v.emails.length > 0 && (
                      <div className={styles.detalheSecao}>
                        <h4><Mail size={14} /> E-mails para notificação</h4>
                        <div className={styles.emailTags}>
                          {v.emails.map(e => <span key={e} className={styles.emailTag}>{e}</span>)}
                        </div>
                      </div>
                    )}

                    {v.avisos.length > 0 && (
                      <div className={styles.detalheSecao}>
                        <h4><Bell size={14} /> Avisos configurados</h4>
                        <ul className={styles.avisoLista}>
                          {v.avisos.map(a => (
                            <li key={a.id}>
                              {a.tipo === 'dias_antes'
                                ? `${a.valor} dia${a.valor > 1 ? 's' : ''} antes do vencimento`
                                : `Data específica: ${formatarData(a.dataEspecifica || '')}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.vencActions}>
                  <button className={styles.btnEditar} onClick={() => abrirEditar(v)}><Edit2 size={15} /> Editar</button>
                  <button className={styles.btnExcluir} onClick={() => excluir(v.id)}><Trash2 size={15} /> Excluir</button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Pagination page={pag.page} totalPages={pag.totalPages} totalItems={pag.totalItems} pageSize={pag.pageSize} onPageChange={pag.goToPage} hasNext={pag.hasNext} hasPrev={pag.hasPrev} />

      {/* ═══ Modal ═══ */}
      <Modal aberto={modalAberto} onFechar={fecharModal} titulo={editandoId ? 'Editar Vencimento' : 'Novo Vencimento'} largura="lg">
        <div className={styles.modalForm}>
          {/* tipo + titulo */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tipo *</label>
              <select className={styles.formSelect} value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoVencimento }))}>
                <option value="contrato">Contrato</option>
                <option value="servico">Serviço</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label className={styles.formLabel}>Título *</label>
              <input className={styles.formInput} placeholder="Ex: Contrato de manutenção do elevador" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
          </div>

          {/* condominio + desc */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Condomínio</label>
            <select className={styles.formSelect} value={form.condominioId} onChange={e => setForm(p => ({ ...p, condominioId: e.target.value }))}>
              <option value="">Selecione o condomínio</option>
              {condominiosList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {/* Galeria de imagens */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}><ImagePlus size={15} /> Imagens</label>
            <div className={styles.avisoGaleria}>
              {(form.imagens || []).map((img, idx) => (
                <div key={idx} className={styles.avisoGaleriaItem}>
                  <img src={img} alt={`Imagem ${idx + 1}`} className={styles.avisoGaleriaImg} />
                  <button type="button" className={styles.avisoGaleriaRemover} onClick={() => removerImagemVencimento(idx)}><X size={12} /></button>
                </div>
              ))}
              <label className={styles.avisoGaleriaAdd}>
                <ImagePlus size={18} />
                <span>Adicionar</span>
                <input type="file" accept="image/*" hidden onChange={handleImagemVencimento} />
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Descrição</label>
            <textarea className={styles.formTextarea} rows={3} placeholder="Detalhes sobre este vencimento..." value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
          </div>

          {/* datas */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Data de Vencimento *</label>
              <input type="date" className={styles.formInput} value={form.dataVencimento} onChange={e => setForm(p => ({ ...p, dataVencimento: e.target.value }))} />
            </div>
            {form.tipo === 'manutencao' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Última Manutenção</label>
                  <input type="date" className={styles.formInput} value={form.dataUltimaManutencao} onChange={e => setForm(p => ({ ...p, dataUltimaManutencao: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Próxima Manutenção</label>
                  <input type="date" className={styles.formInput} value={form.dataProximaManutencao} onChange={e => setForm(p => ({ ...p, dataProximaManutencao: e.target.value }))} />
                </div>
              </>
            )}
          </div>

          {/* ── Seção E-mails ── */}
          <div className={styles.secao}>
            <h4 className={styles.secaoTitulo}><Mail size={16} /> E-mails para Notificação</h4>

            {/* Selecionar e-mail salvo */}
            {emailsSalvos.length > 0 && (
              <div className={styles.emailSalvos}>
                <label className={styles.formLabel}>E-mails salvos</label>
                <div className={styles.emailSalvosLista}>
                  {emailsSalvos.map(e => (
                    <div key={e} className={styles.emailSalvoItem}>
                      <button
                        type="button"
                        className={`${styles.emailSalvoBtn} ${form.emails.includes(e) ? styles.emailSalvoBtnAtivo : ''}`}
                        onClick={() => selecionarEmailSalvo(e)}
                        disabled={form.emails.includes(e)}
                      >
                        <Mail size={12} /> {e}
                        {form.emails.includes(e) && <CheckCircle2 size={12} />}
                      </button>
                      <button className={styles.emailSalvoRemover} onClick={() => removerEmailSalvo(e)} title="Remover dos salvos"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adicionar novo e-mail */}
            <div className={styles.emailAdd}>
              <input className={styles.formInput} placeholder="email@exemplo.com" type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionarEmail())} />
              <button type="button" className={styles.btnAdd} onClick={adicionarEmail}><Plus size={16} /> Adicionar</button>
            </div>
            <p className={styles.formHint}><BookmarkPlus size={12} /> E-mails adicionados são salvos automaticamente para uso futuro</p>

            {form.emails.length > 0 && (
              <div className={styles.emailTags}>
                {form.emails.map(e => (
                  <span key={e} className={styles.emailTag}>
                    {e}
                    <button className={styles.emailRemove} onClick={() => removerEmail(e)}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Seção Avisos ── */}
          <div className={styles.secao}>
            <div className={styles.secaoHeader}>
              <h4 className={styles.secaoTitulo}><Bell size={16} /> Avisos de Vencimento</h4>
              {form.avisos.length < 3 && (
                <button type="button" className={styles.btnAddSmall} onClick={adicionarAviso}><Plus size={14} /> Aviso</button>
              )}
            </div>
            <p className={styles.secaoDesc}>Configure até 3 avisos para ser notificado antes do prazo.</p>
            {form.avisos.map((a, i) => (
              <div key={a.id} className={styles.avisoBlock}>
                <div className={styles.avisoRow}>
                  <span className={styles.avisoNum}>Aviso {i + 1}</span>
                  <select className={styles.formSelect} value={a.tipo} onChange={e => atualizarAviso(a.id, { tipo: e.target.value as Aviso['tipo'] })}>
                    <option value="dias_antes">Dias antes</option>
                    <option value="data_especifica">Data específica</option>
                  </select>
                  {a.tipo === 'dias_antes' ? (
                    <div className={styles.avisoInputWrap}>
                      <input type="number" className={styles.formInput} min={1} max={365} value={a.valor} onChange={e => atualizarAviso(a.id, { valor: parseInt(e.target.value) || 1 })} />
                      <span className={styles.avisoSuffix}>dias</span>
                    </div>
                  ) : (
                    <input type="date" className={styles.formInput} value={a.dataEspecifica || ''} onChange={e => atualizarAviso(a.id, { dataEspecifica: e.target.value })} />
                  )}
                  <button className={styles.btnRemoveAviso} onClick={() => removerAviso(a.id)}><Trash2 size={14} /></button>
                </div>
                <input
                  type="text"
                  className={`${styles.formInput} ${styles.avisoDescricao}`}
                  placeholder="Descrição do aviso (opcional)"
                  value={a.descricao || ''}
                  onChange={e => atualizarAviso(a.id, { descricao: e.target.value })}
                />
              </div>
            ))}
          </div>

          {/* ── Qtd notificações ── */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Quantidade de notificações por aviso</label>
            <input type="number" className={styles.formInput} min={1} max={10} value={form.qtdNotificacoes} onChange={e => setForm(p => ({ ...p, qtdNotificacoes: parseInt(e.target.value) || 1 }))} style={{ maxWidth: 120 }} />
            <span className={styles.formHint}>Quantas vezes cada aviso será enviado por e-mail</span>
          </div>

          <button className={styles.btnSalvar} onClick={salvar} disabled={!form.titulo.trim() || !form.dataVencimento}>
            <Save size={18} /> {editandoId ? 'Salvar Alterações' : 'Cadastrar Vencimento'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default VencimentosPage;
