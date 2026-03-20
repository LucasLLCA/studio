"use client";

import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProcessoData } from '@/types/process-flow';
import { fetchAndamentosDelta, fetchAndamentosCount, invalidateProcessCache } from '@/lib/sei-api-client';
import { fetchSSEStreamWithRetry, getStreamProcessSummaryUrl, getStreamSituacaoAtualUrl } from '@/lib/streaming';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/react-query/keys';
import { stripProcessNumber } from '@/lib/utils';
import { fetchD1Andamentos, transformD1ToProcessoData, mergeD1WithSEI, type D1Response } from '@/lib/api/d1-api';

const SSE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

/** Race a promise against a timeout. Rejects with a clear message if timeout fires first. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: ${label} não respondeu em ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Retry a fetch on server errors (5xx) or network failures. Skips retry for 4xx client errors. */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      const status = result && typeof result === 'object' && 'status' in result
        ? (result as { status: number }).status
        : 0;
      const isRetryable = status >= 500;
      if (!isRetryable || attempt === maxRetries) return result;
      const delay = 2000 * (attempt + 1);
      console.warn(`[RETRY] ${label}: tentativa ${attempt + 1}/${maxRetries} falhou (${status}), aguardando ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = 2000 * (attempt + 1);
      console.warn(`[RETRY] ${label}: tentativa ${attempt + 1}/${maxRetries} erro de rede, aguardando ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return fn();
}

// Client-side doc extraction from andamentos (mirrors backend logic)
const DOC_TASK_PREFIXES = [
  "GERACAO-DOCUMENTO",
  "ASSINATURA-DOCUMENTO",
  "DOCUMENTO-INCLUIDO-EM-BLOCO",
  "DOCUMENTO-RETIRADO-DO-BLOCO",
];

function extractDocsFromAndamentos(andamentos: any[]): { primeiro: string | null; ultimo: string | null } {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const a of andamentos) {
    const tarefa = a.Tarefa || "";
    if (!DOC_TASK_PREFIXES.some(p => tarefa.startsWith(p))) continue;
    const attrs = a.Atributos || [];
    if (attrs.length > 0) {
      const val = attrs[0].Valor || "";
      if (val && !seen.has(val)) {
        seen.add(val);
        ordered.push(val);
      }
    }
  }
  return {
    primeiro: ordered[0] || null,
    ultimo: ordered[ordered.length - 1] || null,
  };
}

/** Custom error with HTTP status code */
class ProcessDataError extends Error {
  status: number;
  constructor(result: { error: string; status?: number }) {
    super(result.error);
    this.status = result.status || 500;
  }
}

interface UseProcessDataOptions {
  numeroProcesso: string;
  sessionToken: string | null;
  selectedUnidadeFiltro: string | undefined;
  resumoUnidadeOverride?: string;
  isAuthenticated: boolean;
  unitAccessDenied: boolean;
  onSessionExpired: () => void;
}

export function useProcessData({
  numeroProcesso,
  sessionToken,
  selectedUnidadeFiltro,
  resumoUnidadeOverride,
  isAuthenticated,
  unitAccessDenied,
  onSessionExpired,
}: UseProcessDataOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Streaming state (progressive display, not cached)
  const [resumoStreamText, setResumoStreamText] = useState<string>("");
  const [situacaoStreamText, setSituacaoStreamText] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track which primeiroDocFormatado value we already retried resumo with
  const resumoRetriedForDocRef = useRef<string | null>(null);

  // D-1 data_carga timestamp
  const d1DataCargaRef = useRef<string | null>(null);

  const processo = numeroProcesso;
  const unidade = selectedUnidadeFiltro || '';
  const resumoUnidade = resumoUnidadeOverride || unidade;
  const token = sessionToken || '';

  // ──────────────────────────────────────────────────────────────────────
  // Phase 0: D-1 fast load (primary data source, no auth needed)
  // ──────────────────────────────────────────────────────────────────────
  const d1Query = useQuery<ProcessoData | null>({
    queryKey: queryKeys.d1Andamentos.byProcess(processo),

    queryFn: async () => {
      const d1Response = await fetchD1Andamentos(processo);
      if (!d1Response) return null;
      d1DataCargaRef.current = d1Response.data_carga ?? null;
      return transformD1ToProcessoData(d1Response);
    },

    enabled: !!processo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    retry: false, // fail fast
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Extract document IDs from D-1 data
  const d1Docs = useMemo(() => {
    const andamentos = d1Query.data?.Andamentos;
    if (!andamentos || andamentos.length === 0) return { primeiro: null, ultimo: null };
    return extractDocsFromAndamentos(andamentos);
  }, [d1Query.data]);

  // ──────────────────────────────────────────────────────────────────────
  // Phase 1: Count check (lightweight, validates auth + gets SEI total)
  // ──────────────────────────────────────────────────────────────────────
  const countQuery = useQuery<{ total_itens: number }, ProcessDataError>({
    queryKey: queryKeys.andamentosCount.byProcess(processo),

    queryFn: async () => {
      const result = await fetchWithRetry(
        () => fetchAndamentosCount(token, processo, unidade),
        'andamentos-count',
      );

      if ('error' in result && typeof (result as any).error === 'string') {
        throw new ProcessDataError(result as { error: string; status?: number });
      }

      return result as { total_itens: number };
    },

    enabled: isAuthenticated && !!token && !!unidade && !!processo,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.status < 500) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => 2000 * (attempt + 1),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  });

  // ──────────────────────────────────────────────────────────────────────
  // Phase 2: Delta fetch (only new andamentos since D-1 snapshot)
  // ──────────────────────────────────────────────────────────────────────
  const d1Total = d1Query.data?.Info?.TotalItens ?? 0;
  const seiTotal = countQuery.data?.total_itens ?? 0;
  const delta = seiTotal > d1Total ? seiTotal - d1Total : 0;

  const deltaQuery = useQuery<ProcessoData | null, ProcessDataError>({
    queryKey: queryKeys.processData.detail(processo, unidade),

    queryFn: async () => {
      if (delta === 0) return null;

      const result = await fetchWithRetry(
        () => fetchAndamentosDelta(token, processo, unidade, delta, 1),
        'andamentos-delta',
      );

      if ('error' in result && typeof (result as any).error === 'string') {
        throw new ProcessDataError(result as { error: string; status?: number });
      }

      const data = result as ProcessoData;
      if (!data.Andamentos || !Array.isArray(data.Andamentos)) {
        throw new ProcessDataError({ error: "Formato de dados inesperado", status: 500 });
      }

      return data;
    },

    enabled: isAuthenticated && !!token && !!unidade && !!processo && countQuery.isSuccess && !!d1Query.data,
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.status < 500) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => 2000 * (attempt + 1),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    networkMode: 'online',
  });

  // Merge D-1 + delta SEI data
  const rawProcessData = useMemo(() => {
    const d1Data = d1Query.data ?? null;
    const deltaData = deltaQuery.data ?? null;

    if (d1Data && deltaData && deltaData.Andamentos.length > 0) {
      return mergeD1WithSEI(d1Data, deltaData.Andamentos, seiTotal);
    }
    if (d1Data) {
      // D-1 data with SEI total (update TotalItens if count is available)
      if (seiTotal > 0) {
        return {
          ...d1Data,
          Info: { ...d1Data.Info, TotalItens: seiTotal },
        };
      }
      return d1Data;
    }
    return null;
  }, [d1Query.data, deltaQuery.data, seiTotal]);

  // Extract document IDs — prefer delta data (has fresh SEI IDs), fallback to D-1
  const deltaDocs = useMemo(() => {
    const andamentos = deltaQuery.data?.Andamentos;
    if (!andamentos || andamentos.length === 0) return { primeiro: null, ultimo: null };
    return extractDocsFromAndamentos(andamentos);
  }, [deltaQuery.data]);

  const primeiroDocFormatado = deltaDocs.primeiro || d1Docs.primeiro;
  const ultimoDocFormatado = deltaDocs.ultimo || d1Docs.ultimo;

  // ──────────────────────────────────────────────────────────────────────
  // Error handling for count/delta queries
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const error = countQuery.error || deltaQuery.error;
    if (!error) return;
    const status = error.status;

    let title = "Erro ao buscar dados do processo";
    let description = error.message || "Falha na requisição de andamentos.";

    if (status === 422) {
      title = "Dados inválidos";
      description = "Verifique se o número do processo está correto e se a unidade selecionada é a correta.";
    } else if (status === 404) {
      title = "Processo não localizado";
      description = `O processo informado não foi encontrado na unidade '${unidade}'.`;
    } else if (status === 401) {
      title = "Sessão expirada";
      description = "Sua sessão no sistema expirou. Você será redirecionado para fazer login novamente.";
      onSessionExpired();
    } else if (status === 500) {
      title = "Erro no servidor SEI";
      description = "O sistema SEI está temporariamente indisponível. Aguarde alguns minutos e tente novamente.";
    }

    toast({ title, description, variant: "destructive", duration: 9000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countQuery.error, deltaQuery.error]);

  // Reset retry ref when the query key changes (new process/unit)
  useEffect(() => {
    resumoRetriedForDocRef.current = null;
  }, [processo, unidade]);

  // ──────────────────────────────────────────────────────────────────────
  // Query 2: Resumo (SSE-based, wrapped in React Query)
  // ──────────────────────────────────────────────────────────────────────
  const resumoQuery = useQuery<string, Error>({
    queryKey: queryKeys.processSummary.detail(processo, resumoUnidade),

    queryFn: ({ signal }) => withTimeout(new Promise<string>((resolve, reject) => {
      setResumoStreamText("");

      // Handle query cancellation (unmount, invalidation)
      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Query cancelled', 'AbortError'));
        });
      }

      fetchSSEStreamWithRetry(
        getStreamProcessSummaryUrl(processo, resumoUnidade, primeiroDocFormatado || undefined),
        token,
        (chunk) => startTransition(() => setResumoStreamText(prev => prev + chunk)),
        (fullResult) => {
          const text = typeof fullResult === 'string'
            ? fullResult
            : fullResult?.resumo_combinado?.resposta_ia || fullResult?.resumo?.resposta_ia || "";
          resolve(text.replace(/[#*]/g, ''));
        },
        (error) => reject(new Error(error)),
        { signal },
      );
    }), SSE_TIMEOUT_MS, 'resumo'),

    enabled: !!rawProcessData && !unitAccessDenied && !!token && !!resumoUnidade,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false, // SSE has its own retry logic
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    networkMode: 'online',
  });

  // Retry resumo once when primeiroDocFormatado first becomes available after a failure
  useEffect(() => {
    if (
      primeiroDocFormatado &&
      resumoQuery.isError &&
      resumoRetriedForDocRef.current !== primeiroDocFormatado
    ) {
      resumoRetriedForDocRef.current = primeiroDocFormatado;
      resumoQuery.refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeiroDocFormatado, resumoQuery.isError]);

  // ──────────────────────────────────────────────────────────────────────
  // Query 3: Situação Atual (SSE-based, waits for resumo)
  // ──────────────────────────────────────────────────────────────────────
  const situacaoQuery = useQuery<string, Error>({
    queryKey: queryKeys.situacaoAtual.detail(processo, resumoUnidade),

    queryFn: ({ signal }) => withTimeout(new Promise<string>((resolve, reject) => {
      setSituacaoStreamText("");

      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Query cancelled', 'AbortError'));
        });
      }

      fetchSSEStreamWithRetry(
        getStreamSituacaoAtualUrl(processo, resumoUnidade, ultimoDocFormatado || undefined),
        token,
        (chunk) => startTransition(() => setSituacaoStreamText(prev => prev + chunk)),
        (fullResult) => {
          const text = typeof fullResult === 'string'
            ? fullResult
            : fullResult?.situacao_atual || "";
          resolve(text.replace(/[#*]/g, ''));
        },
        (error) => reject(new Error(error)),
        { signal },
      );
    }), SSE_TIMEOUT_MS, 'situação atual'),

    enabled: resumoQuery.isSuccess && !unitAccessDenied && !!token && !!resumoUnidade,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    networkMode: 'online',
  });

  // ──────────────────────────────────────────────────────────────────────
  // Computed values (matching previous hook interface)
  // ──────────────────────────────────────────────────────────────────────

  // Cached final result takes precedence; streaming text shown during fetch
  const processSummary = resumoQuery.data ?? (resumoQuery.isFetching && resumoStreamText ? resumoStreamText : null);
  const situacaoAtual = situacaoQuery.data ?? (situacaoQuery.isFetching && situacaoStreamText ? situacaoStreamText : null);

  const backgroundLoading = {
    andamentos: countQuery.isFetching || deltaQuery.isFetching,
    resumo: resumoQuery.isFetching,
    situacao: situacaoQuery.isFetching,
  };
  const hasBackgroundLoading = Object.values(backgroundLoading).some(Boolean);

  const loadingTasks = useMemo(() => {
    const tasks: string[] = [];
    if (countQuery.isFetching || deltaQuery.isFetching) {
      tasks.push("Sincronizando andamentos com SEI");
    }
    if (resumoQuery.isFetching) tasks.push("Gerando resumo com IA");
    return tasks;
  }, [countQuery.isFetching, deltaQuery.isFetching, resumoQuery.isFetching]);

  // ──────────────────────────────────────────────────────────────────────
  // Refresh (invalidates backend cache then React Query cache)
  // ──────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (isRefreshing || hasBackgroundLoading) return;
    setIsRefreshing(true);
    try {
      await invalidateProcessCache(processo);
      resumoRetriedForDocRef.current = null;
      setResumoStreamText("");
      setSituacaoStreamText("");

      queryClient.invalidateQueries({ queryKey: queryKeys.d1Andamentos.byProcess(processo) });
      queryClient.invalidateQueries({ queryKey: queryKeys.andamentosCount.byProcess(processo) });
      queryClient.invalidateQueries({ queryKey: queryKeys.processData.detail(processo, unidade) });
      queryClient.invalidateQueries({ queryKey: queryKeys.processSummary.detail(processo, resumoUnidade) });
      queryClient.invalidateQueries({ queryKey: queryKeys.situacaoAtual.detail(processo, resumoUnidade) });
    } catch {
      toast({ title: "Erro ao atualizar", description: "Não foi possível invalidar o cache.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, hasBackgroundLoading, processo, unidade, resumoUnidade, queryClient, toast]);

  // ──────────────────────────────────────────────────────────────────────
  // Network recovery
  // ──────────────────────────────────────────────────────────────────────
  useNetworkStatus({
    onOnline: () => {
      setTimeout(() => {
        if (!rawProcessData) {
          d1Query.refetch();
        }
      }, 1500);
    },
  });

  const retryResumo = useCallback(() => {
    resumoRetriedForDocRef.current = null;
    queryClient.invalidateQueries({ queryKey: queryKeys.processSummary.detail(processo, resumoUnidade) });
    queryClient.invalidateQueries({ queryKey: queryKeys.situacaoAtual.detail(processo, resumoUnidade) });
  }, [processo, resumoUnidade, queryClient]);

  // Refresh without cache — clears backend cache first, then does a full refresh
  const refreshNoCache = useCallback(async () => {
    if (isRefreshing || hasBackgroundLoading) return;
    setIsRefreshing(true);
    try {
      // Clear backend Redis cache for this processo
      await invalidateProcessCache(processo);

      resumoRetriedForDocRef.current = null;
      setResumoStreamText("");
      setSituacaoStreamText("");

      // Remove React Query cached data so queries refetch from scratch
      queryClient.removeQueries({ queryKey: queryKeys.d1Andamentos.byProcess(processo) });
      queryClient.removeQueries({ queryKey: queryKeys.andamentosCount.byProcess(processo) });
      queryClient.removeQueries({ queryKey: queryKeys.processData.detail(processo, unidade) });
      queryClient.removeQueries({ queryKey: queryKeys.processSummary.detail(processo, resumoUnidade) });
      queryClient.removeQueries({ queryKey: queryKeys.situacaoAtual.detail(processo, resumoUnidade) });

      // Re-trigger fetches
      queryClient.invalidateQueries({ queryKey: queryKeys.d1Andamentos.byProcess(processo) });
      queryClient.invalidateQueries({ queryKey: queryKeys.andamentosCount.byProcess(processo) });
    } catch {
      toast({ title: "Erro ao atualizar", description: "Não foi possível limpar o cache.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, hasBackgroundLoading, processo, unidade, resumoUnidade, queryClient, toast]);

  // Loading: true only when D-1 hasn't returned data yet
  const isLoading = !d1Query.data && d1Query.isLoading;

  const andamentosFailed = countQuery.isError || deltaQuery.isError;

  return {
    rawProcessData,
    processSummary,
    situacaoAtual,
    isLoading,
    isRefreshing,
    lastFetchedAt: d1Query.dataUpdatedAt ? new Date(d1Query.dataUpdatedAt) : null,
    backgroundLoading,
    hasBackgroundLoading,
    loadingTasks,
    refresh,
    andamentosFailed,
    resumoFailed: resumoQuery.isError,
    resumoError: resumoQuery.error?.message ?? null,
    retryResumo,
    dataCarga: d1DataCargaRef.current,
    refreshNoCache,
  };
}
