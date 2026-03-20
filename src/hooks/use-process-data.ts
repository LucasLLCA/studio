"use client";

import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProcessoData } from '@/types/process-flow';
import { fetchProcessData, invalidateProcessCache } from '@/lib/sei-api-client';
import { fetchSSEStreamWithRetry, getStreamProcessSummaryUrl, getStreamSituacaoAtualUrl, getStreamAndamentosProgressUrl } from '@/lib/streaming';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/react-query/keys';
import { stripProcessNumber } from '@/lib/utils';
import { isD1Available, fetchD1Andamentos, transformD1ToProcessoData, mergeD1WithSEI, type D1Response } from '@/lib/api/d1-api';

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

  // Debug: data source override ('merged' = d1+sei, 'sei-only' = sei only)
  const [debugDataSource, setDebugDataSource] = useState<'merged' | 'sei-only'>('merged');

  // Streaming state (progressive display, not cached)
  const [resumoStreamText, setResumoStreamText] = useState<string>("");
  const [situacaoStreamText, setSituacaoStreamText] = useState<string>("");
  const [andamentosProgress, setAndamentosProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track Phase 2 SSE to prevent re-triggering
  const phase2StartedRef = useRef(false);

  // Track which primeiroDocFormatado value we already retried resumo with
  const resumoRetriedForDocRef = useRef<string | null>(null);

  // AbortControllers for all SSE streams — enables clean cancellation on refresh/unmount
  const phase2AbortRef = useRef<AbortController | null>(null);

  // D-1 data_carga timestamp
  const d1DataCargaRef = useRef<string | null>(null);

  const processo = numeroProcesso;
  const unidade = selectedUnidadeFiltro || '';
  const resumoUnidade = resumoUnidadeOverride || unidade;
  const token = sessionToken || '';

  // ──────────────────────────────────────────────────────────────────────
  // Query 1: Andamentos (Phase 1 — partial fetch)
  // ──────────────────────────────────────────────────────────────────────
  const andamentosQuery = useQuery<ProcessoData, ProcessDataError>({
    queryKey: queryKeys.processData.detail(processo, unidade),

    queryFn: async () => {
      const result = await fetchWithRetry(
        () => fetchProcessData(token, processo, unidade, true, true),
        'andamentos',
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

    enabled: isAuthenticated && !!token && !!unidade && !!processo,
    staleTime: 2 * 60 * 1000, // 2 minutes — backend validates with TotalItens anyway
    gcTime: 30 * 60 * 1000, // 30 minutes

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
  // Phase 0: D-1 fast load (no auth needed, instant)
  // ──────────────────────────────────────────────────────────────────────
  const d1Enabled = isD1Available();

  const d1Query = useQuery<ProcessoData | null>({
    queryKey: queryKeys.d1Andamentos.byProcess(processo),

    queryFn: async () => {
      const d1Response = await fetchD1Andamentos(processo);
      if (!d1Response) return null;
      d1DataCargaRef.current = d1Response.data_carga ?? null;
      return transformD1ToProcessoData(d1Response);
    },

    enabled: d1Enabled && !!processo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    retry: false, // fail fast
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Merge D-1 + SEI data (respects debug override)
  const rawProcessData = useMemo(() => {
    const seiData = andamentosQuery.data ?? null;
    const d1Data = d1Query.data ?? null;

    // Debug: force SEI-only mode
    if (debugDataSource === 'sei-only') {
      return seiData;
    }

    if (seiData && d1Data) {
      return mergeD1WithSEI(d1Data, seiData.Andamentos, seiData.Info.TotalItens);
    }
    if (seiData) return seiData;
    if (d1Data) return d1Data; // D-1 only while SEI loads
    return null;
  }, [andamentosQuery.data, d1Query.data, debugDataSource]);

  const isD1Only = debugDataSource === 'merged' && !!d1Query.data && !andamentosQuery.data;

  const isPartialData = (andamentosQuery.data ?? null)?.Info?.Parcial === true;

  // Extract document IDs from response
  const primeiroDocFormatado = (andamentosQuery.data ?? null)?.DocumentosExtraidos?.primeiro ?? null;
  const ultimoDocFormatado = (andamentosQuery.data ?? null)?.DocumentosExtraidos?.ultimo ?? null;

  // ──────────────────────────────────────────────────────────────────────
  // Error handling for andamentos
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!andamentosQuery.error) return;
    const error = andamentosQuery.error;
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
  }, [andamentosQuery.error]);

  // ──────────────────────────────────────────────────────────────────────
  // Phase 2: Full andamentos via SSE (when Phase 1 returns partial)
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPartialData || !token || !unidade) return;

    // Prevent re-triggering when setQueryData updates the data
    if (phase2StartedRef.current) return;
    phase2StartedRef.current = true;

    // Abort any previous Phase 2 stream before starting a new one
    phase2AbortRef.current?.abort();
    const abortController = new AbortController();
    phase2AbortRef.current = abortController;

    setAndamentosProgress({
      loaded: rawProcessData?.Andamentos?.length || 0,
      total: rawProcessData?.Info?.TotalItens || 0,
    });

    // Safety timeout: clear progress if SSE hangs (5 minutes)
    const PHASE2_TIMEOUT_MS = 5 * 60 * 1000;
    const timeoutId = setTimeout(() => {
      if (!abortController.signal.aborted) {
        console.warn('Phase 2 SSE timed out, clearing progress');
        abortController.abort();
        setAndamentosProgress(null);
      }
    }, PHASE2_TIMEOUT_MS);

    fetchSSEStreamWithRetry(
      getStreamAndamentosProgressUrl(processo, unidade),
      token,
      () => {}, // no chunks for this stream
      (fullResult: any) => {
        clearTimeout(timeoutId);
        // Ignore results from aborted streams
        if (abortController.signal.aborted) return;
        if (fullResult?.Andamentos && Array.isArray(fullResult.Andamentos)) {
          // Client-side doc extraction for full data
          const fullDocs = extractDocsFromAndamentos(fullResult.Andamentos);
          const qk = queryKeys.processData.detail(processo, unidade);

          queryClient.setQueryData(qk, (old: ProcessoData | undefined) => ({
            ...fullResult,
            DocumentosExtraidos: {
              primeiro: old?.DocumentosExtraidos?.primeiro || fullDocs.primeiro,
              ultimo: fullDocs.ultimo || old?.DocumentosExtraidos?.ultimo,
            },
          }));
        }
        setAndamentosProgress(null);
      },
      (error) => {
        clearTimeout(timeoutId);
        if (abortController.signal.aborted) return;
        console.warn('Phase 2 SSE andamentos fetch failed, partial data remains:', error);
        setAndamentosProgress(null);
      },
      {
        signal: abortController.signal,
        onProgress: (progress) => startTransition(() => setAndamentosProgress(progress)),
      },
    );

    return () => { abortController.abort(); clearTimeout(timeoutId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPartialData, token, processo, unidade]);

  // Reset Phase 2 ref when the query key changes (new process/unit)
  useEffect(() => {
    phase2StartedRef.current = false;
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
    andamentos: andamentosQuery.isFetching || !!andamentosProgress,
    resumo: resumoQuery.isFetching,
    situacao: situacaoQuery.isFetching,
  };
  const hasBackgroundLoading = Object.values(backgroundLoading).some(Boolean);

  const loadingTasks = useMemo(() => {
    const tasks: string[] = [];
    if (andamentosQuery.isFetching || andamentosProgress) {
      if (andamentosProgress) {
        tasks.push(`Buscando andamentos do processo (${andamentosProgress.loaded}/${andamentosProgress.total})`);
      } else {
        tasks.push("Buscando andamentos do processo");
      }
    }
    if (resumoQuery.isFetching) tasks.push("Gerando resumo com IA");
    return tasks;
  }, [andamentosQuery.isFetching, resumoQuery.isFetching, andamentosProgress]);

  // ──────────────────────────────────────────────────────────────────────
  // Refresh (invalidates backend cache then React Query cache)
  // ──────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (isRefreshing || hasBackgroundLoading) return;
    setIsRefreshing(true);
    try {
      // Abort all in-flight SSE streams before invalidating queries.
      // Phase 3 (resumo) and Phase 4 (situação) are managed by React Query's
      // built-in AbortSignal — invalidateQueries will cancel and re-trigger them.
      // Phase 2 uses a manual AbortController since it's outside React Query.
      phase2AbortRef.current?.abort();
      phase2AbortRef.current = null;

      await invalidateProcessCache(processo);
      phase2StartedRef.current = false;
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
          andamentosQuery.refetch();
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
      phase2AbortRef.current?.abort();
      phase2AbortRef.current = null;

      // Clear backend Redis cache for this processo
      await invalidateProcessCache(processo);

      phase2StartedRef.current = false;
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
      queryClient.invalidateQueries({ queryKey: queryKeys.processData.detail(processo, unidade) });
    } catch {
      toast({ title: "Erro ao atualizar", description: "Não foi possível limpar o cache.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, hasBackgroundLoading, processo, unidade, resumoUnidade, queryClient, toast]);

  // Loading: true only when NEITHER source has data yet
  const isLoading = d1Enabled
    ? !d1Query.data && andamentosQuery.isLoading
    : andamentosQuery.isLoading;

  return {
    rawProcessData,
    processSummary,
    situacaoAtual,
    isLoading,
    isRefreshing,
    lastFetchedAt: andamentosQuery.dataUpdatedAt ? new Date(andamentosQuery.dataUpdatedAt) : null,
    backgroundLoading,
    hasBackgroundLoading,
    loadingTasks,
    refresh,
    isPartialData,
    andamentosFailed: andamentosQuery.isError,
    andamentosProgress,
    resumoFailed: resumoQuery.isError,
    resumoError: resumoQuery.error?.message ?? null,
    retryResumo,
    dataCarga: d1DataCargaRef.current,
    isD1Only,
    debugDataSource,
    setDebugDataSource,
    refreshNoCache,
  };
}
