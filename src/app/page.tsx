
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadeAberta, ProcessedAndamento, LoginCredentials, Andamento, Documento } from '@/types/process-flow';
import { Upload, FileJson, Search, Sparkles, Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info, LogIn, LogOut, Menu, CalendarDays, UserCircle, Building, CalendarClock, Briefcase, HelpCircle, GanttChartSquare, Activity, Home as HomeIcon, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import React, { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fetchProcessDataFromSEI, fetchOpenUnitsForProcess, fetchProcessSummary, fetchDocumentsFromSEI, loginToSEI, checkSEIApiHealth, checkSummaryApiHealth } from './sei-actions';
import type { HealthCheckResponse } from './sei-actions';
import ApiHealthCheck from '@/components/ApiHealthCheck';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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


export default function Home() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [rawProcessData, setRawProcessData] = useState<ProcessoData | null>(null);
  const [taskToScrollTo, setTaskToScrollTo] = useState<ProcessedAndamento | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Hook de autenticação persistente
  const {
    isAuthenticated,
    loginCredentials,
    unidadesFiltroList,
    selectedUnidadeFiltro,
    login: persistLogin,
    logout: persistLogout,
    updateSelectedUnidade
  } = usePersistedAuth();

  const [processoNumeroInput, setProcessoNumeroInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Processando dados...");
  const [isSummarizedView, setIsSummarizedView] = useState<boolean>(false);
  const [openUnitsInProcess, setOpenUnitsInProcess] = useState<UnidadeAberta[] | null>(null);
  const [processLinkAcesso, setProcessLinkAcesso] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Documento[] | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(false);

  const [processSummary, setProcessSummary] = useState<string | null>(null);

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [isApiStatusModalOpen, setIsApiStatusModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apiSearchPerformed, setApiSearchPerformed] = useState<boolean>(false);
  const [processCreationInfo, setProcessCreationInfo] = useState<ProcessCreationInfo | null>(null);
  const [isUnitsSidebarOpen, setIsUnitsSidebarOpen] = useState(true);
  const [unidadeSearchTerm, setUnidadeSearchTerm] = useState<string>("");


  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usuario: "", senha: "", orgao: "" },
  });
  const { register, handleSubmit, formState: { errors } } = methods;


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

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


  // useEffect removido - agora as requisições executam em paralelo no handleSearchClick


  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/json") {
      toast({ title: "Erro ao carregar arquivo", description: "Por favor, selecione um arquivo JSON.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsLoading(true);
    setLoadingMessage("Processando arquivo JSON...");
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessLinkAcesso(null);
    setDocuments(null);
    setIsLoadingDocuments(false);
    setProcessSummary(null);
    setApiSearchPerformed(false); 
    setProcessCreationInfo(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const jsonData = JSON.parse(text);
          if (jsonData && jsonData.Andamentos && Array.isArray(jsonData.Andamentos) && jsonData.Info) {
            setRawProcessData(jsonData as ProcessoData);
            setProcessoNumeroInput(jsonData.Info?.NumeroProcesso || processoNumeroInput || "");
            toast({ title: "Sucesso!", description: `Arquivo JSON "${file.name}" carregado e processado.` });
          } else {
            throw new Error("Formato JSON inválido. Estrutura esperada (Info, Andamentos) não encontrada.");
          }
        }
      } catch (error) {
        setRawProcessData(null); setOpenUnitsInProcess(null); setProcessLinkAcesso(null); setDocuments(null);
        toast({ title: "Erro ao processar JSON", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.", variant: "destructive" });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      toast({ title: "Erro ao ler arquivo", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsLoading(false);
    };
    reader.readAsText(file);
  };


  const handleSearchClick = async () => {
    if (!isAuthenticated || !loginCredentials) {
      toast({ title: "Não Autenticado", description: "Por favor, faça login para pesquisar.", variant: "destructive" });
      return;
    }
    if (!processoNumeroInput) {
      toast({ title: "Entrada Inválida", description: "Por favor, insira o número do processo.", variant: "destructive" });
      return;
    }
    if (!selectedUnidadeFiltro) {
      toast({ title: "Entrada Inválida", description: "Por favor, selecione uma unidade.", variant: "destructive" });
      return;
    }

    setApiSearchPerformed(true); 
    setIsLoading(true);
    setLoadingMessage("Buscando dados do processo...");
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessLinkAcesso(null);
    setDocuments(null);
    setIsLoadingDocuments(false);
    setProcessSummary(null);
    setProcessCreationInfo(null);

    // 🚀 REQUISIÇÕES VERDADEIRAMENTE INDEPENDENTES - cada uma renderiza assim que termina

    // 1. ANDAMENTOS (crítico - deve terminar primeiro para mostrar o fluxo)
    fetchProcessDataFromSEI(loginCredentials, processoNumeroInput, selectedUnidadeFiltro)
      .then(processData => {
        if ('error' in processData && typeof processData.error === 'string') {
          let errorTitle = "Erro ao buscar dados do processo";
          let errorDescription = processData.error;
          if (processData.status === 422) { errorTitle = "Erro de Validação (422)"; errorDescription = `Verifique o 'Número do Processo' e 'Unidade'.`; }
          else if (processData.status === 404) { errorTitle = "Processo Não Encontrado (404)"; errorDescription = `Processo não encontrado na unidade ${selectedUnidadeFiltro}.`; }
          else if (processData.status === 401) { errorTitle = "Falha na Autenticação (401)"; errorDescription = `Credenciais inválidas. Faça login novamente.`; handleLogout(); }
          else if (processData.status === 500) { errorTitle = "Erro Interno no Servidor SEI (500)"; errorDescription = `Tente novamente mais tarde.`;}
          toast({ title: errorTitle, description: errorDescription, variant: "destructive", duration: 9000 });
          setRawProcessData(null);
        } else if (!('error' in processData) && processData.Andamentos && Array.isArray(processData.Andamentos)) {
          // RENDERIZA FLUXO IMEDIATAMENTE assim que andamentos chegam
          setRawProcessData(processData);
          toast({ title: "Fluxo do Processo Carregado", description: `${processData.Andamentos.length} andamentos carregados.` });
        } else {
          toast({ title: "Erro Desconhecido (Andamentos)", description: "Resposta inesperada ao buscar andamentos.", variant: "destructive" });
          setRawProcessData(null);
        }
      })
      .catch(error => {
        console.error("Erro ao buscar dados do processo:", error);
        setRawProcessData(null);
        toast({ title: "Erro ao Buscar Andamentos", description: "Falha na requisição de andamentos.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false)); // Para loading do fluxo principal

    // 2. UNIDADES ABERTAS (independente - sidebar atualiza quando termina)
    fetchOpenUnitsForProcess(loginCredentials, processoNumeroInput, selectedUnidadeFiltro)
      .then(unitsData => {
        if ('error' in unitsData) {
          setOpenUnitsInProcess([]);
          setProcessLinkAcesso(null);
          console.warn("Erro ao buscar unidades abertas:", unitsData.error);
          if (unitsData.status === 401) {
            toast({ title: "Sessão Expirada ou Inválida", description: "Por favor, faça login novamente.", variant: "destructive" });
            handleLogout();
          }
        } else if (unitsData.unidades && Array.isArray(unitsData.unidades)) {
          // RENDERIZA SIDEBAR IMEDIATAMENTE
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
      })
      .catch(error => {
        setOpenUnitsInProcess([]);
        setProcessLinkAcesso(null);
        console.warn("Erro ao buscar unidades abertas:", error);
      });

    // 3. DOCUMENTOS (independente - links aparecem quando termina)
    fetchDocumentsFromSEI(loginCredentials, processoNumeroInput, selectedUnidadeFiltro)
      .then(documentsResponse => {
        if ('error' in documentsResponse) {
          setDocuments([]);
          console.warn("Erro ao buscar documentos:", documentsResponse.error);
        } else {
          // ATIVA LINKS DOS DOCUMENTOS IMEDIATAMENTE
          setDocuments(documentsResponse.Documentos);
          console.log(`Documentos carregados: ${documentsResponse.Documentos.length}`);
        }
      })
      .catch(error => {
        setDocuments([]);
        console.warn("Erro ao buscar documentos:", error);
      });

    // 4. RESUMO DO PROCESSO (independente - aparece quando IA termina)
    fetchProcessSummary(loginCredentials, processoNumeroInput, selectedUnidadeFiltro)
      .then(summaryResponse => {
        if ('error' in summaryResponse) {
          setProcessSummary(null);
          toast({ title: "Erro ao Gerar Resumo", description: summaryResponse.error, variant: "destructive", duration: 9000 });
        } else {
          // MOSTRA RESUMO IMEDIATAMENTE quando IA termina
          setProcessSummary(summaryResponse.summary.replace(/[#*]/g, ''));
          toast({ title: "Resumo do Processo Gerado", description: "Resumo carregado com sucesso." });
        }
      })
      .catch(error => {
        setProcessSummary(null);
        console.warn("Erro ao buscar resumo:", error);
      });
  };


  const onLoginSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoggingIn(true); setLoginError(null);
    try {
      const response = await loginToSEI(data);
      if (response.success && response.token) {
        const unidadesRecebidas = response.unidades || [];
        persistLogin(data, unidadesRecebidas);
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
    persistLogout();
    setRawProcessData(null); setOpenUnitsInProcess(null); setProcessLinkAcesso(null); setDocuments(null); setProcessSummary(null); setApiSearchPerformed(false); setProcessCreationInfo(null);
    toast({ title: "Logout realizado." });
  };

  const handleTaskCardClick = (task: ProcessedAndamento) => setTaskToScrollTo(task);
  const handleScrollToFirstTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[0]); };
  const handleScrollToLastTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[processedFlowData.tasks.length - 1]); };
  
  const handleBackToHome = () => {
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessLinkAcesso(null);
    setDocuments(null);
    setProcessSummary(null);
    setApiSearchPerformed(false);
    setProcessCreationInfo(null);
    setProcessoNumeroInput("");
    setTaskToScrollTo(null);
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

  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      {/* Barra de controles no topo */}
      <div className="p-3 border-b border-border shadow-sm sticky top-0 z-30 bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 max-w-full">
          <div className="flex flex-wrap items-center gap-2 flex-grow">
             <div className="flex items-center space-x-2 ml-auto sm:ml-0 flex-shrink-0">
              <Switch id="summarize-graph" checked={isSummarizedView} onCheckedChange={setIsSummarizedView} disabled={!rawProcessData || isLoading} />
              <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Resumido</Label>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {apiSearchPerformed && (
              <Button onClick={handleBackToHome} variant="outline" size="sm" disabled={isLoading} title="Voltar ao início">
                <HomeIcon className="mr-2 h-4 w-4" /> Início
              </Button>
            )}
            <Button onClick={handleFileUploadClick} variant="outline" size="sm" disabled={isLoading}>
              <Upload className="mr-2 h-4 w-4" /> JSON
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
                      if (e.key === 'Enter' && !(!isAuthenticated || isLoading || !processoNumeroInput || !selectedUnidadeFiltro)) {
                        handleSearchClick();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSearchClick} 
                    disabled={!isAuthenticated || isLoading || !processoNumeroInput || !selectedUnidadeFiltro}
                    className="absolute right-2 top-2 h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white p-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                
                {/* Seletor de unidade */}
                <div className="w-full">
                  <Select
                    value={selectedUnidadeFiltro || ""}
                    onValueChange={updateSelectedUnidade}
                    disabled={isLoading || !isAuthenticated || unidadesFiltroList.length === 0}
                  >
                    <SelectTrigger className="h-12 text-lg w-full rounded-full border-2 border-gray-300 focus:border-green-500 shadow-lg">
                      <SelectValue 
                        placeholder={isAuthenticated ? (unidadesFiltroList.length > 0 ? "Selecione uma unidade..." : "Nenhuma unidade") : "Login para unidades"} 
                      />
                    </SelectTrigger>
                    <SelectContent 
                      side="bottom" 
                      align="start"
                      sideOffset={4}
                      className="max-h-60"
                      position="popper"
                    >
                      <div className="px-2 py-2 border-b">
                        <Input
                          placeholder="Buscar por sigla..."
                          className="h-8 text-sm"
                          value={unidadeSearchTerm}
                          onChange={(e) => setUnidadeSearchTerm(e.target.value)}
                        />
                      </div>
                      {filteredUnidades.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          Nenhuma unidade encontrada
                        </div>
                      ) : (
                        filteredUnidades.map((unidade) => (
                          <SelectItem key={unidade.Id} value={unidade.Id}>
                            {unidade.Sigla} - {unidade.Descricao}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {apiSearchPerformed && processCreationInfo && (
          <Card className="mb-4">
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
            </CardContent>
          </Card>
        )}

        {apiSearchPerformed && processSummary && (
          <Card className="mb-4">
            <CardHeader className="p-2">
                <CardTitle className="text-md flex items-center text-green-600">
                <BookText className="mr-2 h-5 w-5" /> Entendimento Automatizado (IA)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-shrink-0 p-2 pt-0">
                {!processSummary && (
                <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 text-primary animate-spin" /><p className="ml-2 text-muted-foreground">Gerando...</p></div>
                )}
                {processSummary && (
                <ScrollArea className="max-h-[150px] rounded-md border flex-shrink-0"><div className="p-3"><pre className="text-xs whitespace-pre-wrap break-words font-sans">{processSummary}</pre></div></ScrollArea>
                )}
                {!processSummary && apiSearchPerformed && (
                <div className="flex items-center justify-center p-4 text-muted-foreground"><Info className="mr-2 h-4 w-4" />Nenhum resumo disponível.</div>
                )}
            </CardContent>
          </Card>
        )}
        
        {apiSearchPerformed && rawProcessData && (
          <div className="flex flex-1 mt-4 overflow-hidden">
            <div
              className={cn(
                "transition-all duration-300 ease-in-out border-r bg-card flex flex-col", 
                isUnitsSidebarOpen ? "w-[22rem] p-1 opacity-100" : "w-0 p-0 opacity-0" 
              )}
            >
              {isUnitsSidebarOpen && (
                <ScrollArea className="flex-1">
                  <Accordion type="single" collapsible defaultValue="open-units" className="w-full">
                    <AccordionItem value="open-units" className="border-b-0">
                      <AccordionTrigger className="text-base font-semibold hover:no-underline px-2 py-3 justify-start sticky top-0 bg-card z-10">
                         <span className="flex items-center">
                           <Briefcase className="mr-2 h-5 w-5 text-muted-foreground" />
                           Unidades com Processo Aberto
                         </span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0 pl-2 pr-2 pb-2">
                        <ProcessMetadataSidebar
                          processNumber={processoNumeroInput || (rawProcessData?.Info?.NumeroProcesso)}
                          openUnitsInProcess={openUnitsInProcess}
                          processedFlowData={processedFlowData}
                          onTaskCardClick={handleTaskCardClick}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {apiSearchPerformed && rawProcessData && (
                <div className="flex justify-end space-x-2 mb-2">
                  <Button variant="outline" size="sm" onClick={() => setIsUnitsSidebarOpen(!isUnitsSidebarOpen)} aria-label={isUnitsSidebarOpen ? "Fechar painel de metadados" : "Abrir painel de metadados"}>
                    <Menu className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleScrollToFirstTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length} aria-label="Ir para o início do fluxo">
                    <ChevronsLeft className="mr-2 h-4 w-4" /> Início
                  </Button>
                  <Button onClick={handleScrollToLastTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length} aria-label="Ir para o fim do fluxo">
                    <ChevronsRight className="mr-2 h-4 w-4" /> Fim
                  </Button>
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
              )}
              <ProcessFlowClient
                processedFlowData={processedFlowData}
                taskToScrollTo={taskToScrollTo}
                loginCredentials={loginCredentials}
                isAuthenticated={isAuthenticated}
                selectedUnidadeFiltro={selectedUnidadeFiltro}
                processNumber={processoNumeroInput || (rawProcessData?.Info?.NumeroProcesso)}
                documents={documents}
              />
            </div>
          </div>
        )}
        
        {isLoading && ( 
          <div className="flex flex-col items-center justify-center h-full p-10 text-center w-full">
            <Loader2 className="h-20 w-20 text-primary animate-spin mb-6" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{loadingMessage}</h2>
            <p className="text-muted-foreground max-w-md">Aguarde, processamento em andamento...</p>
          </div>
        )}
      </main>
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />

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

      <footer className="p-3 border-t border-border text-center text-xs text-muted-foreground">
        © {currentYear !== null ? currentYear : new Date().getFullYear()} Visualizador de Processos. Todos os direitos reservados.
        <div className="flex items-center justify-center space-x-1 mt-2">
          <Sparkles className="h-3 w-3 text-accent" />
          <span>IA por SoberaniA</span>
        </div>
        <p className="text-xs text-muted-foreground/80 mt-1">
          Nota: Para fins de prototipagem, as credenciais de login são armazenadas temporariamente no estado do cliente. Em produção, utilize métodos de autenticação mais seguros.
        </p>
      </footer>
    </div>
  );
}
