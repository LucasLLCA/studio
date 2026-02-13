"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProcessoData, Documento } from '@/types/process-flow';
import { fetchProcessDataFromSEIWithToken, fetchDocumentsFromSEIWithToken, invalidateProcessCache } from '@/app/sei-actions';
import { fetchSSEStreamWithRetry, getStreamProcessSummaryUrl, getStreamSituacaoAtualUrl } from '@/lib/streaming';
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

  // Load process data
  useEffect(() => {
    if (!isAuthenticated || !sessionToken || !selectedUnidadeFiltro || !numeroProcesso) {
      return;
    }

    const loadProcessData = async () => {
      setIsLoading(true);
      setRawProcessData(null);
      setDocuments(null);
      setProcessSummary(null);
      setSituacaoAtual(null);

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

      const andamentosPromise = withNetworkRetry(
        () => fetchProcessDataFromSEIWithToken(token, numeroProcesso, selectedUnidadeFiltro),
        'andamentos',
      );
      const documentosPromise = unitAccessDenied ? null : withNetworkRetry(
        () => fetchDocumentsFromSEIWithToken(token, numeroProcesso, selectedUnidadeFiltro),
        'documentos',
      );

      // Handle andamentos result
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
          } else if (!('error' in processData) && processData.Andamentos && Array.isArray(processData.Andamentos)) {
            setRawProcessData(processData);
            setLastFetchedAt(new Date());
            toast({ title: "Processo carregado com sucesso", description: `Encontrados ${processData.Andamentos.length} andamentos para visualização.` });
          } else {
            toast({ title: "Formato de dados inesperado", description: "Os dados recebidos não estão no formato esperado. Entre em contato com o suporte técnico.", variant: "destructive" });
            setRawProcessData(null);
          }
          setIsLoading(false);
          setBackgroundLoading(prev => ({ ...prev, andamentos: false }));
        })
        .catch(() => {
          setRawProcessData(null);
          toast({ title: "Erro ao Buscar Andamentos", description: "Falha na requisição de andamentos.", variant: "destructive" });
          setIsLoading(false);
          setBackgroundLoading(prev => ({ ...prev, andamentos: false }));
        });

      // Handle documents result
      if (documentosPromise) {
        documentosPromise
          .then((documentsResponse: any) => {
            if ('error' in documentsResponse) {
              setDocuments([]);
            } else {
              setDocuments(documentsResponse.Documentos);
            }
            setBackgroundLoading(prev => ({ ...prev, documentos: false }));
          })
          .catch(() => {
            setDocuments([]);
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
    if (backgroundLoading.andamentos) tasks.push("Buscando andamentos do processo");
    if (backgroundLoading.documentos) tasks.push("Carregando documentos");
    if (backgroundLoading.resumo) tasks.push("Gerando resumo com IA");
    return tasks;
  }, [backgroundLoading]);

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
  };
}
