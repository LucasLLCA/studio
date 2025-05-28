
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
  chronologicalIndex: number; 
  daysOpen?: number; 
  isSummaryNode?: boolean;
  groupedTasksCount?: number;
  originalTaskIds?: string[];
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

// Types for the /procedimentos/consulta endpoint
export interface UnidadeAberta {
  IdUnidade: string;
  SiglaUnidade: string;
  DescricaoUnidade: string;
  // Outros campos que possam vir da API, como NomeUnidade, etc.
}

export interface ConsultaProcessoResponse {
  UnidadesProcedimentoAberto?: UnidadeAberta[];
  // Outros campos da resposta da consulta, se houver
}

export interface ApiError {
  error: string;
  details?: any;
  status?: number;
}
