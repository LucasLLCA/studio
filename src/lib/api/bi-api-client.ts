import type {
  EstoqueData,
  EstoqueUnidadesOptions,
  EstoqueListResponse,
  BiTask,
  BiRotina,
  ProdutividadeResponse,
  ProdutividadeUsuarioResponse,
  ProdutividadeMensalResponse,
  FeedResponse,
  ProcessoComAtividade,
} from "@/types/bi";
import type { ApiError } from "@/types/process-flow";
import { getApiBaseUrl, fetchWithErrorHandling } from "./fetch-utils";

export interface EstoqueFilters {
  unidade_origem?: string;
  unidade_passagem?: string;
  unidade_aberta?: string;
  orgao_origem?: string;
  orgao_passagem?: string;
  orgao_aberta?: string;
}

export async function fetchEstoqueProcessos(
  filters?: EstoqueFilters
): Promise<EstoqueData | ApiError> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (filters?.unidade_origem) params.set("unidade_origem", filters.unidade_origem);
  if (filters?.unidade_passagem) params.set("unidade_passagem", filters.unidade_passagem);
  if (filters?.unidade_aberta) params.set("unidade_aberta", filters.unidade_aberta);
  if (filters?.orgao_origem) params.set("orgao_origem", filters.orgao_origem);
  if (filters?.orgao_passagem) params.set("orgao_passagem", filters.orgao_passagem);
  if (filters?.orgao_aberta) params.set("orgao_aberta", filters.orgao_aberta);

  const qs = params.toString();
  const url = `${baseUrl}/d1/bi/estoque-processos${qs ? `?${qs}` : ""}`;

  return fetchWithErrorHandling<EstoqueData>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar estoque de processos"
  );
}

export async function fetchEstoqueList(
  filters?: EstoqueFilters & { page?: number; page_size?: number; search?: string }
): Promise<EstoqueListResponse | ApiError> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.page_size) params.set("page_size", String(filters.page_size));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.unidade_origem) params.set("unidade_origem", filters.unidade_origem);
  if (filters?.unidade_passagem) params.set("unidade_passagem", filters.unidade_passagem);
  if (filters?.unidade_aberta) params.set("unidade_aberta", filters.unidade_aberta);
  if (filters?.orgao_origem) params.set("orgao_origem", filters.orgao_origem);
  if (filters?.orgao_passagem) params.set("orgao_passagem", filters.orgao_passagem);
  if (filters?.orgao_aberta) params.set("orgao_aberta", filters.orgao_aberta);

  const qs = params.toString();
  const url = `${baseUrl}/d1/bi/estoque-processos/list${qs ? `?${qs}` : ""}`;

  return fetchWithErrorHandling<EstoqueListResponse>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar lista de processos"
  );
}

export async function fetchEstoqueUnidades(): Promise<EstoqueUnidadesOptions | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/estoque-processos/unidades`;

  return fetchWithErrorHandling<EstoqueUnidadesOptions>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar unidades do estoque"
  );
}

export async function refreshEstoque(): Promise<{ task_id: string } | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/estoque-processos/refresh`;

  return fetchWithErrorHandling<{ task_id: string }>(
    url,
    { method: "POST", headers: { Accept: "application/json" } },
    "solicitar atualização do estoque"
  );
}

export async function fetchBiTasks(): Promise<BiTask[] | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/tasks`;

  return fetchWithErrorHandling<BiTask[]>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar histórico de tarefas BI"
  );
}

export async function fetchProdutividadeUnidade(
  params?: { orgao?: string; unidade?: string }
): Promise<ProdutividadeResponse | ApiError> {
  const baseUrl = getApiBaseUrl();
  const qs = new URLSearchParams();
  if (params?.orgao) qs.set("orgao", params.orgao);
  if (params?.unidade) qs.set("unidade", params.unidade);
  const query = qs.toString();
  const url = `${baseUrl}/d1/bi/produtividade/unidade${query ? `?${query}` : ""}`;

  return fetchWithErrorHandling<ProdutividadeResponse>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar produtividade por unidade"
  );
}

export async function fetchProdutividadeUnidadeMensal(
  params?: { orgao?: string; unidade?: string; ano_mes?: string }
): Promise<ProdutividadeMensalResponse | ApiError> {
  const baseUrl = getApiBaseUrl();
  const qs = new URLSearchParams();
  if (params?.orgao) qs.set("orgao", params.orgao);
  if (params?.unidade) qs.set("unidade", params.unidade);
  if (params?.ano_mes) qs.set("ano_mes", params.ano_mes);
  const query = qs.toString();
  const url = `${baseUrl}/d1/bi/produtividade/unidade-mensal${query ? `?${query}` : ""}`;

  return fetchWithErrorHandling<ProdutividadeMensalResponse>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar produtividade mensal por unidade"
  );
}

export async function fetchProdutividadeUsuario(
  params?: { orgao?: string; unidade?: string; usuario?: string }
): Promise<ProdutividadeUsuarioResponse | ApiError> {
  const baseUrl = getApiBaseUrl();
  const qs = new URLSearchParams();
  if (params?.orgao) qs.set("orgao", params.orgao);
  if (params?.unidade) qs.set("unidade", params.unidade);
  if (params?.usuario) qs.set("usuario", params.usuario);
  const query = qs.toString();
  const url = `${baseUrl}/d1/bi/produtividade/usuario${query ? `?${query}` : ""}`;

  return fetchWithErrorHandling<ProdutividadeUsuarioResponse>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar produtividade por usuário"
  );
}

export async function fetchProdutividadeUsuarioMensal(
  params?: { orgao?: string; unidade?: string; usuario?: string; ano_mes?: string }
): Promise<ProdutividadeUsuarioResponse | ApiError> {
  const baseUrl = getApiBaseUrl();
  const qs = new URLSearchParams();
  if (params?.orgao) qs.set("orgao", params.orgao);
  if (params?.unidade) qs.set("unidade", params.unidade);
  if (params?.usuario) qs.set("usuario", params.usuario);
  if (params?.ano_mes) qs.set("ano_mes", params.ano_mes);
  const query = qs.toString();
  const url = `${baseUrl}/d1/bi/produtividade/usuario-mensal${query ? `?${query}` : ""}`;

  return fetchWithErrorHandling<ProdutividadeUsuarioResponse>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar produtividade mensal por usuário"
  );
}

export async function refreshProdutividade(): Promise<{ task_id: string } | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/produtividade/refresh`;

  return fetchWithErrorHandling<{ task_id: string }>(
    url,
    { method: "POST", headers: { Accept: "application/json" } },
    "solicitar atualização da produtividade"
  );
}

export async function refreshProcessosUnicos(): Promise<{ task_id: string } | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/processos-unicos/refresh`;

  return fetchWithErrorHandling<{ task_id: string }>(
    url,
    { method: "POST", headers: { Accept: "application/json" } },
    "solicitar atualização de processos únicos"
  );
}

export async function fetchSearchAutocomplete(q: string): Promise<{suggestions: {value: string; type: string}[]} | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/search/autocomplete?q=${encodeURIComponent(q)}&limit=8`;
  return fetchWithErrorHandling(url, { method: "GET", headers: { Accept: "application/json" } }, "buscar sugestoes");
}

export async function fetchFeed(
  usuario: string,
  limit = 50,
  includeRead = false
): Promise<FeedResponse | ApiError> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("usuario", usuario);
  params.set("limit", String(limit));
  params.set("include_read", String(includeRead));
  const url = `${baseUrl}/d1/bi/feed?${params.toString()}`;

  return fetchWithErrorHandling<FeedResponse>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar feed de movimentacoes"
  );
}

export async function fetchFeedBadge(
  usuario: string
): Promise<{ unread_count: number } | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/feed/badge?usuario=${encodeURIComponent(usuario)}`;

  return fetchWithErrorHandling<{ unread_count: number }>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar contagem de notificacoes"
  );
}

export async function markFeedRead(
  usuario: string,
  entryIds?: number[]
): Promise<{ marked: number } | ApiError> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("usuario", usuario);
  if (entryIds && entryIds.length > 0) {
    params.set("entry_ids", entryIds.join(","));
  }
  const url = `${baseUrl}/d1/bi/feed/mark-read?${params.toString()}`;

  return fetchWithErrorHandling<{ marked: number }>(
    url,
    { method: "POST", headers: { Accept: "application/json" } },
    "marcar notificacoes como lidas"
  );
}

export async function fetchProcessosComAtividade(
  usuario: string,
  horas = 24
): Promise<{ processos_com_atividade: ProcessoComAtividade[] } | ApiError> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("usuario", usuario);
  params.set("horas", String(horas));
  const url = `${baseUrl}/d1/bi/processos-salvos/com-atividade?${params.toString()}`;

  return fetchWithErrorHandling<{ processos_com_atividade: ProcessoComAtividade[] }>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar processos com atividade recente"
  );
}

export async function fetchRotinas(): Promise<BiRotina[] | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi/rotinas`;

  return fetchWithErrorHandling<BiRotina[]>(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    "buscar rotinas registradas"
  );
}

export async function triggerRotina(
  refreshEndpoint: string
): Promise<{ task_id: string } | ApiError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/d1/bi${refreshEndpoint}`;

  return fetchWithErrorHandling<{ task_id: string }>(
    url,
    { method: "POST", headers: { Accept: "application/json" } },
    "executar rotina"
  );
}
