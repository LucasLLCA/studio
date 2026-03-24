export interface EstoqueProcesso {
  protocolo: string;
  dias_sem_atividade: number;
  ultimo_andamento: string | null;
}

export interface EstoqueUnidade {
  unidade: string;
  processos_abertos: number;
  ultimo_andamento: string | null;
  tempo_medio_dias: number;
}

export interface EstoqueListItem {
  protocolo: string;
  unidade_aberta: string;
  dias_sem_atividade: number;
  ultimo_andamento: string | null;
  // Fields from bi_processos_unicos JOIN
  unidade_origem?: string | null;
  orgao_origem?: string | null;
  tipo_procedimento?: string | null;
  status?: string | null;
  entendimento_processo?: string | null;
  situacao_atual?: string | null;
}

export interface EstoqueListResponse {
  items: EstoqueListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EstoqueData {
  unidades: EstoqueUnidade[];
  total_processos_abertos: number;
  computed_at: string | null;
}

export interface EstoqueUnidadesOptions {
  unidades_abertas: string[];
  unidades_origem: string[];
  unidades_passagem: string[];
  orgaos_origem: string[];
  orgaos_passagem: string[];
  orgaos_abertas: string[];
}

export interface ProdutividadeUnidade {
  unidade: string;
  orgao: string;
  total_processos: number;
  total_andamentos: number;
  cnt_criacao: number;
  cnt_assinatura: number;
  cnt_tramitacao: number;
  cnt_blocos: number;
  cnt_edicao: number;
  cnt_abertura: number;
  cnt_comunicacao: number;
  cnt_automatico: number;
  cnt_outros: number;
  horas_criacao: number;
  horas_assinatura: number;
  horas_tramitacao: number;
  horas_blocos: number;
  horas_edicao: number;
  horas_abertura: number;
  horas_comunicacao: number;
  horas_automatico: number;
  horas_outros: number;
  horas_total: number;
  computed_at: string | null;
}

export interface ProdutividadeUsuario extends ProdutividadeUnidade {
  usuario: string;
}

export interface ProdutividadeMensal extends ProdutividadeUnidade {
  ano_mes: string;
}

export interface ProdutividadeUsuarioMensal extends ProdutividadeUsuario {
  ano_mes: string;
}

export interface ProdutividadeResponse {
  items: ProdutividadeUnidade[];
  computed_at?: string | null;
}

export interface ProdutividadeUsuarioResponse {
  items: ProdutividadeUsuario[];
  computed_at?: string | null;
}

export interface ProdutividadeMensalResponse {
  items: ProdutividadeMensal[];
  computed_at?: string | null;
}

export interface BiTask {
  task_id: string | null;
  task_name: string;
  started_at: string | null;
  finished_at: string | null;
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";
  duration_s: number | null;
  result_summary?: { total_processos: number; total_abertos: number } | null;
  error_message?: string | null;
}

export interface FeedEntry {
  id: number;
  numero_processo: string;
  tag_nome: string | null;
  dt_atividade: string;
  descr_atividade: string | null;
  usuario_atividade: string | null;
  unidade_atividade: string | null;
  qnt_novos_andamentos: number;
  visto_em: string | null;
  criado_em: string;
}

export interface FeedResponse {
  items: FeedEntry[];
  unread_count: number;
}

export interface ProcessoComAtividade {
  numero_processo: string;
  dt_ultima_atividade: string;
  descr_atividade: string | null;
}

export interface BiRotina {
  key: string;
  name: string;
  description: string;
  schedule: string;
  category: "BI" | "Sistema";
  task_name: string;
  refresh_endpoint: string;
}
