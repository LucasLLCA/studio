export interface FluxoNode {
  id: string;
  node_id: string;
  tipo: 'sei_task' | 'etapa' | 'decisao' | 'inicio' | 'fim' | 'fork' | 'join';
  nome: string;
  descricao?: string | null;
  sei_task_key?: string | null;
  responsavel?: string | null;
  duracao_estimada_horas?: number | null;
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica' | null;
  documentos_necessarios?: string[] | null;
  checklist?: Array<{ item: string; obrigatorio: boolean }> | null;
  regras_prazo?: { dias_uteis?: number; tipo?: string } | null;
  metadata_extra?: Record<string, unknown> | null;
  posicao_x: number;
  posicao_y: number;
  largura?: number | null;
  altura?: number | null;
}

export interface FluxoEdge {
  id: string;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  tipo: 'padrao' | 'condicional' | 'loop';
  label?: string | null;
  condicao?: { campo?: string; operador?: string; valor?: string } | null;
  ordem?: number | null;
  animated: boolean;
}

export interface Fluxo {
  id: string;
  nome: string;
  descricao?: string | null;
  usuario: string;
  equipe_id?: string | null;
  orgao?: string | null;
  versao: number;
  status: 'rascunho' | 'publicado' | 'arquivado';
  viewport?: { x: number; y: number; zoom: number } | null;
  node_count: number;
  edge_count: number;
  processo_count: number;
  criado_em: string;
  atualizado_em: string;
}

export interface FluxoDetalhe {
  id: string;
  nome: string;
  descricao?: string | null;
  usuario: string;
  equipe_id?: string | null;
  orgao?: string | null;
  versao: number;
  status: 'rascunho' | 'publicado' | 'arquivado';
  viewport?: { x: number; y: number; zoom: number } | null;
  nodes: FluxoNode[];
  edges: FluxoEdge[];
  criado_em: string;
  atualizado_em: string;
}

export interface FluxoProcesso {
  id: string;
  fluxo_id: string;
  numero_processo: string;
  numero_processo_formatado?: string | null;
  node_atual_id?: string | null;
  status: 'em_andamento' | 'concluido' | 'pausado' | 'cancelado';
  iniciado_em?: string | null;
  concluido_em?: string | null;
  atribuido_por: string;
  notas?: string | null;
  historico?: Array<{
    node_id: string;
    entrada_em: string;
    saida_em?: string | null;
    usuario: string;
  }> | null;
  criado_em: string;
  atualizado_em: string;
}

// ── Reverse lookup & Compliance ─────────────────────────────

export interface FluxoComVinculacao {
  fluxo: FluxoDetalhe;
  vinculacao: FluxoProcesso;
}

export type ComplianceStatus = 'concluido' | 'em_andamento' | 'pendente' | 'violado';

export interface FluxoNodeCompliance {
  node: FluxoNode;
  status: ComplianceStatus;
  matched_andamentos: Array<{
    Tarefa: string;
    DataHora: string;
    Usuario?: { Nome?: string };
    Unidade?: { Sigla: string; Descricao?: string };
  }>;
  timestamp: string | null;
  order: number;
  /** The unidade sigla where this step was actually performed (from matched andamentos). */
  unidade?: string | null;
  /** True if the step was completed in a different unidade than the node's responsavel. */
  escapedFlow?: boolean;
}

export interface FluxoComplianceSummary {
  total: number;
  concluido: number;
  em_andamento: number;
  pendente: number;
  violado: number;
  progress_percent: number;
}

export interface FluxoComplianceResult {
  fluxo: FluxoDetalhe;
  vinculacao: FluxoProcesso;
  nodes: FluxoNodeCompliance[];
  summary: FluxoComplianceSummary;
}

// ── Canvas save ─────────────────────────────────────────────

export interface FluxoSaveCanvasPayload {
  nodes: Array<{
    node_id: string;
    tipo: string;
    nome: string;
    descricao?: string | null;
    sei_task_key?: string | null;
    responsavel?: string | null;
    duracao_estimada_horas?: number | null;
    prioridade?: string | null;
    documentos_necessarios?: string[] | null;
    checklist?: Array<{ item: string; obrigatorio: boolean }> | null;
    regras_prazo?: Record<string, unknown> | null;
    metadata_extra?: Record<string, unknown> | null;
    posicao_x: number;
    posicao_y: number;
    largura?: number | null;
    altura?: number | null;
  }>;
  edges: Array<{
    edge_id: string;
    source_node_id: string;
    target_node_id: string;
    tipo: string;
    label?: string | null;
    condicao?: Record<string, unknown> | null;
    ordem?: number | null;
    animated: boolean;
  }>;
  viewport?: { x: number; y: number; zoom: number } | null;
  versao: number;
}
