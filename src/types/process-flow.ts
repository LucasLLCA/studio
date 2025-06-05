
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
  Id: string;
  Sigla: string;
  Descricao: string;
}

export interface UnidadesFiltroData {
  Unidades: UnidadeFiltro[];
}

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

