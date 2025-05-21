
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
  IdOrigem?: string; // IdOrigem pode ser opcional dependendo do atributo
}

export interface Andamento {
  IdAndamento: string;
  Tarefa: string;
  Descricao: string;
  DataHora: string;
  Unidade: Unidade;
  Usuario: Usuario;
  Atributos?: Atributo[]; // Atributos é um array opcional
}

export interface ProcessoData {
  Info: {
    Pagina: number;
    TotalPaginas: number;
    QuantidadeItens: number;
    TotalItens: number;
  };
  Andamentos: Andamento[];
}

// Extended type for internal use after processing
export interface ProcessedAndamento extends Andamento {
  parsedDate: Date;
  summary?: string;
  globalSequence: number;
  x: number; // X-coordinate for graph node
  y: number; // Y-coordinate for graph node
  color?: string; // Color for the node
  nodeRadius: number; // Raio do nó, para consistência
  chronologicalIndex: number; // Índice após ordenação cronológica global
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
  laneMap: Map<string, number>; // To store Y positions of lanes by Unidade.Sigla
}
