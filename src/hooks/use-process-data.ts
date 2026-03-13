"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProcessoData } from '@/types/process-flow';
import { fetchProcessData, invalidateProcessCache } from '@/lib/sei-api-client';
import { fetchSSEStreamWithRetry, getStreamProcessSummaryUrl, getStreamSituacaoAtualUrl, getStreamAndamentosProgressUrl } from '@/lib/streaming';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/react-query/keys';
import { stripProcessNumber } from '@/lib/utils';

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
  isAuthenticated: boolean;
  unitAccessDenied: boolean;
  onSessionExpired: () => void;
  refetchOpenUnits: () => void;
}

export function useProcessData({
  numeroProcesso,
  sessionToken,
  selectedUnidadeFiltro,
  isAuthenticated,
  unitAccessDenied,
  onSessionExpired,
  refetchOpenUnits,
}: UseProcessDataOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Streaming state (progressive display, not cached)
  const [resumoStreamText, setResumoStreamText] = useState<string>("");
  const [situacaoStreamText, setSituacaoStreamText] = useState<string>("");
  const [andamentosProgress, setAndamentosProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track Phase 2 SSE to prevent re-triggering
  const phase2StartedRef = useRef(false);

  const processo = numeroProcesso;
  const unidade = selectedUnidadeFiltro || '';
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

  const rawProcessData = andamentosQuery.data ?? null;
  const isPartialData = rawProcessData?.Info?.Parcial === true;

  // Extract document IDs from response
  const primeiroDocFormatado = rawProcessData?.DocumentosExtraidos?.primeiro ?? null;
  const ultimoDocFormatado = rawProcessData?.DocumentosExtraidos?.ultimo ?? null;

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

    const abortController = new AbortController();

    setAndamentosProgress({
      loaded: rawProcessData?.Andamentos?.length || 0,
      total: rawProcessData?.Info?.TotalItens || 0,
    });

    fetchSSEStreamWithRetry(
      getStreamAndamentosProgressUrl(processo, unidade),
      token,
      () => {}, // no chunks for this stream
      (fullResult: any) => {
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
        console.warn('Phase 2 SSE andamentos fetch failed, partial data remains:', error);
        setAndamentosProgress(null);
      },
      {
        signal: abortController.signal,
        onProgress: (progress) => setAndamentosProgress(progress),
      },
    );

    return () => abortController.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPartialData, token, processo, unidade]);

  // Reset Phase 2 ref when the query key changes (new process/unit)
  useEffect(() => {
    phase2StartedRef.current = false;
  }, [processo, unidade]);

  // ──────────────────────────────────────────────────────────────────────
  // Query 2: Resumo (SSE-based, wrapped in React Query)
  // ──────────────────────────────────────────────────────────────────────
  const resumoQuery = useQuery<string, Error>({
    queryKey: queryKeys.processSummary.detail(processo, unidade),

    queryFn: ({ signal }) => new Promise<string>((resolve, reject) => {
      setResumoStreamText("");

      // Handle query cancellation (unmount, invalidation)
      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Query cancelled', 'AbortError'));
        });
      }

      fetchSSEStreamWithRetry(
        getStreamProcessSummaryUrl(processo, unidade, primeiroDocFormatado || undefined),
        token,
        (chunk) => setResumoStreamText(prev => prev + chunk),
        (fullResult) => {
          const text = typeof fullResult === 'string'
            ? fullResult
            : fullResult?.resumo_combinado?.resposta_ia || fullResult?.resumo?.resposta_ia || "";
          resolve(text.replace(/[#*]/g, ''));
        },
        (error) => reject(new Error(error)),
        { signal },
      );
    }),

    enabled: !!rawProcessData && !unitAccessDenied && !!token && !!unidade,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false, // SSE has its own retry logic
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    networkMode: 'online',
  });

  // Retry resumo when primeiroDocFormatado becomes available after initial failure
  useEffect(() => {
    if (primeiroDocFormatado && resumoQuery.isError) {
      resumoQuery.refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeiroDocFormatado, resumoQuery.isError]);

  // ──────────────────────────────────────────────────────────────────────
  // Query 3: Situação Atual (SSE-based, waits for resumo)
  // ──────────────────────────────────────────────────────────────────────
  const situacaoQuery = useQuery<string, Error>({
    queryKey: queryKeys.situacaoAtual.detail(processo, unidade),

    queryFn: ({ signal }) => new Promise<string>((resolve, reject) => {
      setSituacaoStreamText("");

      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Query cancelled', 'AbortError'));
        });
      }

      fetchSSEStreamWithRetry(
        getStreamSituacaoAtualUrl(processo, unidade, ultimoDocFormatado || undefined),
        token,
        (chunk) => setSituacaoStreamText(prev => prev + chunk),
        (fullResult) => {
          const text = typeof fullResult === 'string'
            ? fullResult
            : fullResult?.situacao_atual || "";
          resolve(text.replace(/[#*]/g, ''));
        },
        (error) => reject(new Error(error)),
        { signal },
      );
    }),

    enabled: resumoQuery.isSuccess && !unitAccessDenied && !!token && !!unidade,
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
      await invalidateProcessCache(processo);
      phase2StartedRef.current = false;
      setResumoStreamText("");
      setSituacaoStreamText("");

      refetchOpenUnits();
      queryClient.invalidateQueries({ queryKey: queryKeys.andamentosCount.byProcess(processo) });
      queryClient.invalidateQueries({ queryKey: queryKeys.processData.detail(processo, unidade) });
      queryClient.invalidateQueries({ queryKey: queryKeys.processSummary.detail(processo, unidade) });
      queryClient.invalidateQueries({ queryKey: queryKeys.situacaoAtual.detail(processo, unidade) });
    } catch {
      toast({ title: "Erro ao atualizar", description: "Não foi possível invalidar o cache.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, hasBackgroundLoading, processo, unidade, refetchOpenUnits, queryClient, toast]);

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

  return {
    rawProcessData,
    processSummary,
    situacaoAtual,
    isLoading: andamentosQuery.isLoading,
    isRefreshing,
    lastFetchedAt: andamentosQuery.dataUpdatedAt ? new Date(andamentosQuery.dataUpdatedAt) : null,
    backgroundLoading,
    hasBackgroundLoading,
    loadingTasks,
    refresh,
    isPartialData,
    andamentosFailed: andamentosQuery.isError,
    andamentosProgress,
  };
}
