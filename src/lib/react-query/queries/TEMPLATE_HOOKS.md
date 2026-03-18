# Templates para Novos Hooks React Query

Este arquivo contém templates prontos para criar novos hooks de cache seguindo o mesmo padrão do `useOpenUnits`.

## Template Base

```typescript
'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchFunctionFromActions } from '@/app/sei-actions';
import { queryKeys } from '../keys';
import type { ResponseType, ApiError } from '@/types/process-flow';

interface UseHookNameOptions {
  // Parâmetros necessários
  token: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export function useHookName({
  token,
  enabled = true,
  staleTime = 5 * 60 * 1000,
  gcTime = 2 * 60 * 60 * 1000,
}: UseHookNameOptions): UseQueryResult<ResponseType, Error> {
  return useQuery<ResponseType, Error>({
    queryKey: queryKeys.feature.detail(...params),
    queryFn: async (): Promise<ResponseType> => {
      const result = await fetchFunctionFromActions(token, ...params);

      if ('error' in result) {
        throw new Error(result.error || 'Erro ao buscar dados');
      }

      return result;
    },
    enabled: enabled && !!token,
    staleTime,
    gcTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  });
}
```

## Exemplo 1: useProcessData (Andamentos)

```typescript
'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchProcessDataFromSEIWithToken } from '@/app/sei-actions';
import { queryKeys } from '../keys';
import type { ProcessoData, ApiError } from '@/types/process-flow';

interface UseProcessDataOptions {
  processo: string;
  unidade: string;
  token: string;
  enabled?: boolean;
}

/**
 * Hook para buscar dados do processo (andamentos) com cache
 *
 * TTL menor (2-5 min) pois andamentos mudam com mais frequência
 */
export function useProcessData({
  processo,
  unidade,
  token,
  enabled = true,
}: UseProcessDataOptions): UseQueryResult<ProcessoData, Error> {
  return useQuery<ProcessoData, Error>({
    queryKey: queryKeys.processData.detail(processo, unidade),
    queryFn: async (): Promise<ProcessoData> => {
      const result = await fetchProcessDataFromSEIWithToken(
        token,
        processo,
        unidade
      );

      if ('error' in result) {
        throw new Error(result.error || 'Erro ao buscar dados do processo');
      }

      return result;
    },
    enabled: enabled && !!token && !!processo && !!unidade,
    staleTime: 2 * 60 * 1000, // 2 minutos (dados mudam frequentemente)
    gcTime: 5 * 60 * 1000,    // 5 minutos de cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  });
}
```

**Uso:**
```typescript
const { data: processData, isLoading } = useProcessData({
  processo: numeroProcesso,
  unidade: selectedUnidade,
  token: sessionToken,
});

const andamentos = processData?.Andamentos || [];
```

## Exemplo 2: useDocuments (com Paginação)

```typescript
'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchDocumentsFromSEIWithToken } from '@/app/sei-actions';
import { queryKeys } from '../keys';
import type { DocumentosResponse } from '@/types/process-flow';

interface UseDocumentsOptions {
  processo: string;
  unidade: string;
  token: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Hook para buscar documentos do processo com paginação
 *
 * keepPreviousData: true para UX suave ao trocar de página
 */
export function useDocuments({
  processo,
  unidade,
  token,
  page = 1,
  pageSize = 10,
  enabled = true,
}: UseDocumentsOptions): UseQueryResult<DocumentosResponse, Error> {
  return useQuery<DocumentosResponse, Error>({
    queryKey: queryKeys.documents.paginated(processo, unidade, page, pageSize),
    queryFn: async (): Promise<DocumentosResponse> => {
      const result = await fetchDocumentsFromSEIWithToken(
        token,
        processo,
        unidade,
        page,
        pageSize
      );

      if ('error' in result) {
        throw new Error(result.error || 'Erro ao buscar documentos');
      }

      return result;
    },
    enabled: enabled && !!token && !!processo && !!unidade,
    staleTime: 10 * 60 * 1000,  // 10 minutos
    gcTime: 30 * 60 * 1000,     // 30 minutos
    retry: 2,

    // IMPORTANTE: Para paginação suave
    placeholderData: (previousData) => previousData,

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  });
}
```

**Uso:**
```typescript
const [page, setPage] = useState(1);

const { data, isLoading, isPreviousData } = useDocuments({
  processo: numeroProcesso,
  unidade: selectedUnidade,
  token: sessionToken,
  page,
  pageSize: 10,
});

const documentos = data?.Documentos || [];

// Ao trocar de página, mostra dados antigos enquanto carrega novos
<Button
  onClick={() => setPage(p => p + 1)}
  disabled={isPreviousData}
>
  Próxima Página
</Button>
```

## Exemplo 3: useProcessSummary (IA)

```typescript
'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchProcessSummaryWithToken } from '@/app/sei-actions';
import { queryKeys } from '../keys';
import type { ProcessSummaryResponse } from '@/types/process-flow';

interface UseProcessSummaryOptions {
  processo: string;
  unidade: string;
  token: string;
  enabled?: boolean;
}

/**
 * Hook para buscar resumo do processo gerado por IA
 *
 * TTL maior (1h) pois resumos raramente mudam
 */
export function useProcessSummary({
  processo,
  unidade,
  token,
  enabled = true,
}: UseProcessSummaryOptions): UseQueryResult<ProcessSummaryResponse, Error> {
  return useQuery<ProcessSummaryResponse, Error>({
    queryKey: queryKeys.processSummary.detail(processo, unidade),
    queryFn: async (): Promise<ProcessSummaryResponse> => {
      const result = await fetchProcessSummaryWithToken(
        token,
        processo,
        unidade
      );

      if ('error' in result) {
        throw new Error(result.error || 'Erro ao gerar resumo do processo');
      }

      return result;
    },
    enabled: enabled && !!token && !!processo && !!unidade,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000,    // 1 hora
    retry: 1, // Apenas 1 retry (chamada cara de IA)
    retryDelay: 3000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Não refetch ao reconectar (caro)
    networkMode: 'online',
  });
}
```

**Uso:**
```typescript
const { data, isLoading, error } = useProcessSummary({
  processo: numeroProcesso,
  unidade: selectedUnidade,
  token: sessionToken,
  enabled: userClickedSummary, // Só busca quando usuário pedir
});

const summary = data?.summary || '';
```

## Exemplo 4: useHealthCheck

```typescript
'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { checkSEIApiHealth } from '@/app/sei-actions';
import { queryKeys } from '../keys';
import type { HealthCheckResponse } from '@/types/process-flow';

/**
 * Hook para verificar saúde da API SEI
 *
 * Refetch automático a cada 30 segundos
 */
export function useHealthCheck(): UseQueryResult<HealthCheckResponse, Error> {
  return useQuery<HealthCheckResponse, Error>({
    queryKey: queryKeys.health.seiApi,
    queryFn: async (): Promise<HealthCheckResponse> => {
      const result = await checkSEIApiHealth();

      if ('error' in result) {
        throw new Error(result.error || 'Erro ao verificar saúde da API');
      }

      return result;
    },
    staleTime: 30 * 1000,   // 30 segundos
    gcTime: 60 * 1000,      // 1 minuto
    retry: 3,
    retryDelay: 1000,

    // Refetch automático
    refetchInterval: 30 * 1000, // A cada 30 segundos
    refetchIntervalInBackground: false,

    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: 'online',
  });
}
```

**Uso:**
```typescript
const { data: healthStatus, isError } = useHealthCheck();

const isHealthy = healthStatus?.status === 'healthy';

<Badge variant={isHealthy ? 'success' : 'destructive'}>
  {isHealthy ? 'Online' : 'Offline'}
</Badge>
```

## Padrão de TTL Recomendado

| Tipo de Dado | Stale Time | GC Time | Justificativa |
|--------------|------------|---------|---------------|
| Unidades em aberto | 5 min | 2h | Muda raramente |
| Andamentos | 2 min | 5 min | Muda frequentemente |
| Documentos | 10 min | 30 min | Raramente muda |
| Resumos (IA) | 30 min | 1h | Nunca muda + chamada cara |
| Health Check | 30 seg | 1 min | Precisa ser recente |
| Metadados | 1h | 4h | Praticamente estático |

## Dicas de Performance

### 1. Prefetching
```typescript
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/react-query/keys';

// Prefetch ao hover
<Link
  href={`/processo/${processo}`}
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.openUnits.detail(processo, unidade),
      queryFn: () => fetchOpenUnits(token, processo, unidade),
    });
  }}
>
  Ver Processo
</Link>
```

### 2. Optimistic Updates
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateProcesso,
  onMutate: async (newData) => {
    // Cancelar refetch em andamento
    await queryClient.cancelQueries({
      queryKey: queryKeys.processData.detail(processo, unidade)
    });

    // Snapshot do cache atual
    const previousData = queryClient.getQueryData(
      queryKeys.processData.detail(processo, unidade)
    );

    // Atualizar cache otimisticamente
    queryClient.setQueryData(
      queryKeys.processData.detail(processo, unidade),
      newData
    );

    return { previousData };
  },
  onError: (err, newData, context) => {
    // Rollback em caso de erro
    queryClient.setQueryData(
      queryKeys.processData.detail(processo, unidade),
      context?.previousData
    );
  },
  onSettled: () => {
    // Revalidar após sucesso ou erro
    queryClient.invalidateQueries({
      queryKey: queryKeys.processData.detail(processo, unidade)
    });
  },
});
```

### 3. Dependent Queries
```typescript
// Buscar unidades primeiro
const { data: openUnitsData } = useOpenUnits({
  processo,
  unidadeOrigem,
  token,
});

// Só buscar documentos após ter unidades
const { data: documents } = useDocuments({
  processo,
  unidade: openUnitsData?.unidades[0]?.Unidade.IdUnidade || '',
  token,
  enabled: !!openUnitsData?.unidades[0], // Dependency
});
```

## Checklist para Novo Hook

- [ ] Importar tipos corretos
- [ ] Definir interface de opções
- [ ] Usar query key da factory
- [ ] Implementar queryFn com error handling
- [ ] Configurar staleTime e gcTime apropriados
- [ ] Configurar retry strategy
- [ ] Configurar refetch policies
- [ ] Adicionar JSDoc com exemplos
- [ ] Adicionar tipo de retorno correto
- [ ] Testar com dados reais
- [ ] Testar error states
- [ ] Testar loading states

---

**Documentação completa:** [CACHE_IMPLEMENTATION.md](../../CACHE_IMPLEMENTATION.md)
