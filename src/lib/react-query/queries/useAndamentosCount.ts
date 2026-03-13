'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchAndamentosCount } from '@/lib/sei-api-client';
import { queryKeys } from '../keys';

interface AndamentosCountResponse {
  total_itens: number;
}

interface UseAndamentosCountOptions {
  processo: string;
  unidade: string;
  token: string;
  enabled?: boolean;
}

/**
 * Lightweight hook that fetches only the TotalItens count (quantidade=0).
 * Cached for 20 minutes — shared across pages (selecionar unidade → visualizar).
 */
export function useAndamentosCount({
  processo,
  unidade,
  token,
  enabled = true,
}: UseAndamentosCountOptions): UseQueryResult<AndamentosCountResponse, Error> {
  return useQuery<AndamentosCountResponse, Error>({
    queryKey: queryKeys.andamentosCount.byProcess(processo),

    queryFn: async (): Promise<AndamentosCountResponse> => {
      const result = await fetchAndamentosCount(token, processo, unidade);
      if ('error' in result) {
        throw new Error(result.error || 'Erro ao verificar contagem de andamentos');
      }
      return result;
    },

    enabled: enabled && !!token && !!processo && !!unidade,

    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours

    retry: (failureCount, error) => {
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 1;
    },

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  });
}
