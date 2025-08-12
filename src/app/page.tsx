
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadeAberta, ProcessedAndamento, LoginCredentials, Andamento } from '@/types/process-flow';
import { Upload, FileJson, Search, Sparkles, Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info, LogIn, LogOut, Menu, CalendarDays, UserCircle, Building, CalendarClock, Briefcase, HelpCircle, GanttChartSquare } from 'lucide-react';
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
import { ProcessFlowLegend } from '@/components/process-flow/ProcessFlowLegend';
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
import { fetchProcessDataFromSEI, fetchOpenUnitsForProcess, fetchProcessSummary, loginToSEI } from './sei-actions';
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
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apiSearchPerformed, setApiSearchPerformed] = useState<boolean>(false);
  const [processCreationInfo, setProcessCreationInfo] = useState<ProcessCreationInfo | null>(null);
  const [isUnitsSidebarOpen, setIsUnitsSidebarOpen] = useState(true);


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

    setApiSearchPerformed(true); 
    setLoadingMessage("Buscando dados do processo e resumo...");
    setIsLoading(true);
    setIsLoadingSummary(true);
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessSummary(null);
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
      } else if (!('error' in processDataResult) && processDataResult.Andamentos && Array.isArray(processDataResult.Andamentos)) {
        setRawProcessData(processDataResult);
        toast({ title: "Dados do Processo Carregados", description: `Total ${processDataResult.Andamentos.length} andamentos carregados.` });
      } else {
        toast({ title: "Erro Desconhecido (Andamentos)", description: "Resposta inesperada ao buscar andamentos.", variant: "destructive" });
        setRawProcessData(null);
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
      setRawProcessData(null); setProcessSummary(null);
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
    <div className="flex flex-col min-h-screen bg-background w-full">
      <header className="p-2 border-b border-border shadow-sm sticky top-0 z-40 bg-background">
        <div className="container mx-auto flex items-center justify-between max-w-full">
          <div className="flex items-center space-x-2">
            <Image src="/logo-sead.png" alt="Logo SEAD Piauí" width={120} height={45} priority data-ai-hint="logo government" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold" style={{ color: '#107527' }}>Visualizador de Processos</h1>
              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Beta</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>IA por SoberaniA</span>
          </div>
        </div>
      </header>

      <div className="p-3 border-b border-border shadow-sm sticky top-[61px] z-30 bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 max-w-full">
          <div className="flex flex-wrap items-center gap-2 flex-grow">
             <Select
              value={selectedUnidadeFiltro}
              onValueChange={setSelectedUnidadeFiltro}
              disabled={isLoading || isLoadingSummary || !isAuthenticated || unidadesFiltroList.length === 0}
            >
              <SelectTrigger className="h-9 text-sm w-full sm:w-auto min-w-[150px] sm:min-w-[180px] flex-shrink-0">
                <SelectValue placeholder={isAuthenticated ? (unidadesFiltroList.length > 0 ? "Filtrar Unidade" : "Nenhuma unidade") : "Login para unidades"} />
              </SelectTrigger>
              <SelectContent>
                {unidadesFiltroList.map((unidade) => (
                  <SelectItem key={unidade.Id} value={unidade.Id}>{unidade.Sigla} ({unidade.Descricao.substring(0,20)}...)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Número do Processo..."
              className="h-9 text-sm w-full sm:w-auto min-w-[150px] sm:min-w-[180px] flex-shrink-0"
              value={processoNumeroInput}
              onChange={(e) => setProcessoNumeroInput(e.target.value)}
              disabled={isLoading || isLoadingSummary || !isAuthenticated}
              ref={inputRef}
            />
            <Button variant="outline" size="sm" onClick={handleSearchClick} disabled={isLoading || isLoadingSummary || !processoNumeroInput || !selectedUnidadeFiltro || !isAuthenticated} className="bg-green-600 hover:bg-green-700 text-primary-foreground">
              {(isLoading || isLoadingSummary) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />} Pesquisar
            </Button>
             <div className="flex items-center space-x-2 ml-auto sm:ml-0 flex-shrink-0">
              <Switch id="summarize-graph" checked={isSummarizedView} onCheckedChange={setIsSummarizedView} disabled={!rawProcessData || isLoading || isLoadingSummary} />
              <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Resumido</Label>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={handleFileUploadClick} variant="outline" size="sm" disabled={isLoading || isLoadingSummary}>
              <Upload className="mr-2 h-4 w-4" /> JSON
            </Button>
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleLogout}> <LogOut className="mr-2 h-4 w-4" /> Logout </Button>
            ) : (
              <Button variant="default" size="sm" onClick={() => setIsLoginDialogOpen(true)}> <LogIn className="mr-2 h-4 w-4" /> Login </Button>
            )}
          </div>
        </div>
      </div>
      
      <main className="flex-1 flex flex-col overflow-y-auto p-4 w-full">
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
            </CardContent>
          </Card>
        )}

        {apiSearchPerformed && (isLoadingSummary || processSummary) && (
          <Card className="mb-4">
            <CardHeader className="p-2">
                <CardTitle className="text-md flex items-center text-green-600">
                <BookText className="mr-2 h-5 w-5" /> Entendimento Automatizado (IA)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-shrink-0 p-2 pt-0">
                {isLoadingSummary && !processSummary && (
                <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 text-primary animate-spin" /><p className="ml-2 text-muted-foreground">Gerando...</p></div>
                )}
                {processSummary && (
                <ScrollArea className="max-h-[150px] rounded-md border flex-shrink-0"><div className="p-3"><pre className="text-xs whitespace-pre-wrap break-words font-sans">{processSummary}</pre></div></ScrollArea>
                )}
                {!processSummary && !isLoadingSummary && apiSearchPerformed && (
                <div className="flex items-center justify-center p-4 text-muted-foreground"><Info className="mr-2 h-4 w-4" />Nenhum resumo disponível.</div>
                )}
            </CardContent>
          </Card>
        )}
        
        {apiSearchPerformed && rawProcessData ? (
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
                          isLoadingOpenUnits={isLoadingOpenUnits}
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
                      <DialogHeader><DialogTitle>Legenda de Cores dos Nós</DialogTitle></DialogHeader>
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
              />
            </div>
          </div>
        ) : isLoading || isLoadingSummary ? ( 
          <div className="flex flex-col items-center justify-center h-full p-10 text-center w-full">
            <Loader2 className="h-20 w-20 text-primary animate-spin mb-6" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{loadingMessage}</h2>
            <p className="text-muted-foreground max-w-md">Aguarde, consulta à API SEI e/ou resumo em andamento.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-10 text-center w-full">
            <FileJson className="h-32 w-32 text-muted-foreground/30 mb-8" />
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              {isAuthenticated ? "Nenhum processo carregado" : "Autenticação Necessária"}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md text-center">
              {isAuthenticated
                ? 'Para iniciar, selecione a unidade, insira o número do processo e clique em "Pesquisar", ou carregue um arquivo JSON/dados de exemplo.'
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

      <footer className="p-3 border-t border-border text-center text-xs text-muted-foreground">
        © {currentYear !== null ? currentYear : new Date().getFullYear()} Visualizador de Processos. Todos os direitos reservados.
        <p className="text-xs text-muted-foreground/80 mt-1">
          Nota: Para fins de prototipagem, as credenciais de login são armazenadas temporariamente no estado do cliente. Em produção, utilize métodos de autenticação mais seguros.
        </p>
      </footer>
    </div>
  );
}
