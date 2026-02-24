'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchOpenUnits } from '@/lib/sei-api-client';
import { queryKeys } from '../keys';
import type { UnidadeAberta, ApiError } from '@/types/process-flow';

/**
 * Response esperada do fetchOpenUnits
 */
interface OpenUnitsResponse {
  unidades: UnidadeAberta[];
  linkAcesso?: string;
}

/**
 * Opções para o hook useOpenUnits
 */
interface UseOpenUnitsOptions {
  /** Número do processo (protocolo) */
  processo: string;
  /** ID da unidade de origem para consulta */
  unidadeOrigem: string;
  /** Token de sessão SEI */
  token: string;
  /** Se a query deve ser executada (default: true) */
  enabled?: boolean;
  /** Tempo em que os dados são considerados "fresh" em ms (default: 5 min) */
  staleTime?: number;
  /** Tempo de cache (garbage collection) em ms (default: 2 horas) */
  gcTime?: number;
}

/**
 * Hook para buscar unidades em aberto de um processo com cache de 2 horas
 *
 * Benefícios:
 * - ✅ Cache automático de 2 horas (TTL configurável)
 * - ✅ Retry automático em caso de falha
 * - ✅ Loading e error states gerenciados
 * - ✅ Revalidação inteligente
 * - ✅ Evita requisições duplicadas
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useOpenUnits({
 *   processo: '12345678901234567890',
 *   unidadeOrigem: '12345',
 *   token: sessionToken,
 * });
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * const unidades = data?.unidades || [];
 * ```
 */
export function useOpenUnits({
  processo,
  unidadeOrigem,
  token,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutos (dados considerados "fresh")
  gcTime = 2 * 60 * 60 * 1000, // 2 horas (TTL do cache)
}: UseOpenUnitsOptions): UseQueryResult<OpenUnitsResponse, Error> {
  return useQuery<OpenUnitsResponse, Error>({
    // Query key única para esta combinação
    queryKey: queryKeys.openUnits.detail(processo, unidadeOrigem),

    // Função que busca os dados
    queryFn: async (): Promise<OpenUnitsResponse> => {
      const result = await fetchOpenUnits(
        token,
        processo,
        unidadeOrigem
      );

      // Tratamento de erro type-safe
      if ('error' in result) {
        throw new Error(result.error || 'Erro ao buscar unidades em aberto');
      }

      return result;
    },

    // Condições para executar a query
    enabled: enabled && !!token && !!processo && !!unidadeOrigem,

    // Configurações de cache e revalidação
    staleTime, // Dados "fresh" por 5 minutos
    gcTime, // Cache mantido por 2 horas

    // Retry only on transient errors (not 4xx client errors)
    retry: (failureCount, error) => {
      if (error.message.includes('422') || error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),

    // Configurações de refetch
    refetchOnMount: false, // Não refetch se dados estão em cache
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    refetchOnReconnect: true, // Refetch ao reconectar

    // Network mode
    networkMode: 'online',

    // Meta para debugging
    meta: {
      errorMessage: 'Erro ao buscar unidades em aberto do processo',
    },
  });
}

/**
 * Helper para pré-carregar unidades em aberto
 *
 * Útil para prefetch ao hover em links de processos
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
      const result = await fetchOpenUnits(
        token,
        processo,
        unidadeOrigem
      );

      if ('error' in result) {
        throw new Error(result.error);
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}
