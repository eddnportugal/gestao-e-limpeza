import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HowItWorks from '../../components/Common/HowItWorks';
import PageHeader from '../../components/Common/PageHeader';
import Card from '../../components/Common/Card';
import { compartilharConteudo, imprimirElemento, gerarPdfDeElemento } from '../../utils/exportUtils';
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, CalendarRange, Building2, Users, Filter } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { relatorios as relatoriosApi } from '../../services/api';
import styles from '../Geolocalizacao/Geolocalizacao.module.css';

const CORES = ['#2e7d32', '#1a73e8', '#f57c00', '#d32f2f', '#9e9e9e'];

const hoje = new Date().toISOString().slice(0, 10);
const inicioPadrao = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

function formatarData(data: string) {
  return data ? new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR') : '—';
}

function formatarStatus(status: string) {
  return status ? status.replaceAll('_', ' ') : '—';
}

const RelatoriosPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>({
    osMensal: [], osPorCondominio: [], custoMensal: [], produtividade: [], satisfacao: [],
    filtros: { condominios: [], funcionarios: [], funcoesSistema: [] }, registros: [], totais: { registros: 0, condominios: 0, funcionarios: 0 },
  });
  const [filtros, setFiltros] = useState({
    dataInicio: inicioPadrao,
    dataFim: hoje,
    condominioId: '',
    funcionario: '',
    funcaoSistema: '',
  });

  const carregarDados = useCallback(async (params: typeof filtros) => {
    setLoading(true);
    try {
      const data = await relatoriosApi.resumo(params);
      setDados(data);
    } catch {
      setDados({
        osMensal: [], osPorCondominio: [], custoMensal: [], produtividade: [], satisfacao: [],
        filtros: { condominios: [], funcionarios: [], funcoesSistema: [] }, registros: [], totais: { registros: 0, condominios: 0, funcionarios: 0 },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados({ dataInicio: inicioPadrao, dataFim: hoje, condominioId: '', funcionario: '', funcaoSistema: '' });
  }, [carregarDados]);

  const cardsResumo = useMemo(() => [
    { titulo: 'Registros', valor: dados.totais?.registros || 0, icone: <BarChart3 size={18} style={{ color: 'var(--cor-primaria)' }} /> },
    { titulo: 'Condomínios', valor: dados.totais?.condominios || 0, icone: <Building2 size={18} style={{ color: 'var(--cor-primaria)' }} /> },
    { titulo: 'Funcionários', valor: dados.totais?.funcionarios || 0, icone: <Users size={18} style={{ color: 'var(--cor-primaria)' }} /> },
    { titulo: 'Período', valor: `${formatarData(filtros.dataInicio)} a ${formatarData(filtros.dataFim)}`, icone: <CalendarRange size={18} style={{ color: 'var(--cor-primaria)' }} /> },
  ], [dados, filtros]);

  const aplicarFiltros = () => {
    carregarDados(filtros);
  };

  const limparFiltros = () => {
    const prox = { dataInicio: inicioPadrao, dataFim: hoje, condominioId: '', funcionario: '', funcaoSistema: '' };
    setFiltros(prox);
    carregarDados(prox);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>;

  return (
    <div id="relatorios-content">
      <HowItWorks
        titulo="Relatórios e Gráficos"
        descricao="Visualize relatórios completos com gráficos de todas as funções do sistema. Analise dados de OS, checklists, materiais, produtividade e satisfação."
        passos={[
          'Selecione o período de análise desejado',
          'Visualize gráficos de barras, linhas, pizza e área',
          'Compare dados entre condomínios e funcionários',
          'Analise tendências de custos e produtividade',
          'Exporte qualquer relatório em PDF ou imprima',
        ]}
      />

      <PageHeader
        titulo="Relatórios"
        subtitulo="Análise completa do sistema"
        onCompartilhar={() => compartilharConteudo('Relatórios', 'Relatórios do sistema Gestão e Limpeza')}
        onImprimir={() => imprimirElemento('relatorios-content')}
        onGerarPdf={() => gerarPdfDeElemento('relatorios-content', 'relatorios')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {cardsResumo.map((card) => (
          <Card key={card.titulo} padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {card.icone}
              <strong>{card.titulo}</strong>
            </div>
            <div style={{ fontSize: typeof card.valor === 'number' ? 28 : 14, fontWeight: 700 }}>{card.valor}</div>
          </Card>
        ))}
      </div>

      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Filter size={18} style={{ color: 'var(--cor-primaria)' }} />
          <h3 className={styles.chartTitle} style={{ margin: 0 }}>Filtros do Relatório</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label htmlFor="relatorio-data-inicio" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Data inicial</label>
            <input id="relatorio-data-inicio" type="date" value={filtros.dataInicio} onChange={(e) => setFiltros((prev) => ({ ...prev, dataInicio: e.target.value }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--cor-borda)' }} />
          </div>
          <div>
            <label htmlFor="relatorio-data-fim" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Data final</label>
            <input id="relatorio-data-fim" type="date" value={filtros.dataFim} onChange={(e) => setFiltros((prev) => ({ ...prev, dataFim: e.target.value }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--cor-borda)' }} />
          </div>
          <div>
            <label htmlFor="relatorio-condominio" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Condomínio</label>
            <select id="relatorio-condominio" value={filtros.condominioId} onChange={(e) => setFiltros((prev) => ({ ...prev, condominioId: e.target.value }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--cor-borda)' }}>
              <option value="">Todos</option>
              {(dados.filtros?.condominios || []).map((cond: any) => <option key={cond.id} value={cond.id}>{cond.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="relatorio-funcionario" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Funcionário</label>
            <select id="relatorio-funcionario" value={filtros.funcionario} onChange={(e) => setFiltros((prev) => ({ ...prev, funcionario: e.target.value }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--cor-borda)' }}>
              <option value="">Todos</option>
              {(dados.filtros?.funcionarios || []).map((nome: string) => <option key={nome} value={nome}>{nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="relatorio-funcao-sistema" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Função do sistema</label>
            <select id="relatorio-funcao-sistema" value={filtros.funcaoSistema} onChange={(e) => setFiltros((prev) => ({ ...prev, funcaoSistema: e.target.value }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--cor-borda)' }}>
              <option value="">Todas</option>
              {(dados.filtros?.funcoesSistema || []).map((item: any) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={aplicarFiltros} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: 'var(--cor-primaria)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Atualizar relatório</button>
          <button onClick={limparFiltros} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--cor-borda)', background: 'var(--cor-superficie)', color: 'var(--cor-texto)', fontWeight: 700, cursor: 'pointer' }}>Limpar</button>
        </div>
      </Card>

      <div className={styles.chartsRow}>
        <Card padding="md">
          <h3 className={styles.chartTitle}>
            <BarChart3 size={18} style={{ color: 'var(--cor-primaria)' }} /> Ordens de Serviço por Mês
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dados.osMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cor-borda)" />
              <XAxis dataKey="mes" fontSize={12} stroke="var(--cor-texto-secundario)" />
              <YAxis fontSize={12} stroke="var(--cor-texto-secundario)" />
              <Tooltip contentStyle={{ background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)', borderRadius: 8 }} />
              <Bar dataKey="limpeza" fill="#1a73e8" radius={[4, 4, 0, 0]} name="Limpeza" />
              <Bar dataKey="manutencao" fill="#00897b" radius={[4, 4, 0, 0]} name="Manutenção" />
              <Bar dataKey="emergencia" fill="#d32f2f" radius={[4, 4, 0, 0]} name="Emergência" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card padding="md">
          <h3 className={styles.chartTitle}>
            <TrendingUp size={18} style={{ color: 'var(--cor-primaria)' }} /> Custos Mensais
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dados.custoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cor-borda)" />
              <XAxis dataKey="mes" fontSize={12} stroke="var(--cor-texto-secundario)" />
              <YAxis fontSize={12} stroke="var(--cor-texto-secundario)" />
              <Tooltip contentStyle={{ background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)', borderRadius: 8 }} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="custo" fill="var(--cor-primaria-light)" stroke="var(--cor-primaria)" strokeWidth={2} name="Custo" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className={styles.chartsRow}>
        <Card padding="md">
          <h3 className={styles.chartTitle}>
            <Activity size={18} style={{ color: 'var(--cor-primaria)' }} /> Produtividade por Funcionário
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dados.produtividade}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cor-borda)" />
              <XAxis dataKey="funcionario" fontSize={12} stroke="var(--cor-texto-secundario)" />
              <YAxis fontSize={12} stroke="var(--cor-texto-secundario)" />
              <Tooltip contentStyle={{ background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)', borderRadius: 8 }} />
              <Bar dataKey="tarefas" fill="#1a73e8" radius={[4, 4, 0, 0]} name="Tarefas Concluídas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card padding="md">
          <h3 className={styles.chartTitle}>
            <PieIcon size={18} style={{ color: 'var(--cor-primaria)' }} /> Satisfação dos Condomínios
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={dados.satisfacao} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="valor" nameKey="estrelas" label>
                {(dados.satisfacao || []).map((item: any, i: number) => <Cell key={item.estrelas} fill={CORES[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card padding="md">
        <h3 className={styles.chartTitle}>O.S. por Condomínio e Nota Média</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dados.osPorCondominio}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cor-borda)" />
            <XAxis dataKey="nome" fontSize={12} stroke="var(--cor-texto-secundario)" />
            <YAxis fontSize={12} stroke="var(--cor-texto-secundario)" />
            <Tooltip contentStyle={{ background: 'var(--cor-superficie)', border: '1px solid var(--cor-borda)', borderRadius: 8 }} />
            <Bar dataKey="os" fill="#1a73e8" radius={[4, 4, 0, 0]} name="Ordens de Serviço" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card padding="md">
        <h3 className={styles.chartTitle}>Registros Consolidados do Sistema</h3>
        {(dados.registros || []).length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>Nenhum registro encontrado para os filtros selecionados.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--cor-borda)' }}>
                  <th style={{ padding: '10px 8px' }}>Data</th>
                  <th style={{ padding: '10px 8px' }}>Função</th>
                  <th style={{ padding: '10px 8px' }}>Condomínio</th>
                  <th style={{ padding: '10px 8px' }}>Funcionário</th>
                  <th style={{ padding: '10px 8px' }}>Título</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px' }}>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {(dados.registros || []).map((registro: any) => (
                  <tr key={`${registro.funcaoSistema}-${registro.id}`} style={{ borderBottom: '1px solid var(--cor-borda)' }}>
                    <td style={{ padding: '10px 8px' }}>{formatarData(registro.data)}</td>
                    <td style={{ padding: '10px 8px' }}>{registro.funcaoSistemaLabel}</td>
                    <td style={{ padding: '10px 8px' }}>{registro.condominioNome}</td>
                    <td style={{ padding: '10px 8px' }}>{registro.funcionarioNome || '—'}</td>
                    <td style={{ padding: '10px 8px' }}>{registro.titulo || '—'}</td>
                    <td style={{ padding: '10px 8px', textTransform: 'capitalize' }}>{formatarStatus(registro.status)}</td>
                    <td style={{ padding: '10px 8px' }}>{registro.detalhe || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RelatoriosPage;
