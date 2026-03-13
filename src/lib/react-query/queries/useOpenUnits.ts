'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchOpenUnits } from '@/lib/sei-api-client';
import { queryKeys } from '../keys';
import type { UnidadeAberta } from '@/types/process-flow';

interface OpenUnitsResponse {
  unidades: UnidadeAberta[];
  linkAcesso?: string;
  _totalItens?: number;
}

interface UseOpenUnitsOptions {
  processo: string;
  unidadeOrigem: string;
  token: string;
  enabled?: boolean;
  /** Current TotalItens from useAndamentosCount — used for cache validation */
  currentTotalItens?: number;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Hook para buscar unidades em aberto de um processo.
 *
 * When `currentTotalItens` is provided (from useAndamentosCount), the hook
 * skips refetching if the cached data was stored with the same TotalItens.
 * This avoids unnecessary backend calls when the process hasn't changed.
 */
export function useOpenUnits({
  processo,
  unidadeOrigem,
  token,
  enabled = true,
  currentTotalItens,
  staleTime: staleTimeMs = 5 * 60 * 1000,
  gcTime = 2 * 60 * 60 * 1000,
}: UseOpenUnitsOptions): UseQueryResult<OpenUnitsResponse, Error> {
  return useQuery<OpenUnitsResponse, Error>({
    queryKey: queryKeys.openUnits.detail(processo, unidadeOrigem),

    queryFn: async (): Promise<OpenUnitsResponse> => {
      const result = await fetchOpenUnits(token, processo, unidadeOrigem);
      if ('error' in result) {
        throw new Error(result.error || 'Erro ao buscar unidades em aberto');
      }
      return { ...result, _totalItens: currentTotalItens };
    },

    enabled: enabled && !!token && !!processo && !!unidadeOrigem,

    // Smart staleTime: if cached data's _totalItens matches current count,
    // data is still valid — no need to refetch
    staleTime: (query) => {
      const cachedTotalItens = query.state.data?._totalItens;
      if (
        currentTotalItens != null &&
        cachedTotalItens != null &&
        cachedTotalItens === currentTotalItens
      ) {
        return Infinity;
      }
      return staleTimeMs;
    },

    gcTime,

    retry: (failureCount, error) => {
      if (error.message.includes('422') || error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',

    meta: {
      errorMessage: 'Erro ao buscar unidades em aberto do processo',
    },
  });
}

/**
 * Helper para pré-carregar unidades em aberto
 */
export async function prefetchOpenUnits(
  queryClient: any,
  processo: string,
  unidadeOrigem: string,
  token: string
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.openUnits.detail(processo, unidadeOrigem),
    queryFn: async () => {
      const result = await fetchOpenUnits(token, processo, unidadeOrigem);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}
