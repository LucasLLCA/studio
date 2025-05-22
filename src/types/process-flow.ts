
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
  NumeroProcesso?: string; // Added for displaying process number
}

export interface ProcessoData {
  Info: ProcessoInfo;
  Andamentos: Andamento[];
}

// Extended type for internal use after processing
export interface ProcessedAndamento extends Andamento {
  parsedDate: Date;
  summary?: string;
  globalSequence: number;
  x: number; 
  y: number; 
  color?: string; 
  nodeRadius: number; 
  chronologicalIndex: number; 
  daysOpen?: number; 
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
}
