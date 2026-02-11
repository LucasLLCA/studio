"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadeAberta, ProcessedAndamento, Andamento, Documento } from '@/types/process-flow';
import { Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info, CalendarDays, UserCircle, Building, CalendarClock, HelpCircle, GanttChartSquare, CheckCircle, Clock, ExternalLink, PanelRight, User, AlertTriangle, Bookmark, Bell, X, Share2, Copy, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter, useParams } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { processAndamentos, parseCustomDateString, formatDisplayDate } from '@/lib/process-flow-utils';
import { formatProcessNumber } from '@/lib/utils';
import { ProcessFlowLegend } from '@/components/process-flow/ProcessFlowLegend';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchProcessDataFromSEIWithToken, fetchDocumentsFromSEIWithToken, invalidateProcessCache } from '@/app/sei-actions';
import { fetchSSEStream, getStreamProcessSummaryUrl, getStreamSituacaoAtualUrl } from '@/lib/streaming';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isNetworkError, withNetworkRetry } from '@/lib/network-retry';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOpenUnits } from '@/lib/react-query/queries/useOpenUnits';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessCreationInfo {
  creatorUnit: string;
  creatorUser: string;
  creationDate: string;
  timeSinceCreation: string;
}

export default function VisualizarProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const numeroProcesso = decodeURIComponent(params.numero as string);
  const { toast } = useToast();

  const [rawProcessData, setRawProcessData] = useState<ProcessoData | null>(null);
  const [taskToScrollTo, setTaskToScrollTo] = useState<ProcessedAndamento | null>(null);

  // Hook de autenticação persistente
  const {
    isAuthenticated,
    sessionToken,
    selectedUnidadeFiltro,
    orgao: userOrgao,
    logout: persistLogout,
  } = usePersistedAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [isSummarizedView, setIsSummarizedView] = useState<boolean>(true);
  const [documents, setDocuments] = useState<Documento[] | null>(null);

  const [processSummary, setProcessSummary] = useState<string | null>(null);
  const [situacaoAtual, setSituacaoAtual] = useState<string | null>(null);

  // Estados de carregamento em background
  const [backgroundLoading, setBackgroundLoading] = useState({
    andamentos: false,
    documentos: false,
    resumo: false,
    situacao: false,
  });

  // Hook do React Query para buscar unidades em aberto com cache de 2h
  const {
    data: openUnitsData,
    isLoading: isLoadingOpenUnits,
    refetch: refetchOpenUnits,
  } = useOpenUnits({
    processo: numeroProcesso,
    unidadeOrigem: selectedUnidadeFiltro || '',
    token: sessionToken || '',
    enabled: isAuthenticated && !!sessionToken && !!selectedUnidadeFiltro,
  });

  // Dados das unidades em aberto (do cache do React Query)
  const openUnitsInProcess = openUnitsData?.unidades || null;
  const processLinkAcesso = openUnitsData?.linkAcesso || null;

  // Auto-recover when network comes back online
  useNetworkStatus({
    onOnline: () => {
      // Wait for network to stabilize before retrying
      setTimeout(() => {
        if (!rawProcessData || !documents || !processSummary) {
          console.log('[NETWORK] Conexão restaurada — recarregando dados ausentes...');
          setRefreshKey((prev) => prev + 1);
        }
      }, 1500);
    },
  });

  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const [processCreationInfo, setProcessCreationInfo] = useState<ProcessCreationInfo | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [selectedLaneUnits, setSelectedLaneUnits] = useState<string[]>([]);

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !sessionToken) {
      console.log('[DEBUG] Usuário não autenticado - redirecionando para login');
      router.push('/login');
      return;
    }
  }, [isAuthenticated, sessionToken, router]);

  // Redirect if no unit selected
  useEffect(() => {
    if (!selectedUnidadeFiltro && isAuthenticated) {
      console.log('[DEBUG] Nenhuma unidade selecionada - redirecionando para seleção');
      toast({
        title: "Selecione uma unidade",
        description: "É necessário selecionar uma unidade antes de visualizar o processo.",
        variant: "destructive"
      });
      router.push(`/processo/${encodeURIComponent(numeroProcesso)}`);
      return;
    }
  }, [selectedUnidadeFiltro, isAuthenticated, numeroProcesso, router, toast]);

  const processedFlowData: ProcessedFlowData | null = useMemo(() => {
    if (!rawProcessData || !rawProcessData.Andamentos) {
      return null;
    }
    const dataToProcess = {
      ...rawProcessData,
      Info: {
        ...rawProcessData.Info,
        NumeroProcesso: rawProcessData.Info?.NumeroProcesso || numeroProcesso,
      }
    };
    return processAndamentos(dataToProcess.Andamentos, openUnitsInProcess, dataToProcess.Info?.NumeroProcesso || numeroProcesso, isSummarizedView);
  }, [rawProcessData, openUnitsInProcess, numeroProcesso, isSummarizedView]);

  // Funções para calcular indicadores do órgão
  const extractOrgaoFromSigla = (sigla: string): string => {
    if (!sigla) return '';
    const parts = sigla.split('/');
    return parts[0].trim();
  };

  const isExternalProcess = useMemo(() => {
    if (!userOrgao || !processCreationInfo?.creatorUnit) {
      return false;
    }
    const creatorOrgao = extractOrgaoFromSigla(processCreationInfo.creatorUnit).toUpperCase();
    const userOrgaoNormalized = userOrgao.toUpperCase();
    return creatorOrgao !== userOrgaoNormalized;
  }, [userOrgao, processCreationInfo]);

  const daysOpenInUserOrgao = useMemo(() => {
    if (!userOrgao || !openUnitsInProcess || openUnitsInProcess.length === 0 || !processedFlowData || !rawProcessData?.Andamentos) return null;

    const userOrgaoNormalized = userOrgao.toUpperCase();

    // Encontrar todas as unidades abertas do mesmo órgão
    const unitsInUserOrgao = openUnitsInProcess.filter(u => {
      const unitOrgao = extractOrgaoFromSigla(u.Unidade.Sigla).toUpperCase();
      return unitOrgao === userOrgaoNormalized;
    });

    if (unitsInUserOrgao.length === 0) return null;

    // Verificar se é processo externo
    const creatorOrgao = processCreationInfo?.creatorUnit
      ? extractOrgaoFromSigla(processCreationInfo.creatorUnit).toUpperCase()
      : '';
    const isExternal = creatorOrgao !== userOrgaoNormalized;

    if (isExternal) {
      // Para processos externos: calcular dias desde o primeiro andamento no órgão do usuário
      // até o último andamento em aberto no mesmo órgão

      // Encontrar todos os andamentos em unidades do órgão do usuário
      const andamentosInUserOrgao = rawProcessData.Andamentos.filter(a => {
        const andamentoOrgao = extractOrgaoFromSigla(a.Unidade.Sigla).toUpperCase();
        return andamentoOrgao === userOrgaoNormalized;
      });

      if (andamentosInUserOrgao.length === 0) return null;

      // Ordenar por data para encontrar o primeiro
      const sortedAndamentos = andamentosInUserOrgao
        .map(a => ({ ...a, parsedDate: parseCustomDateString(a.DataHora) }))
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

      const firstDate = sortedAndamentos[0].parsedDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - firstDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    } else {
      // Para processos internos: usar a lógica original (maior número de dias em aberto)
      let maxDays: number | null = null;
      for (const unit of unitsInUserOrgao) {
        const openTasksInUnit = processedFlowData.tasks
          .filter(task => task.Unidade.IdUnidade === unit.Unidade.IdUnidade && typeof task.daysOpen === 'number' && task.daysOpen >= 0)
          .sort((a, b) => b.globalSequence - a.globalSequence);

        const openTask = openTasksInUnit[0];
        if (openTask?.daysOpen !== undefined && openTask.daysOpen !== null) {
          if (maxDays === null || openTask.daysOpen > maxDays) {
            maxDays = openTask.daysOpen;
          }
        }
      }

      return maxDays;
    }
  }, [userOrgao, openUnitsInProcess, processedFlowData, rawProcessData, processCreationInfo]);

  useEffect(() => {
    if (rawProcessData && rawProcessData.Andamentos && rawProcessData.Andamentos.length > 0) {
      const sortedAndamentos = [...rawProcessData.Andamentos]
        .map(a => ({ ...a, parsedDate: parseCustomDateString(a.DataHora) }))
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

      let generationEvent: Andamento | undefined = sortedAndamentos.find(a => a.Tarefa === 'GERACAO-PROCEDIMENTO');
      if (!generationEvent && sortedAndamentos.length > 0) {
        generationEvent = sortedAndamentos[0];
      }

      if (generationEvent) {
        const creationDate = parseCustomDateString(generationEvent.DataHora);
        setProcessCreationInfo({
          creatorUnit: generationEvent.Unidade.Sigla,
          creatorUser: generationEvent.Usuario.Nome,
          creationDate: formatDisplayDate(creationDate),
          timeSinceCreation: formatDistanceToNowStrict(creationDate, { addSuffix: true, locale: ptBR }),
        });
      } else {
        setProcessCreationInfo(null);
      }
    } else {
      setProcessCreationInfo(null);
    }
  }, [rawProcessData]);

  // Abrir sheet quando dados do processo carregarem
  useEffect(() => {
    if (rawProcessData) {
      setIsDetailsSheetOpen(true);
    }
  }, [rawProcessData]);

  // Carregar dados do processo automaticamente
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
      setProcessCreationInfo(null);

      // Reset estados de background loading (unidades agora é gerenciado pelo React Query)
      setBackgroundLoading({
        andamentos: true,
        documentos: true,
        resumo: true,
        situacao: false,
      });

      console.log(`[DEBUG] Iniciando paralelização DIRETA às ${new Date().toISOString()}`);

      const token = sessionToken || '';
      if (!token) {
        console.error('[DEBUG] Token de sessão não disponível');
        toast({ title: "Sessão expirada", description: "Sua sessão expirou. Faça login novamente para continuar.", variant: "destructive" });
        setIsLoading(false);
        setBackgroundLoading({ andamentos: false, documentos: false, resumo: false, situacao: false });
        return;
      }

      console.log(`[DEBUG] Usando token direto: ${token.substring(0, 20)}...`);

      const startCreation = performance.now();

      const andamentosPromise = withNetworkRetry(
        () => fetchProcessDataFromSEIWithToken(token, numeroProcesso, selectedUnidadeFiltro),
        'andamentos',
      );
      const documentosPromise = withNetworkRetry(
        () => fetchDocumentsFromSEIWithToken(token, numeroProcesso, selectedUnidadeFiltro),
        'documentos',
      );

      const creationTime = performance.now() - startCreation;
      console.log(`[DEBUG] Promises criadas em ${creationTime.toFixed(3)}ms (unidades via React Query, resumo via SSE)`);

      // Handlers para processar cada resultado
      const handleAndamentosResult = (processData: any) => {
        if ('error' in processData && typeof processData.error === 'string') {
          let errorTitle = "Erro ao buscar dados do processo";
          let errorDescription = processData.error;
          if (processData.status === 422) { errorTitle = "Dados inválidos"; errorDescription = `Verifique se o número do processo está correto e se a unidade selecionada é a correta. O número deve ter 20 dígitos.`; }
          else if (processData.status === 404) { errorTitle = "Processo não localizado"; errorDescription = `O processo informado não foi encontrado na unidade '${selectedUnidadeFiltro}'. Verifique se o processo existe ou se está na unidade correta.`; }
          else if (processData.status === 401) { errorTitle = "Sess\u00e3o expirada"; errorDescription = "Sua sess\u00e3o no sistema expirou. Voc\u00ea ser\u00e1 redirecionado para fazer login novamente."; persistLogout(); router.push('/login'); }
          else if (processData.status === 500) { errorTitle = "Erro no servidor SEI"; errorDescription = `O sistema SEI está temporariamente indisponível. Aguarde alguns minutos e tente novamente.`; }
          toast({ title: errorTitle, description: errorDescription, variant: "destructive", duration: 9000 });
          setRawProcessData(null);
        } else if (!('error' in processData) && processData.Andamentos && Array.isArray(processData.Andamentos)) {
          console.log(`[DEBUG] ANDAMENTOS concluídos às ${new Date().toISOString()}`);
          setRawProcessData(processData);
          setLastFetchedAt(new Date());
          toast({ title: "Processo carregado com sucesso", description: `Encontrados ${processData.Andamentos.length} andamentos para visualização.` });
        } else {
          toast({ title: "Formato de dados inesperado", description: "Os dados recebidos não estão no formato esperado. Entre em contato com o suporte técnico.", variant: "destructive" });
          setRawProcessData(null);
        }
        setIsLoading(false);
        setBackgroundLoading(prev => ({ ...prev, andamentos: false }));
      };

      const handleDocumentosResult = (documentsResponse: any) => {
        if ('error' in documentsResponse) {
          setDocuments([]);
          console.warn("Erro ao buscar documentos:", documentsResponse.error);
        } else {
          console.log(`[DEBUG] DOCUMENTOS concluídos às ${new Date().toISOString()}`);
          setDocuments(documentsResponse.Documentos);
          console.log(`Documentos carregados: ${documentsResponse.Documentos.length}`);
        }
        setBackgroundLoading(prev => ({ ...prev, documentos: false }));
      };

      // Conectar handlers imediatamente às promises criadas
      andamentosPromise
        .then(handleAndamentosResult)
        .catch(error => {
          console.error("Erro ao buscar dados do processo:", error);
          setRawProcessData(null);
          toast({ title: "Erro ao Buscar Andamentos", description: "Falha na requisição de andamentos.", variant: "destructive" });
          setIsLoading(false);
          setBackgroundLoading(prev => ({ ...prev, andamentos: false }));
        });

      documentosPromise
        .then(handleDocumentosResult)
        .catch(error => {
          setDocuments([]);
          console.warn("Erro ao buscar documentos:", error);
          setBackgroundLoading(prev => ({ ...prev, documentos: false }));
        });

      // Resumo via SSE streaming - com retry automático em falha de rede
      const startSSEWithRetry = (attempt = 0) => {
        setProcessSummary("");
        fetchSSEStream(
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
            console.log(`[DEBUG] RESUMO (SSE) concluído às ${new Date().toISOString()}`);
            toast({ title: "Resumo do Processo Gerado", description: "Resumo carregado com sucesso." });
          },
          (error) => {
            if (attempt < 2 && isNetworkError(error)) {
              const delay = 2000 * (attempt + 1);
              console.warn(`[RETRY] resumo SSE: tentativa ${attempt + 1} falhou (rede), aguardando ${delay}ms...`);
              setTimeout(() => startSSEWithRetry(attempt + 1), delay);
            } else {
              setProcessSummary(null);
              setBackgroundLoading(prev => ({ ...prev, resumo: false }));
              console.warn("Erro ao buscar resumo via SSE:", error);
              toast({ title: "Erro ao Gerar Resumo", description: typeof error === 'string' ? error : "Falha na conexão", variant: "destructive", duration: 9000 });
            }
          },
        );
      };
      startSSEWithRetry();

      console.log(`[DEBUG] Handlers conectados (andamentos/documentos via promises, resumo via SSE)`);
    };

    loadProcessData();
  }, [isAuthenticated, sessionToken, selectedUnidadeFiltro, numeroProcesso, refreshKey]);

  const handleTaskCardClick = (task: ProcessedAndamento) => setTaskToScrollTo(task);
  const handleScrollToFirstTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[0]); };
  const handleScrollToLastTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[processedFlowData.tasks.length - 1]); };

  // Lista de tarefas em carregamento para mostrar no feedback
  const loadingTasks = useMemo(() => {
    const tasks = [];
    if (backgroundLoading.andamentos) tasks.push("Buscando andamentos do processo");
    if (isLoadingOpenUnits) tasks.push("Verificando unidades abertas");
    if (backgroundLoading.documentos) tasks.push("Carregando documentos");
    if (backgroundLoading.resumo) tasks.push("Gerando resumo com IA");
    return tasks;
  }, [backgroundLoading, isLoadingOpenUnits]);

  const hasBackgroundLoading = Object.values(backgroundLoading).some(loading => loading);

  const handleRefresh = useCallback(async () => {
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

  // Extrair lista de unidades únicas que aparecem no processo
  const availableLaneUnits = useMemo(() => {
    if (!processedFlowData?.laneMap) return [];
    return Array.from(processedFlowData.laneMap.keys()).sort();
  }, [processedFlowData]);

  // Helper para encontrar a task aberta mais recente de uma unidade
  const findOpenTaskForUnit = (unitId: string): ProcessedAndamento | undefined => {
    if (!processedFlowData?.tasks) return undefined;
    return processedFlowData.tasks
      .filter(task => task.Unidade.IdUnidade === unitId && typeof task.daysOpen === 'number' && task.daysOpen >= 0)
      .sort((a, b) => b.globalSequence - a.globalSequence)[0];
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto px-8 py-4 w-full">
        {/* Feedback de carregamento centralizado na tela quando não há dados */}
        {hasBackgroundLoading && !rawProcessData && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Carregando dados...</h3>
                    <div className="space-y-2">
                      {loadingTasks.map((task, index) => (
                        <div key={index} className="flex items-center justify-center space-x-2 text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                          <span className="text-muted-foreground">{task}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Os resultados aparecerão conforme ficarem prontos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Número do processo + toolbar */}
        {(rawProcessData || processCreationInfo) && (
          <div className="mb-8 space-y-2">
            {/* Status acima do número */}
            <div className="flex items-center gap-2">
              {openUnitsInProcess !== null && (
                openUnitsInProcess.length === 0 ? (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> {"Conclu\u00eddo"}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Em andamento
                  </span>
                )
              )}
              {hasBackgroundLoading && (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              )}
              {lastFetchedAt && !hasBackgroundLoading && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="text-xs text-muted-foreground">
                    Atualizado {formatDistanceToNowStrict(lastFetchedAt, { addSuffix: true, locale: ptBR })}
                  </span>
                </>
              )}
            </div>

            {/* Número + toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl text-foreground tracking-tight">
                  Processo, <span className='font-bold'>{formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso)}</span>
                </h1>
                {processLinkAcesso && (
                  <a
                    href={processLinkAcesso}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                    title="Abrir no SEI"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 mr-4">
                  <Switch id="summarize-graph" checked={isSummarizedView} onCheckedChange={setIsSummarizedView} disabled={!rawProcessData || isLoading} />
                  <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Resumido</Label>
                </div>
                <Button onClick={handleScrollToFirstTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length} aria-label="Ir para o in\u00edcio do fluxo">
                  <ChevronsLeft className="mr-2 h-4 w-4" /> {"In\u00edcio"}
                </Button>
                <Button onClick={handleScrollToLastTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length} aria-label="Ir para o fim do fluxo">
                  <ChevronsRight className="mr-2 h-4 w-4" /> Fim
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!processedFlowData?.tasks.length} aria-label="Filtrar unidades">
                      <GanttChartSquare className="mr-2 h-4 w-4" />
                      Filtrar Unidades
                      {selectedLaneUnits.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                          {selectedLaneUnits.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Filtrar Raias por Unidade</h4>
                        <p className="text-xs text-muted-foreground">
                          Selecione as unidades para reorganiz{"\u00e1"}-las no topo
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <Button variant="outline" size="sm" onClick={() => setSelectedLaneUnits(availableLaneUnits)}>
                          Todas
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedLaneUnits([])}>
                          Limpar
                        </Button>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {availableLaneUnits.map((unit) => (
                            <div key={unit} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`unit-${unit}`}
                                checked={selectedLaneUnits.includes(unit)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLaneUnits([...selectedLaneUnits, unit]);
                                  } else {
                                    setSelectedLaneUnits(selectedLaneUnits.filter(u => u !== unit));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                              />
                              <Label htmlFor={`unit-${unit}`} className="text-sm cursor-pointer flex-1">
                                {unit}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
                <Dialog open={isLegendModalOpen} onOpenChange={setIsLegendModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="Mostrar legenda de cores">
                      <HelpCircle className="mr-2 h-4 w-4" /> Legenda
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="sr-only">Legenda do Fluxo</DialogTitle>
                    </DialogHeader>
                    <ProcessFlowLegend />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Buttons row: Detalhes, Salvar, Notificações */}
            <div className="flex items-center gap-2">
              {!isDetailsSheetOpen && (
                <Button variant="outline" size="sm" onClick={() => setIsDetailsSheetOpen(true)} aria-label="Abrir painel de detalhes">
                  <PanelRight className="mr-2 h-4 w-4" /> Detalhes
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || hasBackgroundLoading}
                aria-label="Atualizar dados do processo"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Bookmark className="mr-2 h-4 w-4" /> Salvar
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Bell className="mr-2 h-4 w-4" /> {"Notifica\u00e7\u00f5es di\u00e1rias"}
              </Button>
            </div>
          </div>
        )}

        {/* Sheet lateral esquerda */}
        <Sheet open={isDetailsSheetOpen} onOpenChange={setIsDetailsSheetOpen} modal={false}>
          <SheetContent
            side="left"
            showOverlay={false}
            showCloseButton={false}
            className="w-[720px] sm:max-w-[720px] flex flex-col overflow-hidden"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            {/* Header: processo number + close */}
            <SheetHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-bold text-foreground">
                  Processo,
                  <br />
                  {formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso)}
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDetailsSheetOpen(false)}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  aria-label="Fechar detalhes"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SheetDescription className="sr-only">Detalhes do processo</SheetDescription>
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1">
              {/* Metadados section */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5" /> Metadados
                </h3>
                {processCreationInfo && (
                  <div className="space-y-3 text-lg">
                    <div className="flex items-center"><Building className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />Unidade: <span className="font-medium ml-1">{processCreationInfo.creatorUnit}</span></div>
                    <div className="flex items-center"><UserCircle className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />{"Usu\u00e1rio"}: <span className="font-medium ml-1">{processCreationInfo.creatorUser}</span></div>
                    <div className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />Data: <span className="font-medium ml-1">{processCreationInfo.creationDate}</span></div>
                    <div className="flex items-center"><CalendarClock className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />Tempo: <span className="font-medium ml-1">{processCreationInfo.timeSinceCreation}</span></div>
                    {openUnitsInProcess !== null && (
                      <div className="flex items-center">
                        {openUnitsInProcess.length === 0 ? (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5 text-green-600 flex-shrink-0" />
                            Status: <span className="font-medium ml-1 text-green-600">{"Conclu\u00eddo"}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-5 w-5 text-yellow-600 flex-shrink-0" />
                            Status: <span className="font-medium ml-1 text-yellow-600">Em andamento ({openUnitsInProcess.length} unidade{openUnitsInProcess.length !== 1 ? 's' : ''} aberta{openUnitsInProcess.length !== 1 ? 's' : ''})</span>
                          </>
                        )}
                      </div>
                    )}
                    {userOrgao && processCreationInfo && (
                      <>
                        <div className="flex items-center">
                          <ExternalLink className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                          Processo externo: <span className={`font-medium ml-1 ${isExternalProcess ? 'text-orange-600' : 'text-green-600'}`}>{isExternalProcess ? 'Sim' : "N\u00e3o"}</span>
                        </div>
                        {isExternalProcess && rawProcessData?.Andamentos && (
                          (() => {
                            const userOrgaoNormalized = userOrgao.toUpperCase();
                            const andamentosInUserOrgao = rawProcessData.Andamentos.filter(a => {
                              const andamentoOrgao = extractOrgaoFromSigla(a.Unidade.Sigla).toUpperCase();
                              return andamentoOrgao === userOrgaoNormalized;
                            });

                            if (andamentosInUserOrgao.length > 0) {
                              const firstAndamento = andamentosInUserOrgao.sort((a, b) =>
                                parseCustomDateString(a.DataHora).getTime() - parseCustomDateString(b.DataHora).getTime()
                              )[0];

                              return (
                                <div className="flex items-center ml-7">
                                  <Building className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                                  Chegou em: <span className="font-medium ml-1 text-blue-600">{firstAndamento.Unidade.Sigla}</span>
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                      </>
                    )}
                    {userOrgao && daysOpenInUserOrgao !== null && (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                        {"Dias em aberto no \u00f3rg\u00e3o"}: <span className="font-medium ml-1 text-red-600">{daysOpenInUserOrgao} {daysOpenInUserOrgao === 1 ? 'dia' : 'dias'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Entendimento / Situação Atual tabs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BookText className="h-5 w-5" /> Resumo (IA)
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={!processSummary && !situacaoAtual}
                      onClick={() => {
                        const text = processSummary || situacaoAtual || '';
                        if (text) {
                          const processNum = formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso);
                          const message = `*Processo ${processNum}*\n\n${text}`;
                          window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
                        }
                      }}
                    >
                      <Share2 className="mr-1 h-3 w-3" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const text = processSummary || situacaoAtual || '';
                        if (text) {
                          navigator.clipboard.writeText(text);
                          toast({ title: "Copiado", description: "Texto copiado para a área de transferência." });
                        }
                      }}
                      disabled={!processSummary && !situacaoAtual}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copiar
                    </Button>
                  </div>
                </div>
                <Tabs defaultValue="entendimento" onValueChange={(value) => {
                  if (value === "situacao" && situacaoAtual === null && !backgroundLoading.situacao && sessionToken && selectedUnidadeFiltro) {
                    setBackgroundLoading(prev => ({ ...prev, situacao: true }));
                    setSituacaoAtual("");

                    const startSituacaoSSE = (attempt = 0) => {
                      setSituacaoAtual("");
                      fetchSSEStream(
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
                          if (attempt < 2 && isNetworkError(error)) {
                            const delay = 2000 * (attempt + 1);
                            console.warn(`[RETRY] situação SSE: tentativa ${attempt + 1} falhou (rede), aguardando ${delay}ms...`);
                            setTimeout(() => startSituacaoSSE(attempt + 1), delay);
                          } else {
                            setSituacaoAtual(null);
                            setBackgroundLoading(prev => ({ ...prev, situacao: false }));
                            console.warn("Erro ao buscar situação atual via SSE:", error);
                            toast({ title: "Erro ao Gerar Situação Atual", description: typeof error === 'string' ? error : "Falha na conexão", variant: "destructive" });
                          }
                        },
                      );
                    };
                    startSituacaoSSE();
                  }
                }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="entendimento" className="flex-1">Entendimento</TabsTrigger>
                    <TabsTrigger value="situacao" className="flex-1">Situação Atual</TabsTrigger>
                  </TabsList>

                  <TabsContent value="entendimento">
                    {processSummary !== null && processSummary !== undefined && processSummary.length > 0 ? (
                      <div>
                        <pre className="text-lg whitespace-pre-wrap break-words font-sans leading-relaxed">{processSummary}</pre>
                        {backgroundLoading.resumo && (
                          <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                        )}
                      </div>
                    ) : backgroundLoading.resumo ? (
                      <div className="flex items-center justify-center p-6">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        <p className="ml-2 text-lg text-muted-foreground">Gerando resumo...</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-6 text-muted-foreground text-lg">
                        <Info className="mr-2 h-5 w-5" />
                        {"Nenhum resumo dispon\u00edvel."}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="situacao">
                    {situacaoAtual !== null && situacaoAtual !== undefined && situacaoAtual.length > 0 ? (
                      <div>
                        <pre className="text-lg whitespace-pre-wrap break-words font-sans leading-relaxed">{situacaoAtual}</pre>
                        {backgroundLoading.situacao && (
                          <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                        )}
                      </div>
                    ) : backgroundLoading.situacao ? (
                      <div className="flex items-center justify-center p-6">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        <p className="ml-2 text-lg text-muted-foreground">Gerando situação atual...</p>
                      </div>
                    ) : situacaoAtual === null ? (
                      <div className="flex items-center justify-center p-6 text-muted-foreground text-lg">
                        <Info className="mr-2 h-5 w-5" />
                        Clique nesta aba para gerar a situação atual.
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-6 text-muted-foreground text-lg">
                        <Info className="mr-2 h-5 w-5" />
                        {"Nenhuma situação disponível."}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Footer fixo */}
            <SheetFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button variant="outline" onClick={() => setIsDetailsSheetOpen(false)} className="w-full">
                Fechar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {rawProcessData && (
          <div className="flex flex-1 overflow-hidden flex-col gap-6">
            {/* Section 1: Unidades em Aberto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5" /> Unidades em Aberto
                </CardTitle>
                <CardDescription>
                  Clique em uma unidade em aberto para foca-la na linha do tempo
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {isLoadingOpenUnits ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando unidades abertas...</span>
                  </div>
                ) : openUnitsInProcess && openUnitsInProcess.length > 0 ? (
                  <div className="flex items-start gap-3 overflow-x-auto pb-1">
                    {openUnitsInProcess.map(unitInfo => {
                      const openTaskDetails = findOpenTaskForUnit(unitInfo.Unidade.IdUnidade);
                      return (
                        <Card
                          key={unitInfo.Unidade.IdUnidade}
                          className={`flex-shrink-0 p-3 shadow-sm border-destructive/30 min-w-[160px] ${openTaskDetails ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                          onClick={() => openTaskDetails && handleTaskCardClick(openTaskDetails)}
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-semibold text-destructive">{unitInfo.Unidade.Sigla}</span>
                            <span className="text-xs text-muted-foreground flex items-center">
                              <User className="h-3 w-3 mr-1 flex-shrink-0" />
                              {unitInfo.UsuarioAtribuicao?.Nome || "Sem atribui\u00e7\u00e3o"}
                            </span>
                            {openTaskDetails && typeof openTaskDetails.daysOpen === 'number' && (
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                                {openTaskDetails.daysOpen} {openTaskDetails.daysOpen === 1 ? 'dia' : 'dias'}
                              </span>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : openUnitsInProcess && openUnitsInProcess.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">{"Processo conclu\u00eddo \u2014 nenhuma unidade em aberto"}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Section 2: Linha do Tempo */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GanttChartSquare className="h-5 w-5" /> Linha do Tempo
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="flex-1 overflow-hidden p-0 px-6 pb-6 pt-4">
                <ProcessFlowClient
                  processedFlowData={processedFlowData}
                  taskToScrollTo={taskToScrollTo}
                  sessionToken={sessionToken}
                  isAuthenticated={isAuthenticated}
                  selectedUnidadeFiltro={selectedUnidadeFiltro}
                  processNumber={numeroProcesso || (rawProcessData?.Info?.NumeroProcesso)}
                  documents={documents}
                  isLoadingDocuments={backgroundLoading.documentos}
                  filteredLaneUnits={selectedLaneUnits}
                  openUnitsInProcess={openUnitsInProcess}
                />
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <BookText className="mr-2 h-5 w-5" />
              Entendimento Automatizado (IA) - Resumo Expandido
            </DialogTitle>
            <DialogDescription>
              Resumo detalhado do processo gerado automaticamente por inteligência artificial
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-4">
            <div className="p-4 bg-muted/30 rounded-md">
              {processSummary ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed">
                    {processSummary}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Info className="mr-2 h-4 w-4" />
                  Nenhum resumo disponível para exibir.
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsSummaryModalOpen(false)} variant="outline">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
