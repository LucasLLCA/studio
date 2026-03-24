import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import {
  fetchEstoqueProcessos,
  fetchEstoqueList,
  fetchEstoqueUnidades,
  fetchBiTasks,
  fetchRotinas,
  fetchProdutividadeUnidade,
  fetchProdutividadeUsuario,
  fetchProdutividadeUnidadeMensal,
  fetchSearchAutocomplete,
  fetchFeed,
  fetchFeedBadge,
  fetchProcessosComAtividade,
  type EstoqueFilters,
} from "@/lib/api/bi-api-client";
import type {
  EstoqueData,
  EstoqueListResponse,
  EstoqueUnidadesOptions,
  BiTask,
  BiRotina,
  ProdutividadeResponse,
  ProdutividadeUsuarioResponse,
  ProdutividadeMensalResponse,
  FeedResponse,
  ProcessoComAtividade,
} from "@/types/bi";

export function useEstoqueProcessos(filters?: EstoqueFilters) {
  return useQuery<EstoqueData>({
    queryKey: queryKeys.bi.estoque(
      filters?.unidade_origem,
      filters?.unidade_passagem,
      filters?.unidade_aberta,
      filters?.orgao_origem,
      filters?.orgao_passagem,
      filters?.orgao_aberta
    ),
    queryFn: async () => {
      const result = await fetchEstoqueProcessos(filters);
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEstoqueList(
  filters?: EstoqueFilters,
  page = 1,
  search?: string
) {
  return useQuery<EstoqueListResponse>({
    queryKey: queryKeys.bi.estoqueList(
      page,
      search,
      filters?.unidade_origem,
      filters?.unidade_passagem,
      filters?.unidade_aberta,
      filters?.orgao_origem,
      filters?.orgao_passagem,
      filters?.orgao_aberta
    ),
    queryFn: async () => {
      const result = await fetchEstoqueList({ ...filters, page, search });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useEstoqueUnidades() {
  return useQuery<EstoqueUnidadesOptions>({
    queryKey: queryKeys.bi.unidades,
    queryFn: async () => {
      const result = await fetchEstoqueUnidades();
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useBiTasks() {
  return useQuery<BiTask[]>({
    queryKey: queryKeys.bi.tasks,
    queryFn: async () => {
      const result = await fetchBiTasks();
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    refetchInterval: 30_000, // poll every 30s when tab is active
  });
}

export function useRotinas() {
  return useQuery<BiRotina[]>({
    queryKey: queryKeys.bi.rotinas,
    queryFn: async () => {
      const result = await fetchRotinas();
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 60 * 60 * 1000, // 1 hour — registry rarely changes
  });
}

export function useProdutividadeUnidade(orgao?: string, unidade?: string) {
  return useQuery<ProdutividadeResponse>({
    queryKey: queryKeys.bi.prodUnidade(orgao, unidade),
    queryFn: async () => {
      const result = await fetchProdutividadeUnidade({ orgao, unidade });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProdutividadeUsuario(orgao?: string, unidade?: string) {
  return useQuery<ProdutividadeUsuarioResponse>({
    queryKey: queryKeys.bi.prodUsuario(orgao, unidade),
    queryFn: async () => {
      const result = await fetchProdutividadeUsuario({ orgao, unidade });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!unidade, // only fetch when a unit is selected
  });
}

export function useProdutividadeUnidadeMensal(orgao?: string, unidade?: string) {
  return useQuery<ProdutividadeMensalResponse>({
    queryKey: queryKeys.bi.prodUnidadeMensal(orgao, unidade),
    queryFn: async () => {
      const result = await fetchProdutividadeUnidadeMensal({ orgao, unidade });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!unidade,
  });
}

export function useSearchAutocomplete(q: string) {
  return useQuery<{suggestions: {value: string; type: string}[]}>({
    queryKey: ['bi', 'autocomplete', q],
    queryFn: async () => {
      const result = await fetchSearchAutocomplete(q);
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    staleTime: 30 * 1000,
    enabled: q.length >= 2,
  });
}

export function useFeedBadge(usuario: string | undefined) {
  return useQuery<{ unread_count: number }>({
    queryKey: queryKeys.bi.feedBadge(usuario ?? ''),
    queryFn: async () => {
      const result = await fetchFeedBadge(usuario!);
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    enabled: !!usuario,
    refetchInterval: 60_000, // poll every 60s
  });
}

export function useFeed(usuario: string | undefined) {
  return useQuery<FeedResponse>({
    queryKey: queryKeys.bi.feed(usuario ?? ''),
    queryFn: async () => {
      const result = await fetchFeed(usuario!, 50, true);
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    enabled: !!usuario,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useProcessosComAtividade(usuario: string | undefined) {
  return useQuery<{ processos_com_atividade: ProcessoComAtividade[] }>({
    queryKey: queryKeys.bi.processosComAtividade(usuario ?? ''),
    queryFn: async () => {
      const result = await fetchProcessosComAtividade(usuario!);
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    enabled: !!usuario,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
