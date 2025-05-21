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

export interface Andamento {
  IdAndamento: string;
  Tarefa: string;
  Descricao: string;
  DataHora: string;
  Unidade: Unidade;
  Usuario: Usuario;
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
}

export interface Connection {
  sourceTaskId: string;
  targetTaskId: string;
  sourceUnitId: string;
  targetUnitId: string;
}

export interface ProcessedFlowData {
  tasks: ProcessedAndamento[];
  connections: Connection[];
}
