
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadeAberta, ProcessedAndamento, LoginCredentials, Andamento } from '@/types/process-flow';
import { Upload, FileJson, Search, Sparkles, Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info, LogIn, LogOut, Menu, CalendarDays, UserCircle, Building } from 'lucide-react';
import React, { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { sampleProcessFlowData } from '@/data/sample-process-data';
import { ProcessMetadataSidebar } from '@/components/process-flow/ProcessMetadataSidebar';
import { processAndamentos, parseCustomDateString, formatDisplayDate } from '@/lib/process-flow-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import { fetchProcessDataFromSEI, fetchOpenUnitsForProcess, fetchProcessSummary, loginToSEI } from './sei-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarInset } from '@/components/ui/sidebar';
import { differenceInCalendarDays, formatDistanceToNowStrict } from 'date-fns';
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

  const [unidadesFiltroList, setUnidadesFiltroList] = useState<UnidadeFiltro[]>([]);
  const [selectedUnidadeFiltro, setSelectedUnidadeFiltro] = useState<string | undefined>(undefined);
  const [processoNumeroInput, setProcessoNumeroInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingOpenUnits, setIsLoadingOpenUnits] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Processando dados...");
  const [isSummarizedView, setIsSummarizedView] = useState<boolean>(false);
  const [openUnitsInProcess, setOpenUnitsInProcess] = useState<UnidadeAberta[] | null>(null);

  const [processSummary, setProcessSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apiSearchPerformed, setApiSearchPerformed] = useState<boolean>(false);
  const [processCreationInfo, setProcessCreationInfo] = useState<ProcessCreationInfo | null>(null);


  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usuario: "", senha: "", orgao: "" },
  });
  const { register, handleSubmit, formState: { errors } } = methods;


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const processedFlowData: ProcessedFlowData | null = useMemo(() => {
    if (!rawProcessData || !rawProcessData.Andamentos) {
      setApiSearchPerformed(false); // Reset if raw data becomes null (e.g. logout)
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
        generationEvent = sortedAndamentos[0]; // Fallback to the very first event
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


  useEffect(() => {
    const numeroProcessoAtual = rawProcessData?.Info?.NumeroProcesso || processoNumeroInput;
    if (numeroProcessoAtual && selectedUnidadeFiltro && isAuthenticated && loginCredentials) {
      setIsLoadingOpenUnits(true);
      setOpenUnitsInProcess(null);
      fetchOpenUnitsForProcess(loginCredentials, numeroProcessoAtual, selectedUnidadeFiltro)
        .then(result => {
          if ('error' in result) {
            setOpenUnitsInProcess([]);
            if (result.status === 401) {
                 toast({ title: "Sessão Expirada ou Inválida", description: "Por favor, faça login novamente.", variant: "destructive" });
                 handleLogout();
            }
          } else {
            setOpenUnitsInProcess(result);
          }
        })
        .catch(error => {
          setOpenUnitsInProcess([]);
        })
        .finally(() => {
          setIsLoadingOpenUnits(false);
        });
    } else {
        setOpenUnitsInProcess(null);
    }
  }, [rawProcessData, processoNumeroInput, selectedUnidadeFiltro, isAuthenticated, loginCredentials, toast]);


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
        setRawProcessData(null); setOpenUnitsInProcess(null);
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

  const loadSampleData = () => {
    setIsLoading(true);
    setLoadingMessage("Carregando dados de exemplo...");
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessSummary(null);
    setApiSearchPerformed(false);
    setProcessCreationInfo(null);

     const sampleDataWithInfo: ProcessoData = {
      Info: { ...sampleProcessFlowData.Info, Pagina: sampleProcessFlowData.Info?.Pagina || 1, TotalPaginas: sampleProcessFlowData.Info?.TotalPaginas || 1, QuantidadeItens: sampleProcessFlowData.Andamentos.length, TotalItens: sampleProcessFlowData.Info?.TotalItens || sampleProcessFlowData.Andamentos.length, NumeroProcesso: sampleProcessFlowData.Info?.NumeroProcesso || "0042431-96.2023.8.18.0001 (Exemplo)" },
      Andamentos: sampleProcessFlowData.Andamentos,
    };
    setRawProcessData(sampleDataWithInfo);
    setProcessoNumeroInput(sampleDataWithInfo.Info?.NumeroProcesso || "0042431-96.2023.8.18.0001 (Exemplo)");
    toast({ title: "Dados de exemplo carregados", description: "Visualizando o fluxograma de exemplo." });
    setIsLoading(false);
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

    setLoadingMessage("Buscando dados do processo e resumo...");
    setIsLoading(true);
    setIsLoadingSummary(true);
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessSummary(null);
    setApiSearchPerformed(true); // Mark that API search was initiated
    setProcessCreationInfo(null);


    try {
      const [processDataResult, summaryResult] = await Promise.all([
        fetchProcessDataFromSEI(loginCredentials, processoNumeroInput, selectedUnidadeFiltro),
        fetchProcessSummary(loginCredentials, processoNumeroInput, selectedUnidadeFiltro)
      ]);

      if ('error' in processDataResult && typeof processDataResult.error === 'string') {
        let errorTitle = "Erro ao buscar dados do processo";
        let errorDescription = processDataResult.error;
        if (processDataResult.status === 422) { errorTitle = "Erro de Validação (422)"; errorDescription = `Verifique o 'Número do Processo' e 'Unidade'.`; }
        else if (processDataResult.status === 404) { errorTitle = "Processo Não Encontrado (404)"; errorDescription = `Processo não encontrado na unidade ${selectedUnidadeFiltro}.`; }
        else if (processDataResult.status === 401) { errorTitle = "Falha na Autenticação (401)"; errorDescription = `Credenciais inválidas. Faça login novamente.`; handleLogout(); }
        else if (processDataResult.status === 500) { errorTitle = "Erro Interno no Servidor SEI (500)"; errorDescription = `Tente novamente mais tarde.`;}
        toast({ title: errorTitle, description: errorDescription, variant: "destructive", duration: 9000 });
        setRawProcessData(null);
        setApiSearchPerformed(false);
      } else if (!('error' in processDataResult) && processDataResult.Andamentos && Array.isArray(processDataResult.Andamentos)) {
        setRawProcessData(processDataResult);
        toast({ title: "Dados do Processo Carregados", description: `Total ${processDataResult.Andamentos.length} andamentos carregados.` });
      } else {
        toast({ title: "Erro Desconhecido (Andamentos)", description: "Resposta inesperada ao buscar andamentos.", variant: "destructive" });
        setRawProcessData(null);
        setApiSearchPerformed(false);
      }

      if ('error' in summaryResult) {
        toast({ title: "Erro ao Gerar Resumo", description: summaryResult.error, variant: "destructive", duration: 9000 });
        setProcessSummary(null);
      } else {
        setProcessSummary(summaryResult.summary.replace(/[#*]/g, ''));
        toast({ title: "Resumo do Processo Gerado", description: "Resumo carregado com sucesso." });
      }

    } catch (error) {
      toast({ title: "Erro Inesperado", description: error instanceof Error ? error.message : "Erro ao buscar dados.", variant: "destructive", duration: 7000 });
      setRawProcessData(null); setProcessSummary(null); setApiSearchPerformed(false);
    } finally {
      setLoadingMessage("Processando dados..."); setIsLoading(false); setIsLoadingSummary(false);
    }
  };


  const onLoginSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoggingIn(true); setLoginError(null);
    try {
      const response = await loginToSEI(data);
      if (response.success && response.token) {
        setLoginCredentials(data); setIsAuthenticated(true);
        const unidadesRecebidas = response.unidades || [];
        setUnidadesFiltroList(unidadesRecebidas);
        if (unidadesRecebidas.length > 0) toast({ title: "Login bem-sucedido!", description: `${unidadesRecebidas.length} unidades carregadas.` });
        else toast({ title: "Login Bem-sucedido", description: "Nenhuma unidade de acesso retornada.", variant: "default", duration: 7000 });
        setSelectedUnidadeFiltro(undefined); setIsLoginDialogOpen(false); methods.reset();
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
    setIsAuthenticated(false); setLoginCredentials(null); setUnidadesFiltroList([]); setSelectedUnidadeFiltro(undefined);
    setRawProcessData(null); setOpenUnitsInProcess(null); setProcessSummary(null); setApiSearchPerformed(false); setProcessCreationInfo(null);
    toast({ title: "Logout realizado." });
  };

  const handleTaskCardClick = (task: ProcessedAndamento) => setTaskToScrollTo(task);
  const handleScrollToFirstTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[0]); };
  const handleScrollToLastTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[processedFlowData.tasks.length - 1]); };
  const inputRef = React.createRef<HTMLInputElement>();

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "20rem" }}>
      <main className="min-h-screen flex flex-col bg-background">
        <header className="p-2 border-b border-border shadow-sm sticky top-0 z-40 bg-background">
          <div className="container mx-auto flex items-center justify-start max-w-full">
            <Image src="/logo-sead.png" alt="Logo SEAD Piauí" width={120} height={45} priority data-ai-hint="logo government" />
          </div>
        </header>

        {/* Main Control Bar */}
        <div className="p-3 border-b border-border shadow-sm sticky top-[61px] z-30 bg-card">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 max-w-full">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mr-1 md:hidden"> <Menu className="h-5 w-5" /> </SidebarTrigger>
              <h1 className="text-lg font-semibold" style={{ color: '#107527' }}>Visualizador de Processos</h1>
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Beta</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="text"
                placeholder="Número do Processo..."
                className="h-9 text-sm w-44"
                value={processoNumeroInput}
                onChange={(e) => setProcessoNumeroInput(e.target.value)}
                disabled={isLoading || isLoadingSummary || !isAuthenticated}
                ref={inputRef}
              />
              <Select
                value={selectedUnidadeFiltro}
                onValueChange={setSelectedUnidadeFiltro}
                disabled={isLoading || isLoadingSummary || !isAuthenticated || unidadesFiltroList.length === 0}
              >
                <SelectTrigger className="h-9 text-sm w-[180px]">
                  <SelectValue placeholder={isAuthenticated ? (unidadesFiltroList.length > 0 ? "Filtrar Unidade" : "Nenhuma unidade") : "Login para unidades"} />
                </SelectTrigger>
                <SelectContent>
                  {unidadesFiltroList.map((unidade) => (
                    <SelectItem key={unidade.Id} value={unidade.Id}>{unidade.Sigla} ({unidade.Descricao.substring(0,20)}...)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleSearchClick} disabled={isLoading || isLoadingSummary || !processoNumeroInput || !selectedUnidadeFiltro || !isAuthenticated}>
                {(isLoading || isLoadingSummary) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />} Pesquisar
              </Button>
              <Button onClick={handleFileUploadClick} variant="outline" size="sm" disabled={isLoading || isLoadingSummary}>
                <Upload className="mr-2 h-4 w-4" /> JSON
              </Button>
              <div className="flex items-center space-x-2">
                <Switch id="summarize-graph" checked={isSummarizedView} onCheckedChange={setIsSummarizedView} disabled={!rawProcessData || isLoading || isLoadingSummary} />
                <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Resumido</Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
               {isAuthenticated ? (
                <Button variant="outline" size="sm" onClick={handleLogout}> <LogOut className="mr-2 h-4 w-4" /> Logout </Button>
              ) : (
                <Button variant="default" size="sm" onClick={() => setIsLoginDialogOpen(true)}> <LogIn className="mr-2 h-4 w-4" /> Login </Button>
              )}
              <div className="hidden md:flex items-center space-x-1 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>IA por SoberaniA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <SidebarContent className="p-0"> {/* Remove padding from content if sidebar itself adds it */}
              <ProcessMetadataSidebar
                processNumber={processoNumeroInput || (rawProcessData?.Info?.NumeroProcesso)}
                processNumberPlaceholder="Nenhum processo carregado"
                openUnitsInProcess={openUnitsInProcess}
                isLoadingOpenUnits={isLoadingOpenUnits}
                processedFlowData={processedFlowData}
                onTaskCardClick={handleTaskCardClick}
              />
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex-1 flex flex-col overflow-y-auto"> {/* Main content area */}
            <div className="container mx-auto max-w-full p-4 space-y-6">
              {apiSearchPerformed && rawProcessData && (processCreationInfo || processSummary) && (
                <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      Informações do Processo e Resumo AI
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="space-y-4">
                        {processCreationInfo && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center">
                                <FileText className="mr-2 h-5 w-5 text-primary" /> Detalhes do Processo
                              </CardTitle>
                              <CardDescription>Número: {rawProcessData.Info?.NumeroProcesso || processoNumeroInput}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground" />Unidade Criadora: <span className="font-medium ml-1">{processCreationInfo.creatorUnit}</span></div>
                              <div className="flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />Usuário Criador: <span className="font-medium ml-1">{processCreationInfo.creatorUser}</span></div>
                              <div className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />Data de Criação: <span className="font-medium ml-1">{processCreationInfo.creationDate}</span></div>
                              <div className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />Tempo Desde Criação: <span className="font-medium ml-1">{processCreationInfo.timeSinceCreation}</span></div>
                            </CardContent>
                          </Card>
                        )}
                        {(isLoadingSummary || processSummary) && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center">
                                <BookText className="mr-2 h-5 w-5 text-primary" /> Resumo IA do Processo
                              </CardTitle>
                              <CardDescription>Este é um resumo gerado por IA sobre o processo.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col flex-shrink-0">
                              {isLoadingSummary && !processSummary && (
                                <div className="flex items-center justify-center p-6"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="ml-3 text-muted-foreground">Gerando resumo...</p></div>
                              )}
                              {processSummary && (
                                <ScrollArea className="max-h-[200px] rounded-md border flex-shrink-0"><div className="p-4"><pre className="text-sm whitespace-pre-wrap break-words font-sans">{processSummary}</pre></div></ScrollArea>
                              )}
                              {!processSummary && !isLoadingSummary && (
                                <div className="flex items-center justify-center p-6 text-muted-foreground"><Info className="mr-2 h-5 w-5" />Nenhum resumo disponível.</div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Process Flow Diagram Area */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-[500px]"> {/* Ensure this takes up space */}
                {isLoading && !loadingMessage.includes("API SEI") && !loadingMessage.includes("resumo") ? (
                  <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                    <Loader2 className="h-20 w-20 text-primary animate-spin mb-6" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">{loadingMessage}</h2>
                    <p className="text-muted-foreground max-w-md">Por favor, aguarde. Os dados estão sendo preparados.</p>
                  </div>
                ) : processedFlowData ? (
                  <ProcessFlowClient
                    processedFlowData={processedFlowData}
                    taskToScrollTo={taskToScrollTo}
                    onScrollToFirstTask={handleScrollToFirstTask}
                    onScrollToLastTask={handleScrollToLastTask}
                    loginCredentials={loginCredentials}
                    isAuthenticated={isAuthenticated}
                  />
                ) : isLoading || isLoadingSummary ? (
                  <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                    <Loader2 className="h-20 w-20 text-primary animate-spin mb-6" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">{loadingMessage}</h2>
                    <p className="text-muted-foreground max-w-md">Aguarde, consulta à API SEI e/ou resumo em andamento.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                    <FileJson className="h-24 w-24 text-muted-foreground/40 mb-8" />
                    <h2 className="text-2xl font-semibold text-foreground mb-3">
                      {isAuthenticated ? "Nenhum processo carregado" : "Autenticação Necessária"}
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-md">
                      {isAuthenticated
                        ? 'Para iniciar, insira o número do processo, selecione a unidade e clique em "Pesquisar", ou carregue um arquivo JSON/dados de exemplo.'
                        : "Por favor, faça login para pesquisar processos ou carregar dados da API SEI."
                      }
                    </p>
                    <div className="flex space-x-4">
                      <Button onClick={loadSampleData} variant="secondary" disabled={isLoading || isLoadingSummary}>Usar Dados de Exemplo</Button>
                      {!isAuthenticated && (
                        <Button onClick={() => setIsLoginDialogOpen(true)} variant="default"><LogIn className="mr-2 h-4 w-4" />Login SEI</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div> {/* End of container for accordion and diagram */}
          </SidebarInset> {/* End of Main content area */}
        </div> {/* End of flex container for sidebar and main content */}

        <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>Login SEI</DialogTitle><DialogDescription>Forneça suas credenciais para acessar a API SEI.</DialogDescription></DialogHeader>
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onLoginSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="usuario" className="text-right">Usuário</Label>
                  <Input id="usuario" {...register("usuario")} className="col-span-3" disabled={isLoggingIn} />
                  {errors.usuario && <p className="col-span-4 text-destructive text-xs text-right">{errors.usuario.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="senha" className="text-right">Senha</Label>
                  <Input id="senha" type="password" {...register("senha")} className="col-span-3" disabled={isLoggingIn} />
                  {errors.senha && <p className="col-span-4 text-destructive text-xs text-right">{errors.senha.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgao" className="text-right">Orgão</Label>
                  <Input id="orgao" {...register("orgao")} className="col-span-3" disabled={isLoggingIn} />
                  {errors.orgao && <p className="col-span-4 text-destructive text-xs text-right">{errors.orgao.message}</p>}
                </div>
                {loginError && <p className="text-destructive text-sm text-center col-span-4">{loginError}</p>}
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isLoggingIn}>Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={isLoggingIn}>{isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Entrar</Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
        </Dialog>

        <footer className="p-3 border-t border-border text-center text-xs text-muted-foreground">
          © {currentYear !== null ? currentYear : new Date().getFullYear()} Visualizador de Processos. Todos os direitos reservados.
          <p className="text-xs text-muted-foreground/80 mt-1">
            Nota: Para fins de prototipagem, as credenciais de login são armazenadas temporariamente no estado do cliente. Em produção, utilize métodos de autenticação mais seguros.
          </p>
        </footer>
      </main>
    </SidebarProvider>
  );
}
