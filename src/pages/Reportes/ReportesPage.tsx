import React, { useState, useEffect, useMemo } from 'react';
import HowItWorks from '../../components/Common/HowItWorks';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import StatusBadge from '../../components/Common/StatusBadge';
import Modal from '../../components/Common/Modal';
import { compartilharConteudo, imprimirElemento, gerarPdfDeElemento } from '../../utils/exportUtils';
import { Search, Hash, AlertTriangle, Clock, Filter, Eye, Image, X, Camera, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { reportes as reportesApi, antesDepois as antesDepoisApi } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Pagination from '../../components/Common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import styles from './Reportes.module.css';

interface Reporte {
  id: string;
  protocolo: string;
  itemDesc: string;
  checklistId: string;
  descricao: string;
  status: string;
  prioridade: string;
  imagens: string[];
  data: string;
}

interface AntesDepoisRecord {
  id: string;
  checklistId: string;
  itemId: string;
  itemDesc: string;
  fotoAntes: string | null;
  descAntes: string | null;
  fotoDepois: string | null;
  descDepois: string | null;
  condominioNome: string;
  criadoPorNome: string;
  criadoEm: string;
}

const STATUS_MAP: Record<string, { texto: string; variante: 'sucesso' | 'aviso' | 'perigo' | 'info' | 'neutro' }> = {
  aberto: { texto: 'Aberto', variante: 'perigo' },
  em_analise: { texto: 'Em Análise', variante: 'aviso' },
  resolvido: { texto: 'Resolvido', variante: 'sucesso' },
};

const PRIORIDADE_MAP: Record<string, { texto: string; cor: string }> = {
  baixa: { texto: 'Baixa', cor: '#4caf50' },
  media: { texto: 'Média', cor: '#ff9800' },
  alta: { texto: 'Alta', cor: '#f44336' },
  urgente: { texto: 'Urgente', cor: '#d32f2f' },
};

const CORES_CHART = ['#ef4444', '#f59e0b', '#22c55e'];

const ReportesPage: React.FC = () => {
  const { tentarAcao } = useDemo();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [antesDepoisList, setAntesDepoisList] = useState<AntesDepoisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'reportes' | 'antes-depois'>('reportes');

  useEffect(() => {
    Promise.all([
      reportesApi.list(),
      antesDepoisApi.list().catch(() => []),
    ]).then(([reps, ads]) => {
      setReportes(reps as Reporte[]);
      setAntesDepoisList(ads as AntesDepoisRecord[]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [detalheModal, setDetalheModal] = useState<Reporte | null>(null);
  const [imagemModal, setImagemModal] = useState<string | null>(null);
  const [adDetalhe, setAdDetalhe] = useState<AntesDepoisRecord | null>(null);

  // Busca inteligente por coincidência
  const filtrados = useMemo(() => {
    let lista = reportes;

    if (filtroStatus !== 'todos') {
      lista = lista.filter(r => r.status === filtroStatus);
    }
    if (filtroPrioridade !== 'todos') {
      lista = lista.filter(r => r.prioridade === filtroPrioridade);
    }

    if (busca.trim()) {
      const termos = busca.toLowerCase().split(/\s+/);
      lista = lista.filter(r => {
        const campos = [
          r.protocolo,
          r.itemDesc,
          r.checklistId,
          r.descricao,
          STATUS_MAP[r.status]?.texto || r.status,
          PRIORIDADE_MAP[r.prioridade]?.texto || r.prioridade,
          new Date(r.data).toLocaleDateString('pt-BR'),
        ].join(' ').toLowerCase();
        return termos.every(t => campos.includes(t));
      });
    }

    return lista;
  }, [reportes, busca, filtroStatus, filtroPrioridade]);

  // Dados para gráficos
  const statusChart = useMemo(() => [
    { nome: 'Abertos', valor: reportes.filter(r => r.status === 'aberto').length },
    { nome: 'Em Análise', valor: reportes.filter(r => r.status === 'em_analise').length },
    { nome: 'Resolvidos', valor: reportes.filter(r => r.status === 'resolvido').length },
  ], [reportes]);

  const prioridadeChart = useMemo(() => [
    { nome: 'Baixa', valor: reportes.filter(r => r.prioridade === 'baixa').length },
    { nome: 'Média', valor: reportes.filter(r => r.prioridade === 'media').length },
    { nome: 'Alta', valor: reportes.filter(r => r.prioridade === 'alta').length },
    { nome: 'Urgente', valor: reportes.filter(r => r.prioridade === 'urgente').length },
  ], [reportes]);

  const atualizarStatus = async (protocolo: string, novoStatus: string) => {
    if (!tentarAcao()) return;
    const reporte = reportes.find(r => r.protocolo === protocolo);
    if (!reporte) return;
    try {
      await reportesApi.updateStatus(reporte.id, novoStatus);
      setReportes(prev => prev.map(r => r.protocolo === protocolo ? { ...r, status: novoStatus } : r));
      if (detalheModal?.protocolo === protocolo) {
        setDetalheModal({ ...detalheModal, status: novoStatus });
      }
    } catch (err) { console.error(err); }
  };

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const pag = usePagination(filtrados, { pageSize: 15 });

  const excluirAntesDepois = async (id: string) => {
    if (!tentarAcao()) return;
    if (!confirm('Excluir este registro de antes/depois?')) return;
    try {
      await antesDepoisApi.remove(id);
      setAntesDepoisList(prev => prev.filter(a => a.id !== id));
    } catch { alert('Erro ao excluir'); }
  };

  if (loading) return <LoadingSpinner texto="Carregando reportes..." />;

  return (
    <div id="reportes-content">
      <HowItWorks
        titulo="Central de Reportes"
        descricao="Visualize e gerencie todos os problemas reportados nos checklists. Busque por protocolo, status, prioridade ou qualquer informação."
        passos={[
          'Todos os problemas reportados nos checklists aparecem aqui automaticamente',
          'Use a busca inteligente para encontrar por protocolo, item, status ou prioridade',
          'Filtre por status e prioridade usando os filtros rápidos',
          'Clique em "Ver" para abrir os detalhes completos do reporte',
          'Atualize o status diretamente pela lista ou pelo modal de detalhes',
        ]}
      />

      <PageHeader
        titulo="Central de Reportes"
        subtitulo={`${reportes.length} reportes · ${antesDepoisList.length} antes/depois`}
        onCompartilhar={() => compartilharConteudo('Reportes', 'Central de Reportes')}
        onImprimir={() => imprimirElemento('reportes-content')}
        onGerarPdf={() => gerarPdfDeElemento('reportes-content', 'reportes')}
      />

      {/* Abas */}
      <div className={styles.abas}>
        <button className={`${styles.aba} ${abaAtiva === 'reportes' ? styles.abaAtiva : ''}`} onClick={() => setAbaAtiva('reportes')}>
          <AlertTriangle size={16} /> Reportes ({reportes.length})
        </button>
        <button className={`${styles.aba} ${abaAtiva === 'antes-depois' ? styles.abaAtiva : ''}`} onClick={() => setAbaAtiva('antes-depois')}>
          <Camera size={16} /> Antes / Depois ({antesDepoisList.length})
        </button>
      </div>

      {/* Cards resumo */}
      {abaAtiva === 'reportes' && (<>
      <div className={styles.resumoGrid}>
        <div className={`${styles.resumoCard} ${styles.resumoTotal}`}>
          <Hash size={22} />
          <div>
            <span className={styles.resumoNum}>{reportes.length}</span>
            <span className={styles.resumoLabel}>Total</span>
          </div>
        </div>
        <div className={`${styles.resumoCard} ${styles.resumoAberto}`}>
          <AlertTriangle size={22} />
          <div>
            <span className={styles.resumoNum}>{reportes.filter(r => r.status === 'aberto').length}</span>
            <span className={styles.resumoLabel}>Abertos</span>
          </div>
        </div>
        <div className={`${styles.resumoCard} ${styles.resumoAnalise}`}>
          <Clock size={22} />
          <div>
            <span className={styles.resumoNum}>{reportes.filter(r => r.status === 'em_analise').length}</span>
            <span className={styles.resumoLabel}>Em Análise</span>
          </div>
        </div>
        <div className={`${styles.resumoCard} ${styles.resumoResolvido}`}>
          <Eye size={22} />
          <div>
            <span className={styles.resumoNum}>{reportes.filter(r => r.status === 'resolvido').length}</span>
            <span className={styles.resumoLabel}>Resolvidos</span>
          </div>
        </div>
      </div>

      {/* Busca e filtros */}
      <Card padding="md">
        <div className={styles.buscaArea}>
          <div className={styles.buscaInput}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por protocolo, item, descrição, status, prioridade..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            {busca && (
              <button className={styles.buscaLimpar} onClick={() => setBusca('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className={styles.filtrosRow}>
            <div className={styles.filtroGrupo}>
              <Filter size={14} />
              <label>Status:</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="aberto">Aberto</option>
                <option value="em_analise">Em Análise</option>
                <option value="resolvido">Resolvido</option>
              </select>
            </div>
            <div className={styles.filtroGrupo}>
              <Filter size={14} />
              <label>Prioridade:</label>
              <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)}>
                <option value="todos">Todas</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <span className={styles.resultCount}>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </Card>

      {/* Lista de reportes */}
      <div className={styles.lista}>
        {filtrados.length === 0 ? (
          <Card padding="md">
            <div className={styles.vazio}>
              <AlertTriangle size={40} />
              <p>{reportes.length === 0 ? 'Nenhum reporte registrado ainda.' : 'Nenhum reporte encontrado com os filtros aplicados.'}</p>
              {busca && <span>Tente buscar por outro termo.</span>}
            </div>
          </Card>
        ) : (
          pag.items.map(r => {
            const st = STATUS_MAP[r.status] || { texto: r.status, variante: 'neutro' as const };
            const pr = PRIORIDADE_MAP[r.prioridade] || { texto: r.prioridade, cor: '#9e9e9e' };
            return (
              <Card key={r.protocolo} hover padding="md">
                <div className={styles.reporteCard}>
                  <div className={styles.reporteTop}>
                    <div className={styles.reporteProtocolo}>
                      <Hash size={14} />
                      <span>{r.protocolo}</span>
                    </div>
                    <div className={styles.reporteBadges}>
                      <span className={styles.prioridadeBadge} style={{ background: pr.cor + '18', color: pr.cor, borderColor: pr.cor + '40' }}>
                        {pr.texto}
                      </span>
                      <StatusBadge texto={st.texto} variante={st.variante} />
                    </div>
                  </div>

                  <h4 className={styles.reporteItem}>{r.itemDesc}</h4>

                  <div className={styles.reporteMeta}>
                    <span>Checklist: <strong>{r.checklistId}</strong></span>
                    <span>{formatarData(r.data)}</span>
                    {r.imagens.length > 0 && (
                      <span className={styles.reporteFotos}><Image size={13} /> {r.imagens.length} foto{r.imagens.length > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {r.descricao && (
                    <p className={styles.reporteDesc}>{r.descricao.length > 120 ? r.descricao.slice(0, 120) + '...' : r.descricao}</p>
                  )}

                  <div className={styles.reporteAcoes}>
                    <select
                      className={styles.statusSelect}
                      value={r.status}
                      onChange={e => atualizarStatus(r.protocolo, e.target.value)}
                    >
                      <option value="aberto">Aberto</option>
                      <option value="em_analise">Em Análise</option>
                      <option value="resolvido">Resolvido</option>
                    </select>
                    <button className={styles.verBtn} onClick={() => setDetalheModal(r)}>
                      <Eye size={15} /> Ver Detalhes
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <Pagination page={pag.page} totalPages={pag.totalPages} totalItems={pag.totalItems} pageSize={pag.pageSize} onPageChange={pag.goToPage} hasNext={pag.hasNext} hasPrev={pag.hasPrev} />

      {/* Gráficos */}
      {reportes.length > 0 && (
        <div className={styles.chartsGrid}>
          <Card padding="md">
            <h3 className={styles.chartTitulo}>Por Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChart} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="valor" nameKey="nome" label>
                  {statusChart.map((_, i) => <Cell key={i} fill={CORES_CHART[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card padding="md">
            <h3 className={styles.chartTitulo}>Por Prioridade</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={prioridadeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cor-borda)" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="valor" fill="var(--cor-primaria)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      </>)}

      {/* Aba Antes/Depois */}
      {abaAtiva === 'antes-depois' && (
        <div className={styles.lista}>
          {antesDepoisList.length === 0 ? (
            <Card padding="md">
              <div className={styles.vazio}>
                <Camera size={40} />
                <p>Nenhum registro de antes/depois ainda.</p>
                <span>Use o botão ⋮ nos itens do checklist para registrar.</span>
              </div>
            </Card>
          ) : antesDepoisList.map(ad => (
            <Card key={ad.id} hover padding="md">
              <div className={styles.reporteCard}>
                <div className={styles.reporteTop}>
                  <h4 className={styles.reporteItem}>{ad.itemDesc || 'Item sem descrição'}</h4>
                  <div className={styles.reporteBadges}>
                    <span className={styles.prioridadeBadge} style={{ background: '#2196f318', color: '#2196f3', borderColor: '#2196f340' }}>Antes/Depois</span>
                  </div>
                </div>
                <div className={styles.reporteMeta}>
                  <span>{ad.condominioNome}</span>
                  <span>{ad.criadoPorNome}</span>
                  <span>{formatarData(ad.criadoEm)}</span>
                  <span className={styles.reporteFotos}>
                    <Image size={13} /> {[ad.fotoAntes, ad.fotoDepois].filter(Boolean).length} foto(s)
                  </span>
                </div>
                <div className={styles.adPreviewRow}>
                  {ad.fotoAntes && (
                    <div className={styles.adPreviewCol}>
                      <span className={styles.adPreviewLabel}>Antes</span>
                      <button className={styles.imagemPreview} onClick={() => setImagemModal(ad.fotoAntes)}>
                        <img src={ad.fotoAntes} alt="Antes" />
                      </button>
                      {ad.descAntes && <p className={styles.adPreviewDesc}>{ad.descAntes}</p>}
                    </div>
                  )}
                  {ad.fotoDepois && (
                    <div className={styles.adPreviewCol}>
                      <span className={styles.adPreviewLabel}>Depois</span>
                      <button className={styles.imagemPreview} onClick={() => setImagemModal(ad.fotoDepois)}>
                        <img src={ad.fotoDepois} alt="Depois" />
                      </button>
                      {ad.descDepois && <p className={styles.adPreviewDesc}>{ad.descDepois}</p>}
                    </div>
                  )}
                </div>
                <div className={styles.reporteAcoes}>
                  <button className={styles.verBtn} onClick={() => setAdDetalhe(ad)}>
                    <Eye size={15} /> Ver Detalhes
                  </button>
                  <button className={styles.verBtn} style={{ color: '#ef4444' }} onClick={() => excluirAntesDepois(ad.id)}>
                    <Trash2 size={15} /> Excluir
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Detalhe Antes/Depois */}
      <Modal aberto={!!adDetalhe} onFechar={() => setAdDetalhe(null)} titulo="Antes e Depois" largura="lg">
        {adDetalhe && (
          <div className={styles.detalheContent}>
            <div className={styles.detalheInfo}>
              <div className={styles.detalheRow}>
                <label>Item:</label>
                <strong>{adDetalhe.itemDesc}</strong>
              </div>
              <div className={styles.detalheRow}>
                <label>Condomínio:</label>
                <span>{adDetalhe.condominioNome}</span>
              </div>
              <div className={styles.detalheRow}>
                <label>Registrado por:</label>
                <span>{adDetalhe.criadoPorNome}</span>
              </div>
              <div className={styles.detalheRow}>
                <label>Data:</label>
                <span>{formatarData(adDetalhe.criadoEm)}</span>
              </div>
            </div>
            <div className={styles.adPreviewRow} style={{ marginTop: 16 }}>
              <div className={styles.adPreviewCol}>
                <span className={styles.adPreviewLabel} style={{ background: '#ef444418', color: '#ef4444' }}>ANTES</span>
                {adDetalhe.fotoAntes ? (
                  <button className={styles.imagemPreview} onClick={() => setImagemModal(adDetalhe.fotoAntes)}>
                    <img src={adDetalhe.fotoAntes} alt="Antes" />
                  </button>
                ) : <p style={{ color: 'var(--cor-texto-fraco)', fontSize: 13 }}>Sem foto</p>}
                {adDetalhe.descAntes && <p className={styles.adPreviewDesc}>{adDetalhe.descAntes}</p>}
              </div>
              <div className={styles.adPreviewCol}>
                <span className={styles.adPreviewLabel} style={{ background: '#22c55e18', color: '#22c55e' }}>DEPOIS</span>
                {adDetalhe.fotoDepois ? (
                  <button className={styles.imagemPreview} onClick={() => setImagemModal(adDetalhe.fotoDepois)}>
                    <img src={adDetalhe.fotoDepois} alt="Depois" />
                  </button>
                ) : <p style={{ color: 'var(--cor-texto-fraco)', fontSize: 13 }}>Sem foto</p>}
                {adDetalhe.descDepois && <p className={styles.adPreviewDesc}>{adDetalhe.descDepois}</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal aberto={!!detalheModal} onFechar={() => setDetalheModal(null)} titulo="Detalhes do Reporte" largura="md">
        {detalheModal && (
          <div className={styles.detalheContent}>
            <div className={styles.detalheProtocolo}>
              <Hash size={16} />
              <span>{detalheModal.protocolo}</span>
            </div>

            <div className={styles.detalheInfo}>
              <div className={styles.detalheRow}>
                <label>Item:</label>
                <strong>{detalheModal.itemDesc}</strong>
              </div>
              <div className={styles.detalheRow}>
                <label>Checklist:</label>
                <span>{detalheModal.checklistId}</span>
              </div>
              <div className={styles.detalheRow}>
                <label>Data:</label>
                <span>{formatarData(detalheModal.data)}</span>
              </div>
              <div className={styles.detalheRow}>
                <label>Prioridade:</label>
                <span className={styles.prioridadeBadge} style={{
                  background: (PRIORIDADE_MAP[detalheModal.prioridade]?.cor || '#999') + '18',
                  color: PRIORIDADE_MAP[detalheModal.prioridade]?.cor || '#999',
                  borderColor: (PRIORIDADE_MAP[detalheModal.prioridade]?.cor || '#999') + '40',
                }}>
                  {PRIORIDADE_MAP[detalheModal.prioridade]?.texto || detalheModal.prioridade}
                </span>
              </div>
              <div className={styles.detalheRow}>
                <label>Status:</label>
                <select
                  className={styles.statusSelect}
                  value={detalheModal.status}
                  onChange={e => atualizarStatus(detalheModal.protocolo, e.target.value)}
                >
                  <option value="aberto">Aberto</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="resolvido">Resolvido</option>
                </select>
              </div>
            </div>

            {detalheModal.descricao && (
              <div className={styles.detalheDescricao}>
                <label>Descrição:</label>
                <p>{detalheModal.descricao}</p>
              </div>
            )}

            {detalheModal.imagens.length > 0 && (
              <div className={styles.detalheImagens}>
                <label>Imagens ({detalheModal.imagens.length}):</label>
                <div className={styles.imagensGrid}>
                  {detalheModal.imagens.map((img, i) => (
                    <button key={i} className={styles.imagemPreview} onClick={() => setImagemModal(img)}>
                      <img src={img} alt={`Imagem ${i + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Imagem Ampliada */}
      <Modal aberto={!!imagemModal} onFechar={() => setImagemModal(null)} titulo="Imagem" largura="lg">
        {imagemModal && (
          <div className={styles.imagemFull}>
            <img src={imagemModal} alt="Imagem ampliada" />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportesPage;
