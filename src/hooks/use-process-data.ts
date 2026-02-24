"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ProcessoData, Documento } from '@/types/process-flow';
import { fetchProcessData, fetchDocuments, invalidateProcessCache } from '@/lib/sei-api-client';
import { fetchSSEStreamWithRetry, getStreamProcessSummaryUrl, getStreamSituacaoAtualUrl, getStreamAndamentosProgressUrl } from '@/lib/streaming';
import { withNetworkRetry } from '@/lib/network-retry';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';

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

  const [rawProcessData, setRawProcessData] = useState<ProcessoData | null>(null);
  const [documents, setDocuments] = useState<Documento[] | null>(null);
  const [processSummary, setProcessSummary] = useState<string | null>(null);
  const [situacaoAtual, setSituacaoAtual] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [isPartialData, setIsPartialData] = useState<boolean>(false);
  const [andamentosFailed, setAndamentosFailed] = useState<boolean>(false);
  const [documentsFailed, setDocumentsFailed] = useState<boolean>(false);
  const [andamentosProgress, setAndamentosProgress] = useState<{ loaded: number; total: number } | null>(null);

  // Ref to track phase-2 timeout for cleanup
  const phase2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [backgroundLoading, setBackgroundLoading] = useState({
    andamentos: false,
    documentos: false,
    resumo: false,
    situacao: false,
  });

  const hasBackgroundLoading = Object.values(backgroundLoading).some(loading => loading);

  // Auto-recover when network comes back online
  useNetworkStatus({
    onOnline: () => {
      setTimeout(() => {
        const dataComplete = rawProcessData && documents !== null && (processSummary !== null || unitAccessDenied);
        if (!dataComplete) {
          setRefreshKey((prev) => prev + 1);
        }
      }, 1500);
    },
  });

  // Load process data (two-phase: partial first, then full)
  useEffect(() => {
    if (!isAuthenticated || !sessionToken || !selectedUnidadeFiltro || !numeroProcesso) {
      return;
    }

    // Clear any pending phase-2 timer from previous render
    if (phase2TimerRef.current) {
      clearTimeout(phase2TimerRef.current);
      phase2TimerRef.current = null;
    }

    const loadProcessData = async () => {
      setIsLoading(true);
      setRawProcessData(null);
      setDocuments(null);
      setProcessSummary(null);
      setSituacaoAtual(null);
      setIsPartialData(false);
      setAndamentosFailed(false);
      setDocumentsFailed(false);
      setAndamentosProgress(null);

      setBackgroundLoading({
        andamentos: true,
        documentos: !unitAccessDenied,
        resumo: !unitAccessDenied,
        situacao: false,
      });

      if (unitAccessDenied) {
        setDocuments([]);
      }

      const token = sessionToken || '';
      if (!token) {
        toast({ title: "Sessão expirada", description: "Sua sessão expirou. Faça login novamente para continuar.", variant: "destructive" });
        setIsLoading(false);
        setBackgroundLoading({ andamentos: false, documentos: false, resumo: false, situacao: false });
        return;
      }

      // Phase 1: Fetch partial data (first+last pages) for fast initial render
      const andamentosPromise = withNetworkRetry(
        () => fetchProcessData(token, numeroProcesso, selectedUnidadeFiltro, true),
        'andamentos',
      );
      const documentosPromise = unitAccessDenied ? null : withNetworkRetry(
        () => fetchDocuments(token, numeroProcesso, selectedUnidadeFiltro, true),
        'documentos',
      );

      // Handle andamentos result (Phase 1)
      andamentosPromise
        .then((processData: any) => {
          if ('error' in processData && typeof processData.error === 'string') {
            let errorTitle = "Erro ao buscar dados do processo";
            let errorDescription = processData.error;
            if (processData.status === 422) { errorTitle = "Dados inválidos"; errorDescription = `Verifique se o número do processo está correto e se a unidade selecionada é a correta. O número deve ter 20 dígitos.`; }
            else if (processData.status === 404) { errorTitle = "Processo não localizado"; errorDescription = `O processo informado não foi encontrado na unidade '${selectedUnidadeFiltro}'. Verifique se o processo existe ou se está na unidade correta.`; }
            else if (processData.status === 401) { errorTitle = "Sessão expirada"; errorDescription = "Sua sessão no sistema expirou. Você será redirecionado para fazer login novamente."; onSessionExpired(); }
            else if (processData.status === 500) { errorTitle = "Erro no servidor SEI"; errorDescription = `O sistema SEI está temporariamente indisponível. Aguarde alguns minutos e tente novamente.`; }
            toast({ title: errorTitle, description: errorDescription, variant: "destructive", duration: 9000 });
            setRawProcessData(null);
            setAndamentosFailed(true);
            setIsLoading(false);
            setBackgroundLoading(prev => ({ ...prev, andamentos: false }));
            return;
          }

          if (!('error' in processData) && processData.Andamentos && Array.isArray(processData.Andamentos)) {
            const isParcial = processData.Info?.Parcial === true;
            setRawProcessData(processData);
            setLastFetchedAt(new Date());
            setIsPartialData(isParcial);

            if (isParcial) {
              toast({ title: "Processo carregado", description: `Exibindo ${processData.Andamentos.length} de ${processData.Info?.TotalItens || '?'} andamentos. Carregando restante...` });
            } else {
              toast({ title: "Processo carregado com sucesso", description: `Encontrados ${processData.Andamentos.length} andamentos para visualização.` });
            }

            // Phase 2: If partial, use SSE stream to fetch full data with progress
            if (isParcial) {
              setAndamentosProgress({ loaded: processData.Andamentos.length, total: processData.Info?.TotalItens || 0 });
              fetchSSEStreamWithRetry(
                getStreamAndamentosProgressUrl(numeroProcesso, selectedUnidadeFiltro),
                token,
                () => {}, // no chunks for this stream
                (fullResult: any) => {
                  if (fullResult?.Andamentos && Array.isArray(fullResult.Andamentos)) {
                    setRawProcessData(fullResult);
                    setIsPartialData(false);
                    toast({ title: "Dados completos carregados", description: `Todos os ${fullResult.Andamentos.length} andamentos foram carregados.` });
                  }
                  setAndamentosProgress(null);
                },
                (error) => {
                  console.warn('Phase 2 SSE andamentos fetch failed, partial data remains:', error);
                  setAndamentosProgress(null);
                },
                {
                  onProgress: (progress) => {
                    setAndamentosProgress(progress);
                  },
                },
              );
            }
          } else {
            toast({ title: "Formato de dados inesperado", description: "Os dados recebidos não estão no formato esperado. Entre em contato com o suporte técnico.", variant: "destructive" });
            setRawProcessData(null);
            setAndamentosFailed(true);
          }
          setIsLoading(false);
          setBackgroundLoading(prev => ({ ...prev, andamentos: false }));
        })
        .catch(() => {
          setRawProcessData(null);
          setAndamentosFailed(true);
          toast({ title: "Erro ao Buscar Andamentos", description: "Falha na requisição de andamentos.", variant: "destructive" });
          setIsLoading(false);
          setBackgroundLoading(prev => ({ ...prev, andamentos: false }));
        });

      // Handle documents result (Phase 1 — partial)
      if (documentosPromise) {
        documentosPromise
          .then((documentsResponse: any) => {
            if ('error' in documentsResponse) {
              setDocuments([]);
              setDocumentsFailed(true);
            } else {
              setDocuments(documentsResponse.Documentos);

              // Phase 2: If partial docs, schedule full fetch
              const isDocsParcial = documentsResponse.Info?.Parcial === true;
              if (isDocsParcial) {
                setTimeout(() => {
                  withNetworkRetry(
                    () => fetchDocuments(token, numeroProcesso, selectedUnidadeFiltro, false),
                    'documentos-full',
                  ).then((fullDocsResponse: any) => {
                    if (!('error' in fullDocsResponse) && fullDocsResponse.Documentos) {
                      setDocuments(fullDocsResponse.Documentos);
                    }
                  }).catch(() => {
                    console.warn('Phase 2 full documents fetch failed, partial data remains');
                  });
                }, 4000);
              }
            }
            setBackgroundLoading(prev => ({ ...prev, documentos: false }));
          })
          .catch(() => {
            setDocuments([]);
            setDocumentsFailed(true);
            setBackgroundLoading(prev => ({ ...prev, documentos: false }));
          });
      }

      // SSE streaming for resumo
      if (!unitAccessDenied) {
        setProcessSummary("");
        fetchSSEStreamWithRetry(
          getStreamProcessSummaryUrl(numeroProcesso, selectedUnidadeFiltro),
          token,
          (chunk) => {
            setProcessSummary(prev => (prev || "") + chunk);
          },
          (fullResult) => {
            const summaryText = typeof fullResult === 'string'
              ? fullResult
              : fullResult?.resumo_combinado?.resposta_ia || fullResult?.resumo?.resposta_ia || "";
            setProcessSummary(summaryText.replace(/[#*]/g, ''));
            setBackgroundLoading(prev => ({ ...prev, resumo: false }));
            toast({ title: "Resumo do Processo Gerado", description: "Resumo carregado com sucesso." });
          },
          (error) => {
            setProcessSummary(null);
            setBackgroundLoading(prev => ({ ...prev, resumo: false }));
            toast({ title: "Erro ao Gerar Resumo", description: typeof error === 'string' ? error : "Falha na conexão", variant: "destructive", duration: 9000 });
          },
        );
      }
    };

    loadProcessData();

    return () => {
      if (phase2TimerRef.current) {
        clearTimeout(phase2TimerRef.current);
        phase2TimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionToken, selectedUnidadeFiltro, numeroProcesso, refreshKey, unitAccessDenied]);

  // Eager-load situação atual when dependencies are ready
  useEffect(() => {
    if (unitAccessDenied) return;
    if (situacaoAtual !== null) return;
    if (backgroundLoading.situacao) return;
    if (backgroundLoading.resumo || !processSummary) return;
    if (rawProcessData === null) return;
    if (documents === null) return;
    if (!sessionToken || !selectedUnidadeFiltro) return;

    setBackgroundLoading(prev => ({ ...prev, situacao: true }));
    setSituacaoAtual("");

    fetchSSEStreamWithRetry(
      getStreamSituacaoAtualUrl(numeroProcesso, selectedUnidadeFiltro),
      sessionToken,
      (chunk) => {
        setSituacaoAtual(prev => (prev || "") + chunk);
      },
      (fullResult) => {
        const text = typeof fullResult === 'string'
          ? fullResult
          : fullResult?.situacao_atual || "";
        setSituacaoAtual(text.replace(/[#*]/g, ''));
        setBackgroundLoading(prev => ({ ...prev, situacao: false }));
      },
      (error) => {
        setSituacaoAtual(null);
        setBackgroundLoading(prev => ({ ...prev, situacao: false }));
        console.warn("Erro ao buscar situação atual via SSE:", error);
      },
    );
  }, [processSummary, backgroundLoading.resumo, rawProcessData, documents, situacaoAtual, backgroundLoading.situacao, sessionToken, selectedUnidadeFiltro, numeroProcesso, unitAccessDenied]);

  // Loading tasks for UI feedback
  const loadingTasks = useMemo(() => {
    const tasks: string[] = [];
    if (backgroundLoading.andamentos) {
      const total = rawProcessData?.Info?.TotalItens;
      const loaded = rawProcessData?.Andamentos?.length;
      if (total && loaded) {
        tasks.push(`Buscando andamentos do processo (${loaded}/${total})`);
      } else {
        tasks.push("Buscando andamentos do processo");
      }
    } else if (andamentosProgress) {
      tasks.push(`Buscando andamentos do processo (${andamentosProgress.loaded}/${andamentosProgress.total})`);
    }
    if (backgroundLoading.documentos) tasks.push("Carregando documentos");
    if (backgroundLoading.resumo) tasks.push("Gerando resumo com IA");
    return tasks;
  }, [backgroundLoading, rawProcessData?.Info?.TotalItens, rawProcessData?.Andamentos?.length, andamentosProgress]);

  const refresh = useCallback(async () => {
    if (isRefreshing || hasBackgroundLoading) return;
    setIsRefreshing(true);
    try {
      await invalidateProcessCache(numeroProcesso);
      refetchOpenUnits();
      setRefreshKey(prev => prev + 1);
      toast({ title: "Atualizando dados", description: "Cache invalidado. Buscando dados atualizados..." });
    } catch {
      toast({ title: "Erro ao atualizar", description: "Não foi possível invalidar o cache.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, hasBackgroundLoading, numeroProcesso, refetchOpenUnits, toast]);

  return {
    rawProcessData,
    documents,
    processSummary,
    situacaoAtual,
    isLoading,
    isRefreshing,
    lastFetchedAt,
    backgroundLoading,
    hasBackgroundLoading,
    loadingTasks,
    refresh,
    isPartialData,
    andamentosFailed,
    documentsFailed,
    andamentosProgress,
  };
}
