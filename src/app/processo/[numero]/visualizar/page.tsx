"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadeAberta, ProcessedAndamento, Andamento, Documento } from '@/types/process-flow';
import { FileJson, Search, Sparkles, Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info, LogIn, LogOut, Menu, CalendarDays, UserCircle, Building, CalendarClock, Briefcase, HelpCircle, GanttChartSquare, Activity, Home as HomeIcon, CheckCircle, Clock, ExternalLink, Expand, Newspaper } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ProcessMetadataSidebar } from '@/components/process-flow/ProcessMetadataSidebar';
import { processAndamentos, parseCustomDateString, formatDisplayDate } from '@/lib/process-flow-utils';
import { ProcessFlowLegend } from '@/components/process-flow/ProcessFlowLegend';
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchProcessDataFromSEIWithToken, fetchDocumentsFromSEIWithToken } from '@/app/sei-actions';
import { fetchSSEStream, getStreamProcessSummaryUrl } from '@/lib/streaming';
import { useOpenUnits } from '@/lib/react-query/queries/useOpenUnits';
import ApiHealthCheck from '@/components/ApiHealthCheck';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

  const [currentYear, setCurrentYear] = useState<number | null>(null);
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
  const [isSummarizedView, setIsSummarizedView] = useState<boolean>(true);
  const [documents, setDocuments] = useState<Documento[] | null>(null);

  const [processSummary, setProcessSummary] = useState<string | null>(null);

  // Estados de carregamento em background
  const [backgroundLoading, setBackgroundLoading] = useState({
    andamentos: false,
    documentos: false,
    resumo: false
  });

  // Hook do React Query para buscar unidades em aberto com cache de 2h
  const {
    data: openUnitsData,
    isLoading: isLoadingOpenUnits,
  } = useOpenUnits({
    processo: numeroProcesso,
    unidadeOrigem: selectedUnidadeFiltro || '',
    token: sessionToken || '',
    enabled: isAuthenticated && !!sessionToken && !!selectedUnidadeFiltro,
  });

  // Dados das unidades em aberto (do cache do React Query)
  const openUnitsInProcess = openUnitsData?.unidades || null;
  const processLinkAcesso = openUnitsData?.linkAcesso || null;

  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [isApiStatusModalOpen, setIsApiStatusModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const [processCreationInfo, setProcessCreationInfo] = useState<ProcessCreationInfo | null>(null);
  const [isUnitsSidebarOpen, setIsUnitsSidebarOpen] = useState(true);
  const [selectedLaneUnits, setSelectedLaneUnits] = useState<string[]>([]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

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
      setProcessCreationInfo(null);

      // Reset estados de background loading (unidades agora é gerenciado pelo React Query)
      setBackgroundLoading({
        andamentos: true,
        documentos: true,
        resumo: true
      });

      console.log(`[DEBUG] Iniciando paralelização DIRETA às ${new Date().toISOString()}`);

      const token = sessionToken || '';
      if (!token) {
        console.error('[DEBUG] Token de sessão não disponível');
        toast({ title: "Sessão expirada", description: "Sua sessão expirou. Faça login novamente para continuar.", variant: "destructive" });
        setIsLoading(false);
        setBackgroundLoading({ andamentos: false, documentos: false, resumo: false });
        return;
      }

      console.log(`[DEBUG] Usando token direto: ${token.substring(0, 20)}...`);

      const startCreation = performance.now();

      const andamentosPromise = fetchProcessDataFromSEIWithToken(token, numeroProcesso, selectedUnidadeFiltro);
      const documentosPromise = fetchDocumentsFromSEIWithToken(token, numeroProcesso, selectedUnidadeFiltro);

      const creationTime = performance.now() - startCreation;
      console.log(`[DEBUG] Promises criadas em ${creationTime.toFixed(3)}ms (unidades via React Query, resumo via SSE)`);

      // Handlers para processar cada resultado
      const handleAndamentosResult = (processData: any) => {
        if ('error' in processData && typeof processData.error === 'string') {
          let errorTitle = "Erro ao buscar dados do processo";
          let errorDescription = processData.error;
          if (processData.status === 422) { errorTitle = "Dados inválidos"; errorDescription = `Verifique se o número do processo está correto e se a unidade selecionada é a correta. O número deve ter 20 dígitos.`; }
          else if (processData.status === 404) { errorTitle = "Processo não localizado"; errorDescription = `O processo informado não foi encontrado na unidade '${selectedUnidadeFiltro}'. Verifique se o processo existe ou se está na unidade correta.`; }
          else if (processData.status === 401) { errorTitle = "Sessão expirada"; errorDescription = `Sua sessão no sistema expirou. Você será redirecionado para fazer login novamente.`; handleLogout(); }
          else if (processData.status === 500) { errorTitle = "Erro no servidor SEI"; errorDescription = `O sistema SEI está temporariamente indisponível. Aguarde alguns minutos e tente novamente.`;}
          toast({ title: errorTitle, description: errorDescription, variant: "destructive", duration: 9000 });
          setRawProcessData(null);
        } else if (!('error' in processData) && processData.Andamentos && Array.isArray(processData.Andamentos)) {
          console.log(`[DEBUG] ANDAMENTOS concluídos às ${new Date().toISOString()}`);
          setRawProcessData(processData);
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

      // Resumo via SSE streaming - texto aparece progressivamente
      setProcessSummary("");
      fetchSSEStream(
        getStreamProcessSummaryUrl(numeroProcesso, selectedUnidadeFiltro),
        token,
        (chunk) => {
          setProcessSummary(prev => (prev || "") + chunk);
        },
        (fullResult) => {
          // fullResult is the cached resultado object - extract the summary text
          const summaryText = typeof fullResult === 'string'
            ? fullResult
            : fullResult?.resumo_combinado?.resposta_ia || fullResult?.resumo?.resposta_ia || "";
          setProcessSummary(summaryText.replace(/[#*]/g, ''));
          setBackgroundLoading(prev => ({ ...prev, resumo: false }));
          console.log(`[DEBUG] RESUMO (SSE) concluído às ${new Date().toISOString()}`);
          toast({ title: "Resumo do Processo Gerado", description: "Resumo carregado com sucesso." });
        },
        (error) => {
          setProcessSummary(null);
          setBackgroundLoading(prev => ({ ...prev, resumo: false }));
          console.warn("Erro ao buscar resumo via SSE:", error);
          toast({ title: "Erro ao Gerar Resumo", description: error, variant: "destructive", duration: 9000 });
        },
      );

      console.log(`[DEBUG] Handlers conectados (andamentos/documentos via promises, resumo via SSE)`);
    };

    loadProcessData();
  }, [isAuthenticated, sessionToken, selectedUnidadeFiltro, numeroProcesso]);

  const handleLogout = () => {
    console.log('[DEBUG] Iniciando logout...');
    persistLogout();
    toast({ title: "Logout realizado." });
    router.push('/login');
  };

  const handleTaskCardClick = (task: ProcessedAndamento) => setTaskToScrollTo(task);
  const handleScrollToFirstTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[0]); };
  const handleScrollToLastTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[processedFlowData.tasks.length - 1]); };

  const handleBackToHome = () => {
    router.push('/');
    toast({ title: "Voltando ao início" });
  };

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

  // Extrair lista de unidades únicas que aparecem no processo
  const availableLaneUnits = useMemo(() => {
    if (!processedFlowData?.laneMap) return [];
    return Array.from(processedFlowData.laneMap.keys()).sort();
  }, [processedFlowData]);

  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      {/* Barra de controles no topo */}
      <div className="p-3 border-b border-border shadow-sm sticky top-0 z-30 bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 max-w-full">
          <div className="flex flex-wrap items-center gap-2 flex-grow">
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={handleBackToHome} variant="outline" size="sm" disabled={isLoading} title="Voltar ao início">
              <HomeIcon className="mr-2 h-4 w-4" /> Início
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsInfoModalOpen(true)} title="Informações do Sistema">
              <Newspaper className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsApiStatusModalOpen(true)} title="Status das APIs">
              <Activity className="h-4 w-4" />
            </Button>
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={handleLogout}> <LogOut className="mr-2 h-4 w-4" /> Logout </Button>
            )}
          </div>
        </div>
      </div>

      <ApiHealthCheck />

      <main className="flex-1 flex flex-col overflow-y-auto p-4 w-full">
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

        {processCreationInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {processCreationInfo && (
              <Card>
                <CardHeader className="p-2">
                  <CardTitle className="text-md flex items-center text-green-600">
                    <FileText className="mr-2 h-5 w-5" /> Número: {rawProcessData?.Info?.NumeroProcesso || numeroProcesso}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm pt-2 p-2">
                  <div className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground" />Unidade: <span className="font-medium ml-1">{processCreationInfo.creatorUnit}</span></div>
                  <div className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Usuário: <span className="font-medium ml-1">{processCreationInfo.creatorUser}</span></div>
                  <div className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />Data: <span className="font-medium ml-1">{processCreationInfo.creationDate}</span></div>
                  <div className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />Tempo: <span className="font-medium ml-1">{processCreationInfo.timeSinceCreation}</span></div>
                  {processLinkAcesso && (
                    <div className="flex items-center">
                      <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                      Link:
                      <a
                        href={processLinkAcesso}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium ml-1 text-blue-600 hover:text-blue-800 underline"
                      >
                        Abrir no SEI
                      </a>
                    </div>
                  )}
                  {openUnitsInProcess !== null && (
                    <div className="flex items-center">
                      {openUnitsInProcess.length === 0 ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Status: <span className="font-medium ml-1 text-green-600">Concluído</span>
                        </>
                      ) : (
                        <>
                          <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                          Status: <span className="font-medium ml-1 text-yellow-600">Em andamento ({openUnitsInProcess.length} unidade{openUnitsInProcess.length !== 1 ? 's' : ''} aberta{openUnitsInProcess.length !== 1 ? 's' : ''})</span>
                        </>
                      )}
                    </div>
                  )}
                  {userOrgao && processCreationInfo && (
                    <>
                      <div className="flex items-center">
                        <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                        Processo externo: <span className={`font-medium ml-1 ${isExternalProcess ? 'text-orange-600' : 'text-green-600'}`}>{isExternalProcess ? 'Sim' : 'Não'}</span>
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
                              <div className="flex items-center ml-6">
                                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
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
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      Dias em aberto no órgão: <span className="font-medium ml-1 text-red-600">{daysOpenInUserOrgao} {daysOpenInUserOrgao === 1 ? 'dia' : 'dias'}</span>
                    </div>
                  )}

                  {/* Feedback de carregamento dentro do card de informações gerais */}
                  {hasBackgroundLoading && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-start space-x-2">
                        <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-xs font-medium mb-1 text-green-600">Atualizando dados...</h4>
                          <div className="space-y-0.5">
                            {loadingTasks.map((task, index) => (
                              <div key={index} className="flex items-center space-x-1.5 text-xs">
                                <div className="w-1 h-1 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                                <span className="text-muted-foreground">{task}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="p-2">
                  <CardTitle className="text-md flex items-center justify-between text-green-600">
                    <div className="flex items-center">
                      <BookText className="mr-2 h-5 w-5" /> Entendimento Automatizado (IA)
                    </div>
                    {processSummary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSummaryModalOpen(true)}
                        className="ml-2 h-7 px-2 text-xs"
                      >
                        <Expand className="mr-1 h-3 w-3" />
                        Expandir Resumo
                      </Button>
                    )}
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-shrink-0 p-2 pt-0">
                  {processSummary !== null && processSummary !== undefined && processSummary.length > 0 ? (
                    <div className="h-[150px] rounded-md border">
                      <ScrollArea className="h-full">
                        <div className="p-3">
                          <pre className="text-sm whitespace-pre-wrap break-words font-sans">{processSummary}</pre>
                          {backgroundLoading.resumo && (
                            <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : backgroundLoading.resumo ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      <p className="ml-2 text-muted-foreground">Gerando resumo...</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4 text-muted-foreground">
                      <Info className="mr-2 h-4 w-4" />
                      Nenhum resumo disponível.
                    </div>
                  )}

              </CardContent>
            </Card>
          </div>
        )}

        {rawProcessData && (
          <div className="flex flex-1 mt-4 overflow-hidden flex-col">
            {/* Barra de botões */}
            <div className="w-full flex justify-between items-center mb-4 px-4 py-2 bg-muted/50 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsUnitsSidebarOpen(!isUnitsSidebarOpen)} aria-label={isUnitsSidebarOpen ? "Fechar painel de metadados" : "Abrir painel de metadados"}>
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 mr-4">
                  <Switch id="summarize-graph" checked={isSummarizedView} onCheckedChange={setIsSummarizedView} disabled={!rawProcessData || isLoading} />
                  <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Resumido</Label>
                </div>
                <Button onClick={handleScrollToFirstTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length} aria-label="Ir para o início do fluxo">
                  <ChevronsLeft className="mr-2 h-4 w-4" /> Início
                </Button>
                <Button onClick={handleScrollToLastTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length} aria-label="Ir para o fim do fluxo">
                  <ChevronsRight className="mr-2 h-4 w-4" /> Fim
                </Button>

                {/* Filtro de Unidades */}
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
                          Selecione as unidades para reorganizá-las no topo
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLaneUnits(availableLaneUnits)}
                        >
                          Todas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLaneUnits([])}
                        >
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

            {/* Seção de unidades em aberto e fluxo lado a lado */}
            <div className="flex flex-1 gap-4 overflow-hidden">
              {/* Seção de unidades em aberto */}
              {isUnitsSidebarOpen && (
                <div className="w-[22rem] flex-shrink-0">
                  <div className="bg-card border rounded-lg p-4 h-full">
                    <div className="flex items-center mb-3">
                      <Briefcase className="mr-2 h-5 w-5 text-muted-foreground" />
                      <h3 className="text-base font-semibold">Unidades com Processo Aberto</h3>
                    </div>
                    <div className="overflow-auto h-[calc(100%-2.5rem)]">
                      <ProcessMetadataSidebar
                        processNumber={numeroProcesso || (rawProcessData?.Info?.NumeroProcesso)}
                        openUnitsInProcess={openUnitsInProcess}
                        processedFlowData={processedFlowData}
                        onTaskCardClick={handleTaskCardClick}
                        userUnitId={selectedUnidadeFiltro}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fluxo do processo */}
              <div className="flex-1 overflow-hidden">
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
              </div>
            </div>
          </div>
        )}

      </main>


      <Dialog open={isApiStatusModalOpen} onOpenChange={setIsApiStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Status da API</DialogTitle>
          </DialogHeader>
          <ApiHealthCheck showDetails={true} className="border-0 shadow-none p-0 bg-transparent" />
        </DialogContent>
      </Dialog>

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

      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-blue-600">
              <Newspaper className="mr-2 h-5 w-5" />
              Informações do Sistema
            </DialogTitle>
            <DialogDescription>
              Informações importantes sobre funcionalidades e limitações atuais
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Arquivos Suportados</h4>
                  <p className="text-sm text-blue-700">
                    Nesta fase atual o sistema consegue ler e processar apenas arquivos gerados internamente pelo SEI.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Documentos PDF</h4>
                  <p className="text-sm text-yellow-700">
                    Documentos PDFs ainda não são processados e está no cronograma de desenvolvimento.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-orange-900 mb-1">Problema Conhecido</h4>
                  <p className="text-sm text-orange-700">
                    Alguns processos com grande volume de andamentos (&gt;500) podem apresentar lentidão na renderização do gráfico. Recomenda-se usar a opção &quot;Resumido&quot; para melhor desempenho.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInfoModalOpen(false)} variant="outline">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
