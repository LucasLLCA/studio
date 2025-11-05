
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadeAberta, ProcessedAndamento, LoginCredentials, Andamento, Documento } from '@/types/process-flow';
import { FileJson, Search, Sparkles, Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info, LogIn, LogOut, Menu, CalendarDays, UserCircle, Building, CalendarClock, Briefcase, HelpCircle, GanttChartSquare, Activity, Home as HomeIcon, CheckCircle, Clock, ExternalLink, Expand, Newspaper } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { fetchProcessDataFromSEI, fetchOpenUnitsForProcess, fetchProcessSummary, fetchDocumentsFromSEI, loginToSEI, checkSEIApiHealth, checkSummaryApiHealth, fetchProcessDataFromSEIWithToken, fetchOpenUnitsForProcessWithToken, fetchProcessSummaryWithToken, fetchDocumentsFromSEIWithToken, getAuthToken } from './sei-actions';
import type { HealthCheckResponse } from './sei-actions';
import ApiHealthCheck from '@/components/ApiHealthCheck';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const loginSchema = z.object({
  usuario: z.string().min(1, "Usuário é obrigatório."),
  senha: z.string().min(1, "Senha é obrigatória."),
  orgao: z.string().min(1, "Orgão é obrigatório."),
});
type LoginFormValues = z.infer<typeof loginSchema>;

interface ProcessCreationInfo {
  creatorUnit: string;
  creatorUser: string;
  creationDate: string;
  timeSinceCreation: string;
}


function HomeContent({ processoFromUrl }: { processoFromUrl: string | null }) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [rawProcessData, setRawProcessData] = useState<ProcessoData | null>(null);
  const [taskToScrollTo, setTaskToScrollTo] = useState<ProcessedAndamento | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Hook de autenticação persistente
  const {
    isAuthenticated,
    sessionToken,
    idUnidadeAtual,
    unidadesFiltroList,
    selectedUnidadeFiltro,
    login: persistLogin,
    logout: persistLogout,
    updateSelectedUnidade
  } = usePersistedAuth();

  const [processoNumeroInput, setProcessoNumeroInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSummarizedView, setIsSummarizedView] = useState<boolean>(true);
  const [shouldAutoSearch, setShouldAutoSearch] = useState<boolean>(false);
  const [openUnitsInProcess, setOpenUnitsInProcess] = useState<UnidadeAberta[] | null>(null);
  const [processLinkAcesso, setProcessLinkAcesso] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Documento[] | null>(null);

  const [processSummary, setProcessSummary] = useState<string | null>(null);

  // Estados de carregamento em background
  const [backgroundLoading, setBackgroundLoading] = useState({
    andamentos: false,
    unidades: false,
    documentos: false,
    resumo: false
  });

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [isApiStatusModalOpen, setIsApiStatusModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apiSearchPerformed, setApiSearchPerformed] = useState<boolean>(false);
  const [processCreationInfo, setProcessCreationInfo] = useState<ProcessCreationInfo | null>(null);
  const [isUnitsSidebarOpen, setIsUnitsSidebarOpen] = useState(true);
  const [unidadeSearchTerm, setUnidadeSearchTerm] = useState<string>("");
  const [selectedLaneUnits, setSelectedLaneUnits] = useState<string[]>([]);


  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usuario: "", senha: "", orgao: "" },
  });
  const { register, handleSubmit, formState: { errors } } = methods;


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Detectar parâmetro processo na URL e preparar busca automaticamente
  useEffect(() => {
    if (processoFromUrl && isAuthenticated && sessionToken && selectedUnidadeFiltro && !apiSearchPerformed) {
      console.log('[DEBUG] Processo detectado na URL:', processoFromUrl);
      setProcessoNumeroInput(processoFromUrl);
      setShouldAutoSearch(true);
    }
  }, [processoFromUrl, isAuthenticated, sessionToken, selectedUnidadeFiltro, apiSearchPerformed]);

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !sessionToken) {
      console.log('[DEBUG] Usuário não autenticado - redirecionando para login');
      // Pequeno delay para permitir que o toast seja mostrado
      const timer = setTimeout(() => {
        router.push('/login');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, sessionToken, router]);

  const processedFlowData: ProcessedFlowData | null = useMemo(() => {
    if (!rawProcessData || !rawProcessData.Andamentos) {
      return null;
    }
    const dataToProcess = {
      ...rawProcessData,
      Info: {
        ...rawProcessData.Info,
        NumeroProcesso: rawProcessData.Info?.NumeroProcesso || processoNumeroInput,
      }
    };
    return processAndamentos(dataToProcess.Andamentos, openUnitsInProcess, dataToProcess.Info?.NumeroProcesso || processoNumeroInput, isSummarizedView);
  }, [rawProcessData, openUnitsInProcess, processoNumeroInput, isSummarizedView]);

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

  // Executar busca automaticamente quando shouldAutoSearch for true
  useEffect(() => {
    if (shouldAutoSearch && processoNumeroInput && selectedUnidadeFiltro) {
      console.log('[DEBUG] Executando busca automática para:', processoNumeroInput);
      setShouldAutoSearch(false);
      handleSearchClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoSearch]);




  const handleSearchClick = async () => {
    if (!isAuthenticated || !sessionToken) {
      toast({ title: "Acesso não autorizado", description: "Você precisa estar logado para pesquisar processos. Faça login e tente novamente.", variant: "destructive" });
      return;
    }
    if (!processoNumeroInput) {
      toast({ title: "Número do processo obrigatório", description: "Digite o número do processo que deseja consultar (ex: 12345678901234567890).", variant: "destructive" });
      return;
    }
    
    // Se não há unidade selecionada, navegar para a tela de seleção de unidade
    if (!selectedUnidadeFiltro) {
      console.log('[DEBUG] Redirecionando para tela de seleção de unidade, processo:', processoNumeroInput);
      toast({ title: "Navegando para seleção de unidade", description: "Redirecionando para a tela de seleção de unidade...", variant: "default" });
      
      // Codificar o número do processo para URL segura
      const encodedProcesso = encodeURIComponent(processoNumeroInput);
      router.push(`/processo/${encodedProcesso}`);
      return;
    }

    setApiSearchPerformed(true); 
    setIsLoading(true);
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessLinkAcesso(null);
    setDocuments(null);
    setProcessSummary(null);
    setProcessCreationInfo(null);
    
    // Reset estados de background loading
    setBackgroundLoading({
      andamentos: true,
      unidades: true,
      documentos: true,
      resumo: true
    });

    // 🚀 REQUISIÇÕES PARALELAS USANDO SESSIONTOKEN DIRETO - EVITANDO GETAUTHTOKEN
    console.log(`[DEBUG] Iniciando paralelização DIRETA às ${new Date().toISOString()}`);
    
    // Debug: Verificar sessionToken
    console.log('[DEBUG] sessionToken no handleSearchClick:', sessionToken);
    console.log('[DEBUG] isAuthenticated:', isAuthenticated);
    
    // Usar sessionToken diretamente - está disponível e validado
    const token = sessionToken || '';
    if (!token) {
      console.error('[DEBUG] Token de sessão não disponível');
      toast({ title: "Sessão expirada", description: "Sua sessão expirou. Faça login novamente para continuar.", variant: "destructive" });
      setIsLoading(false);
      setBackgroundLoading({ andamentos: false, unidades: false, documentos: false, resumo: false });
      return;
    }

    console.log(`[DEBUG] Usando token direto: ${token.substring(0, 20)}...`);

    // Criar todas as promises com priorização para otimizar UX
    console.log(`[DEBUG] Iniciando requisições paralelas às ${new Date().toISOString()}`);
    
    const startCreation = performance.now();
    
    const andamentosPromise = fetchProcessDataFromSEIWithToken(token, processoNumeroInput, selectedUnidadeFiltro);
    const unidadesPromise = fetchOpenUnitsForProcessWithToken(token, processoNumeroInput, selectedUnidadeFiltro);
    const resumoPromise = fetchProcessSummaryWithToken(token, processoNumeroInput, selectedUnidadeFiltro);
    const documentosPromise = fetchDocumentsFromSEIWithToken(token, processoNumeroInput, selectedUnidadeFiltro);
    
    const creationTime = performance.now() - startCreation;
    console.log(`[DEBUG] Todas as 4 promises criadas em ${creationTime.toFixed(3)}ms`);

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

    const handleUnidadesResult = (unitsData: any) => {
      if ('error' in unitsData) {
        setOpenUnitsInProcess([]);
        setProcessLinkAcesso(null);
        console.warn("Erro ao buscar unidades abertas:", unitsData.error);
        if (unitsData.status === 401) {
          toast({ title: "Sessão expirada", description: "Sua sessão no sistema expirou. Você será redirecionado para fazer login novamente.", variant: "destructive" });
          handleLogout();
        }
      } else if (unitsData.unidades && Array.isArray(unitsData.unidades)) {
        console.log(`[DEBUG] UNIDADES concluídas às ${new Date().toISOString()}`);
        setOpenUnitsInProcess(unitsData.unidades);
        setProcessLinkAcesso(unitsData.linkAcesso || null);
        console.log(`Unidades abertas carregadas: ${unitsData.unidades.length}`);
        if (unitsData.linkAcesso) {
          console.log(`LinkAcesso capturado: ${unitsData.linkAcesso}`);
        }
      } else {
        setOpenUnitsInProcess([]);
        setProcessLinkAcesso(null);
        console.warn("Resposta inesperada ao buscar unidades abertas:", unitsData);
      }
      setBackgroundLoading(prev => ({ ...prev, unidades: false }));
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

    const handleResumoResult = (summaryResponse: any) => {
      if ('error' in summaryResponse) {
        setProcessSummary(null);
        toast({ title: "Erro ao Gerar Resumo", description: summaryResponse.error, variant: "destructive", duration: 9000 });
      } else {
        console.log(`[DEBUG] RESUMO concluído às ${new Date().toISOString()}`);
        setProcessSummary(summaryResponse.summary.replace(/[#*]/g, ''));
        toast({ title: "Resumo do Processo Gerado", description: "Resumo carregado com sucesso." });
      }
      setBackgroundLoading(prev => ({ ...prev, resumo: false }));
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

    unidadesPromise
      .then(handleUnidadesResult)
      .catch(error => {
        setOpenUnitsInProcess([]);
        setProcessLinkAcesso(null);
        console.warn("Erro ao buscar unidades abertas:", error);
        setBackgroundLoading(prev => ({ ...prev, unidades: false }));
      });

    documentosPromise
      .then(handleDocumentosResult)
      .catch(error => {
        setDocuments([]);
        console.warn("Erro ao buscar documentos:", error);
        setBackgroundLoading(prev => ({ ...prev, documentos: false }));
      });

    resumoPromise
      .then(handleResumoResult)
      .catch(error => {
        setProcessSummary(null);
        console.warn("Erro ao buscar resumo:", error);
        setBackgroundLoading(prev => ({ ...prev, resumo: false }));
      });

    console.log(`[DEBUG] Handlers conectados às promises`);
  };


  const onLoginSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoggingIn(true); setLoginError(null);
    try {
      const response = await loginToSEI(data);
      console.log('[DEBUG] Resposta do loginToSEI:', {
        success: response.success,
        tokenType: typeof response.token,
        token: response.token,
        unidades: response.unidades?.length
      });
      
      if (response.success && response.token) {
        const unidadesRecebidas = response.unidades || [];
        console.log('[DEBUG] Chamando persistLogin com token:', typeof response.token, response.token);
        
        // Verificação adicional: garantir que token é string
        if (typeof response.token !== 'string') {
          console.error('[DEBUG] Token da API não é string!', response.token);
          setLoginError('Erro interno: token inválido recebido da API');
          return;
        }
        
        console.log('[DEBUG] Login bem-sucedido - salvando dados:', {
          tokenLength: response.token?.length,
          unidadesCount: unidadesRecebidas.length,
          idUnidadeAtual: response.idUnidadeAtual
        });
        
        persistLogin(response.token, unidadesRecebidas, response.idUnidadeAtual);
        if (unidadesRecebidas.length > 0) toast({ title: "Login bem-sucedido!", description: `${unidadesRecebidas.length} unidades carregadas.` });
        else toast({ title: "Login Bem-sucedido", description: "Nenhuma unidade de acesso retornada.", variant: "default", duration: 7000 });
        setIsLoginDialogOpen(false); methods.reset();
      } else {
        setLoginError(response.error || "Falha no login.");
        toast({ title: "Erro de Login", description: response.error || "Falha no login.", variant: "destructive" });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido.";
      setLoginError(errorMsg);
      toast({ title: "Erro de Login", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    console.log('[DEBUG] Iniciando logout...');
    // Primeiro, limpamos os dados da página
    setRawProcessData(null); 
    setOpenUnitsInProcess(null); 
    setProcessLinkAcesso(null); 
    setDocuments(null); 
    setProcessSummary(null); 
    setApiSearchPerformed(false); 
    setProcessCreationInfo(null);
    
    // Depois fazemos o logout (que vai disparar o useEffect)
    persistLogout();
    
    toast({ title: "Logout realizado." });
    
    // Redirecionamento manual não é mais necessário - o useEffect vai cuidar disso
    console.log('[DEBUG] Logout concluído, useEffect vai redirecionar...');
  };

  const handleTaskCardClick = (task: ProcessedAndamento) => setTaskToScrollTo(task);
  const handleScrollToFirstTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[0]); };
  const handleScrollToLastTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[processedFlowData.tasks.length - 1]); };
  
  const handleBackToHome = () => {
    // Resetar todos os estados
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessLinkAcesso(null);
    setDocuments(null);
    setProcessSummary(null);
    setApiSearchPerformed(false);
    setProcessCreationInfo(null);
    setProcessoNumeroInput("");
    setTaskToScrollTo(null);
    setIsLoading(false);
    setSelectedLaneUnits([]);

    // Resetar estados de carregamento em background
    setBackgroundLoading({
      andamentos: false,
      unidades: false,
      documentos: false,
      resumo: false
    });

    // Limpar a URL removendo qualquer parâmetro
    router.push('/');

    toast({ title: "Voltando ao início" });
  };
  
  const inputRef = React.createRef<HTMLInputElement>();

  // Filtrar unidades baseado no termo de busca
  const filteredUnidades = useMemo(() => {
    if (!unidadeSearchTerm) return unidadesFiltroList;
    return unidadesFiltroList.filter(unidade => 
      unidade.Sigla.toLowerCase().includes(unidadeSearchTerm.toLowerCase()) ||
      unidade.Descricao.toLowerCase().includes(unidadeSearchTerm.toLowerCase())
    );
  }, [unidadesFiltroList, unidadeSearchTerm]);

  // Lista de tarefas em carregamento para mostrar no feedback
  const loadingTasks = useMemo(() => {
    const tasks = [];
    if (backgroundLoading.andamentos) tasks.push("Buscando andamentos do processo");
    if (backgroundLoading.unidades) tasks.push("Verificando unidades abertas");
    if (backgroundLoading.documentos) tasks.push("Carregando documentos");
    if (backgroundLoading.resumo) tasks.push("Gerando resumo com IA");
    return tasks;
  }, [backgroundLoading]);

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
            {apiSearchPerformed && (
              <Button onClick={handleBackToHome} variant="outline" size="sm" disabled={isLoading} title="Voltar ao início">
                <HomeIcon className="mr-2 h-4 w-4" /> Início
              </Button>
            )}
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
        {/* Logo e título centralizados no meio da tela */}
        {(!apiSearchPerformed && !isLoading) && (
          <div className="flex flex-col items-center justify-center flex-1 -mt-8">
            <div className="flex flex-col items-center space-y-4">
              <Image src="/logo-sead.png" alt="Logo SEAD Piauí" width={500} height={500} priority data-ai-hint="logo government" />
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold" style={{ color: '#107527' }}>Visualizador de Processos</h1>
                <span className="text-sm font-semibold text-blue-500 bg-blue-100 px-3 py-1 rounded-full">Beta</span>
              </div>
              <p className="text-muted-foreground text-center max-w-md mt-4">
                Para iniciar, selecione a unidade, insira o número do processo e clique em "Pesquisar".
              </p>
              
              {/* Campo de busca centralizado */}
              <div className="w-full max-w-2xl mt-8 space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Digite o número do processo..."
                    className="h-14 text-lg w-full pr-16 rounded-full border-2 border-gray-300 focus:border-green-500 shadow-lg"
                    value={processoNumeroInput}
                    onChange={(e) => setProcessoNumeroInput(e.target.value)}
                    disabled={isLoading || !isAuthenticated}
                    ref={inputRef}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !(!isAuthenticated || isLoading || !processoNumeroInput)) {
                        handleSearchClick();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSearchClick} 
                    disabled={!isAuthenticated || isLoading || !processoNumeroInput}
                    className="absolute right-2 top-2 h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white p-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback de carregamento centralizado na tela quando não há dados */}
        {hasBackgroundLoading && apiSearchPerformed && !rawProcessData && (
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
        
        {apiSearchPerformed && processCreationInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {processCreationInfo && (
              <Card>
                <CardHeader className="p-2">
                  <CardTitle className="text-md flex items-center text-green-600">
                    <FileText className="mr-2 h-5 w-5" /> Número: {rawProcessData?.Info?.NumeroProcesso || processoNumeroInput}
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
                  
                  {/* Feedback de carregamento dentro do card de informações gerais */}
                  {hasBackgroundLoading && apiSearchPerformed && (
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

            {apiSearchPerformed && (
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
                    {processSummary ? (
                      <div className="h-[150px] rounded-md border">
                        <ScrollArea className="h-full">
                          <div className="p-3">
                            <pre className="text-sm whitespace-pre-wrap break-words font-sans">{processSummary}</pre>
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
            )}
          </div>
        )}
        
        {apiSearchPerformed && rawProcessData && (
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
                        processNumber={processoNumeroInput || (rawProcessData?.Info?.NumeroProcesso)}
                        openUnitsInProcess={openUnitsInProcess}
                        processedFlowData={processedFlowData}
                        onTaskCardClick={handleTaskCardClick}
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
                  processNumber={processoNumeroInput || (rawProcessData?.Info?.NumeroProcesso)}
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
      

      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Login SEI</DialogTitle><DialogDescription>Forneça suas credenciais para acessar a API SEI.</DialogDescription></DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onLoginSubmit)} className="grid gap-4 py-4">
              <div className="space-y-1">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="usuario" className="text-right self-start">Usuário</Label>
                  <div className="col-span-3">
                    <Input id="usuario" {...register("usuario")} disabled={isLoggingIn} />
                    {errors.usuario && <p className="text-destructive text-xs mt-1">{errors.usuario.message}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="senha" className="text-right self-start">Senha</Label>
                  <div className="col-span-3">
                    <Input id="senha" type="password" {...register("senha")} disabled={isLoggingIn} />
                    {errors.senha && <p className="text-destructive text-xs mt-1">{errors.senha.message}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgao" className="text-right self-start">Orgão</Label>
                  <div className="col-span-3">
                    <Input id="orgao" {...register("orgao")} disabled={isLoggingIn} />
                    {errors.orgao && <p className="text-destructive text-xs mt-1">{errors.orgao.message}</p>}
                  </div>
                </div>
              </div>
              {loginError && <p className="text-destructive text-sm text-center">{loginError}</p>}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isLoggingIn}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isLoggingIn}>{isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Entrar</Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      <Dialog open={isApiStatusModalOpen} onOpenChange={setIsApiStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
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
                    Alguns processos com grande volume de andamentos (>500) podem apresentar lentidão na renderização do gráfico. Recomenda-se usar a opção "Resumido" para melhor desempenho.
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

      <footer className="p-3 border-t border-border text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center space-x-1 mb-2">
          <Sparkles className="h-3 w-3 text-accent" />
          <span>IA por SoberaniA</span>
        </div>
        © {currentYear !== null ? currentYear : new Date().getFullYear()} Visualizador de Processos. Todos os direitos reservados.
        <p className="text-xs text-muted-foreground/80 mt-1">
          Nota: Para fins de prototipagem, as credenciais de login são armazenadas temporariamente no estado do cliente. Em produção, utilize métodos de autenticação mais seguros.
        </p>
      </footer>
    </div>
  );
}

// Componente que usa useSearchParams
function HomeWithSearchParams() {
  const searchParams = useSearchParams();
  const processoFromUrl = searchParams.get('processo');

  return <HomeContent processoFromUrl={processoFromUrl} />;
}

// Componente principal exportado com Suspense
export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <HomeWithSearchParams />
    </Suspense>
  );
}
