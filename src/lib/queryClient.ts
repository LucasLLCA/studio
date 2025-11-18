'use client';

import { QueryClient } from '@tanstack/react-query';

// Configuração global do React Query
// TTL de 2 horas para cache de unidades em aberto
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados considerados "fresh" por 5 minutos
      staleTime: 5 * 60 * 1000,

      // Cache mantido por 2 horas (conforme requisito)
      gcTime: 2 * 60 * 60 * 1000,

      // Retry automático em caso de falha
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Configurações de refetch
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Network mode
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Helper para invalidar queries específicas
export const invalidateQueries = {
  openUnits: (processo?: string) => {
    if (processo) {
      return queryClient.invalidateQueries({
        queryKey: ['openUnits', processo],
      });
    }
    return queryClient.invalidateQueries({
      queryKey: ['openUnits'],
    });
  },

  processData: (processo?: string) => {
    if (processo) {
      return queryClient.invalidateQueries({
        queryKey: ['processData', processo],
      });
    }
    return queryClient.invalidateQueries({
      queryKey: ['processData'],
    });
  },

  all: () => {
    return queryClient.invalidateQueries();
  },
};

// Helper para prefetch
export const prefetchQueries = {
  openUnits: async (
    processo: string,
    unidade: string,
    queryFn: () => Promise<unknown>
  ) => {
    return queryClient.prefetchQuery({
      queryKey: ['openUnits', processo, unidade],
      queryFn,
      staleTime: 5 * 60 * 1000,
    });
  },
};
