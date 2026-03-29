// ===== Perfis e Hierarquia =====
export type UserRole = 'master' | 'administrador' | 'supervisor' | 'funcionario';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  master: 4,
  administrador: 3,
  supervisor: 2,
  funcionario: 1,
};

export interface User {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  bloqueado: boolean;
  motivoBloqueio?: string;
  criadoPor: string;
  administradorId?: string;
  supervisorId?: string;
  condominioId?: string;
  avatarUrl?: string;
  telefone?: string;
  cargo?: string;
  criadoEm: number;
  atualizadoEm: number;
}

// ===== Funções do Sistema =====
export interface FuncaoSistema {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  rota: string;
  ativa: boolean;
  habilitadaPara: UserRole[];
  permissoesCustomizadas: Record<string, boolean>;
}

// ===== Permissões =====
export interface PermissaoUsuario {
  userId: string;
  funcaoId: string;
  podeVer: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  podeCriar: boolean;
}

// ===== Geolocalização =====
export interface RegistroLocalizacao {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  endereco: string;
  horaChegada: number;
  horaSaida?: number;
  tempoTotal?: number; // em minutos
  data: string;
  funcaoId?: string;
}

export interface PosicaoAtual {
  userId: string;
  latitude: number;
  longitude: number;
  endereco: string;
  ultimaAtualizacao: number;
}

// ===== Tema =====
export interface TemaConfig {
  corPrimaria: string;
  corSecundaria: string;
  corMenu: string;
  corBotao: string;
  corFundo: string;
  modoEscuro: boolean;
  logoUrl?: string;
  loginTitulo?: string;
  loginSubtitulo?: string;
}

export const CORES_DISPONIVEIS = [
  { nome: 'Azul Royal', valor: '#1a73e8' },
  { nome: 'Verde Esmeralda', valor: '#00897b' },
  { nome: 'Roxo', valor: '#7b1fa2' },
  { nome: 'Vermelho', valor: '#d32f2f' },
  { nome: 'Laranja', valor: '#f57c00' },
  { nome: 'Índigo', valor: '#303f9f' },
  { nome: 'Teal', valor: '#00796b' },
  { nome: 'Rosa', valor: '#c2185b' },
  { nome: 'Marrom', valor: '#5d4037' },
  { nome: 'Cinza Azulado', valor: '#455a64' },
];

// ===== Relatórios =====
export interface DadosRelatorio {
  titulo: string;
  tipo: 'bar' | 'line' | 'pie' | 'area';
  dados: Array<Record<string, string | number>>;
  chaveX: string;
  chavesY: string[];
  cores?: string[];
}

// ===== Controle de Presença =====
export interface RegistroPresenca {
  id: string;
  userId: string;
  data: string;
  horaEntrada: number;
  horaSaida?: number;
  localizacaoEntrada: { lat: number; lng: number; endereco: string };
  localizacaoSaida?: { lat: number; lng: number; endereco: string };
  totalHoras?: number;
}

// ===== Condomínio =====
export interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  sindico: string;
  telefone: string;
  email: string;
  logoUrl?: string;
  loginTitulo?: string;
  loginSubtitulo?: string;
  relatorioResponsavelNome?: string;
  relatorioResponsavelCargo?: string;
  relatorioResponsavelRegistro?: string;
  relatorioTelefone?: string;
  relatorioEmail?: string;
  relatorioDocumento?: string;
  relatorioObservacoes?: string;
  blocos: number;
  unidades: number;
  criadoPor: string;
  criadoEm: number;
  ativo: boolean;
}

// ===== Ordem de Serviço =====
export type StatusOS = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada' | 'aguardando';

export interface OrdemServico {
  id: string;
  condominioId: string;
  titulo: string;
  descricao: string;
  tipo: 'limpeza' | 'manutencao' | 'emergencia' | 'preventiva';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: StatusOS;
  local: string;
  responsavelId?: string;
  supervisorId?: string;
  fotos: string[];
  observacoes: string;
  dataAbertura: number;
  dataPrevisao?: number;
  dataConclusao?: number;
  criadoPor: string;
  avaliacaoNota?: number;
  avaliacaoComentario?: string;
}

// ===== Checklist de Limpeza =====
export interface ItemChecklist {
  id: string;
  descricao: string;
  concluido: boolean;
  observacao?: string;
  foto?: string;
}

export interface ChecklistLimpeza {
  id: string;
  condominioId: string;
  local: string;
  tipo: 'diaria' | 'semanal' | 'mensal' | 'especial';
  itens: ItemChecklist[];
  responsavelId: string;
  supervisorId?: string;
  data: string;
  horaInicio?: number;
  horaFim?: number;
  status: 'pendente' | 'em_andamento' | 'concluido';
  assinatura?: string;
  criadoPor: string;
  criadoEm: number;
}

// ===== Escala de Trabalho =====
export interface EscalaTrabalho {
  id: string;
  condominioId: string;
  funcionarioId: string;
  diaSemana: number; // 0-6
  horaInicio: string;
  horaFim: string;
  local: string;
  funcao: string;
  ativo: boolean;
}

// ===== Materiais e Estoque =====
export interface Material {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  condominioId: string;
  ultimaReposicao?: number;
  custoUnitario: number;
}

export interface MovimentacaoMaterial {
  id: string;
  materialId: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  responsavelId: string;
  data: number;
}

// ===== Inspeções =====
export interface Inspecao {
  id: string;
  condominioId: string;
  tipo: 'areas_comuns' | 'elevadores' | 'piscina' | 'garagem' | 'jardim' | 'fachada';
  local: string;
  inspetorId: string;
  data: number;
  status: 'conforme' | 'nao_conforme' | 'pendente';
  observacoes: string;
  fotos: string[];
  itensVerificados: { item: string; conforme: boolean; obs?: string }[];
  criadoEm: number;
}

// ===== Estado Global =====
export interface AppState {
  usuario: User | null;
  tema: TemaConfig;
  funcoes: FuncaoSistema[];
  carregando: boolean;
}

// ===== Props Comuns =====
export interface HowItWorksProps {
  titulo: string;
  descricao: string;
  passos: string[];
}

export interface ActionBarProps {
  onCompartilhar: () => void;
  onImprimir: () => void;
  onGerarPdf: () => void;
}

export interface GridContainerProps {
  children: React.ReactNode;
  colunas?: number;
}
