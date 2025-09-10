
export interface Unidade {
  IdUnidade: string;
  Sigla: string;
  Descricao: string;
}

export interface Usuario {
  IdUsuario: string;
  Sigla: string;
  Nome: string;
}

export interface Atributo {
  Nome: string;
  Valor: string;
  IdOrigem?: string; 
}

export interface Andamento {
  IdAndamento: string;
  Tarefa: string;
  Descricao: string;
  DataHora: string;
  Unidade: Unidade;
  Usuario: Usuario;
  Atributos?: Atributo[]; 
  isSummaryNode?: boolean;
  groupedTasksCount?: number;
  originalTaskIds?: string[];
  daysOpen?: number;
}

export interface ProcessoInfo {
  Pagina: number;
  TotalPaginas: number;
  QuantidadeItens: number;
  TotalItens: number;
  NumeroProcesso?: string; 
}

export interface ProcessoData {
  Info: ProcessoInfo;
  Andamentos: Andamento[];
}

export interface ProcessedAndamento extends Andamento {
  parsedDate: Date;
  summary?: string;
  globalSequence: number; 
  originalGlobalSequence?: number; 
  x: number; 
  y: number; 
  color?: string; 
  nodeRadius: number; 
}

export interface Connection {
  sourceTask: ProcessedAndamento;
  targetTask: ProcessedAndamento;
}

export interface ProcessedFlowData {
  tasks: ProcessedAndamento[];
  connections: Connection[];
  svgWidth: number;
  svgHeight: number;
  laneMap: Map<string, number>; 
  processNumber?: string;
}

export interface UnidadeFiltro {
  Id: string; // Corresponds to IdUnidade from API
  Sigla: string;
  Descricao: string;
}

// This type is no longer used as unidades_filtradas.json is removed
// export interface UnidadesFiltroData {
//   Unidades: UnidadeFiltro[];
// }

export interface UsuarioAtribuicao {
  IdUsuario?: string;
  Sigla?: string;
  Nome?: string;
}

export interface UnidadeAberta { 
  Unidade: {
    IdUnidade: string;
    Sigla: string;
    Descricao: string;
  };
  UsuarioAtribuicao: UsuarioAtribuicao;
}

// Response from /procedimentos/consulta
export interface ConsultaProcessoResponse {
  IdProcedimento?: string;
  ProcedimentoFormatado?: string;
  Especificacao?: string;
  DataAutuacao?: string;
  LinkAcesso?: string;
  TipoProcedimento?: {
    IdTipoProcedimento: string;
    Nome: string;
  };
  UnidadesProcedimentoAberto?: UnidadeAberta[];
}

export interface ProcessSummaryResponse {
  summary: string;
}

export interface ApiError {
  error: string;
  details?: any;
  status?: number;
}

// For SEI Login
export interface LoginCredentials {
  usuario: string;
  senha: string;
  orgao: string;
}

// Expected raw response from SEI /orgaos/usuarios/login
export interface SEILoginApiResponse {
  Token: string;
  Login?: { 
    IdLogin?: string;
    Nome?: string; // Assuming Nome might be available
  };
  // This is an assumption based on the requirement to load units from login.
  // The actual SEI API might have a different structure or require a separate call.
  UnidadesAcesso?: Array<{
    IdUnidade: string;
    Sigla: string;
    Descricao: string;
  }>;
  Unidades?: Array<{
    Id: string;
    Sigla: string;
    Descricao: string;
  }>;
  // For error messages directly from SEI API on failed login
  Message?: string; 
}

// What the loginToSEI server action returns to the client
export interface ClientLoginResponse {
  success: boolean;
  token?: string;
  unidades?: UnidadeFiltro[]; // Uses UnidadeFiltro for consistency with Select
  error?: string;
  status?: number;
  details?: any; // To pass through any additional error details from SEI API
}

// Document interfaces
export interface DocumentoSerie {
  IdSerie: string;
  Nome: string;
  Aplicabilidade?: string;
}

export interface DocumentoUnidadeElaboradora {
  IdUnidade: string;
  Sigla: string;
  Descricao: string;
}

export interface Documento {
  IdProcedimento: string;
  ProcedimentoFormatado: string;
  IdDocumento: string;
  DocumentoFormatado: string;
  LinkAcesso: string;
  Serie: DocumentoSerie;
  Numero: string;
  Descricao?: string;
  Data: string;
  UnidadeElaboradora: DocumentoUnidadeElaboradora;
}

export interface DocumentosInfo {
  Pagina: number;
  TotalPaginas: number;
  QuantidadeItens: number;
  TotalItens: number;
}

export interface DocumentosResponse {
  Info: DocumentosInfo;
  Documentos: Documento[];
}
