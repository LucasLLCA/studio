
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadeAberta, ProcessedAndamento, LoginCredentials } from '@/types/process-flow';
import { Upload, FileJson, Search, Sparkles, Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info, LogIn, LogOut } from 'lucide-react';
import React, { useState, useEffect, useRef, ChangeEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { sampleProcessFlowData } from '@/data/sample-process-data';
import { ProcessMetadataSidebar } from '@/components/process-flow/ProcessMetadataSidebar';
import { processAndamentos } from '@/lib/process-flow-utils';
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

import { fetchProcessDataFromSEI, fetchOpenUnitsForProcess, fetchProcessSummary, loginToSEI } from './sei-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const loginSchema = z.object({
  usuario: z.string().min(1, "Usuário é obrigatório."),
  senha: z.string().min(1, "Senha é obrigatória."),
  orgao: z.string().min(1, "Orgão é obrigatório."),
});
type LoginFormValues = z.infer<typeof loginSchema>;


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

  // Login state
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
    const numeroProcessoAtual = rawProcessData?.Info?.NumeroProcesso || processoNumeroInput;
    if (numeroProcessoAtual && selectedUnidadeFiltro && isAuthenticated && loginCredentials) {
      setIsLoadingOpenUnits(true);
      setOpenUnitsInProcess(null);
      console.log(`[UI] Fetching open units for: Processo='${numeroProcessoAtual}', Unidade='${selectedUnidadeFiltro}'`);
      fetchOpenUnitsForProcess(loginCredentials, numeroProcessoAtual, selectedUnidadeFiltro)
        .then(result => {
          if ('error' in result) {
            console.error(
              `Error fetching open units: Status ${result.status || 'N/A'}, Error: "${result.error}"`,
              `Details: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details)}`,
              `Params used: processo="${numeroProcessoAtual}", unidade="${selectedUnidadeFiltro}"`
            );
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
          console.error(
            "[UI] Unexpected error fetching open units:", error,
            `Params used: processo="${numeroProcessoAtual}", unidade="${selectedUnidadeFiltro}"`
            );
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
    if (!file) {
      return;
    }

    if (file.type !== "application/json") {
      toast({
        title: "Erro ao carregar arquivo",
        description: "Por favor, selecione um arquivo JSON.",
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Processando arquivo JSON...");
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessSummary(null);


    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const jsonData = JSON.parse(text);
          if (jsonData && jsonData.Andamentos && Array.isArray(jsonData.Andamentos) && jsonData.Info) {
            setRawProcessData(jsonData as ProcessoData);
            setProcessoNumeroInput(jsonData.Info?.NumeroProcesso || processoNumeroInput || "");
            toast({
              title: "Sucesso!",
              description: `Arquivo JSON "${file.name}" carregado e processado.`,
            });
          } else {
            throw new Error("Formato JSON inválido. Estrutura esperada (Info, Andamentos) não encontrada.");
          }
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
        setRawProcessData(null);
        setOpenUnitsInProcess(null);
        toast({
          title: "Erro ao processar JSON",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
          variant: "destructive",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo selecionado.",
        variant: "destructive",
      });
       if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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

     const sampleDataWithInfo: ProcessoData = {
      Info: {
        ...sampleProcessFlowData.Info,
        Pagina: sampleProcessFlowData.Info?.Pagina || 1,
        TotalPaginas: sampleProcessFlowData.Info?.TotalPaginas || 1,
        QuantidadeItens: sampleProcessFlowData.Andamentos.length,
        TotalItens: sampleProcessFlowData.Info?.TotalItens || sampleProcessFlowData.Andamentos.length,
        NumeroProcesso: sampleProcessFlowData.Info?.NumeroProcesso || "0042431-96.2023.8.18.0001 (Exemplo)",
      },
      Andamentos: sampleProcessFlowData.Andamentos,
    };
    setRawProcessData(sampleDataWithInfo);
    setProcessoNumeroInput(sampleDataWithInfo.Info?.NumeroProcesso || "0042431-96.2023.8.18.0001 (Exemplo)");

    toast({
        title: "Dados de exemplo carregados",
        description: "Visualizando o fluxograma de exemplo.",
    });
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

    console.log(`[UI] Iniciando busca SEI com: Processo='${processoNumeroInput}', Unidade='${selectedUnidadeFiltro}'`);
    setLoadingMessage("Buscando dados do processo e resumo...");
    setIsLoading(true);
    setIsLoadingSummary(true); 
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessSummary(null);

    try {
      const [processDataResult, summaryResult] = await Promise.all([
        fetchProcessDataFromSEI(loginCredentials, processoNumeroInput, selectedUnidadeFiltro),
        fetchProcessSummary(loginCredentials, processoNumeroInput, selectedUnidadeFiltro)
      ]);

      // Handle Process Data Result
      if ('error' in processDataResult && typeof processDataResult.error === 'string') {
        let errorTitle = "Erro ao buscar dados do processo";
        let errorDescription = processDataResult.error;

        if (processDataResult.status === 422) {
          errorTitle = "Erro de Validação dos Dados (422)";
          errorDescription = `A API não pôde processar os dados fornecidos. Verifique se o 'Número do Processo' (ex: 00002.001000/2024-92) e a 'Unidade' selecionada são corretos e são válidos para esta consulta.`;
        } else if (processDataResult.status === 404) {
          errorTitle = "Processo Não Encontrado (404)";
          errorDescription = `Processo não encontrado na unidade ${selectedUnidadeFiltro} para o número ${processoNumeroInput}, ou o processo não possui andamentos registrados nessa unidade. Verifique os dados e tente novamente.`;
        } else if (processDataResult.status === 401) {
          errorTitle = "Falha na Autenticação com a API SEI (401)";
          errorDescription = `Não foi possível autenticar com o servidor SEI. Verifique se as credenciais estão corretas e tente fazer login novamente.`;
          handleLogout(); 
        } else if (processDataResult.status === 500) {
            errorTitle = "Erro Interno no Servidor da API SEI (500)";
            errorDescription = `O servidor da API SEI encontrou um problema. Tente novamente mais tarde.`;
        } else if (processDataResult.status) {
             errorDescription = `Erro ${processDataResult.status}: ${processDataResult.error || 'Desconhecido'}`;
        }
        if (processDataResult.details) {
            try {
                const detailsString = typeof processDataResult.details === 'string' ? processDataResult.details : JSON.stringify(processDataResult.details);
                if (detailsString && detailsString !== '{}' && detailsString.length < 250) {
                    errorDescription += ` Detalhes: ${detailsString}`;
                } else if (detailsString.length >= 250) {
                    errorDescription += ` Detalhes da API muito longos para exibição.`;
                }
            } catch (e) { /* erro ao formatar detalhes */ }
        }
        toast({ title: errorTitle, description: errorDescription, variant: "destructive", duration: 9000 });
        setRawProcessData(null);
      } else if (!('error' in processDataResult) && processDataResult.Andamentos && Array.isArray(processDataResult.Andamentos)) {
        setRawProcessData(processDataResult);
        toast({ title: "Dados do Processo Carregados", description: `Total ${processDataResult.Andamentos.length} andamentos carregados da API.` });
      } else if (!('error' in processDataResult)) {
        console.error("[UI] Resposta da API SEI (andamentos) bem-sucedida, mas 'Andamentos' está ausente ou não é um array:", processDataResult);
        toast({ title: "Dados Incompletos (Andamentos)", description: "A API retornou uma resposta, mas não contém os andamentos esperados.", variant: "destructive", duration: 7000 });
        setRawProcessData(null);
      } else {
        console.error("[UI] Resposta inesperada da API SEI (andamentos):", processDataResult);
        toast({ title: "Erro Desconhecido (Andamentos)", description: "A API retornou uma resposta inesperada ao buscar andamentos.", variant: "destructive" });
        setRawProcessData(null);
      }

      // Handle Summary Result
      if ('error' in summaryResult) {
        let description = summaryResult.error;
        if (summaryResult.error.toLowerCase().includes("failed to fetch") || summaryResult.error.toLowerCase().includes("load failed")) {
           description = `Não foi possível conectar à API de resumo. Verifique o serviço e CORS. Detalhes: ${summaryResult.details || summaryResult.error}`;
        } else if (summaryResult.details && typeof summaryResult.details === 'string' && summaryResult.details.length > 0 && summaryResult.details.length < 150 && summaryResult.details !== '{}') {
           description += ` Detalhes: ${summaryResult.details}`;
        }
        toast({ title: "Erro ao Gerar Resumo do Processo", description: description, variant: "destructive", duration: 9000 });
        setProcessSummary(null);
      } else {
        const cleanedSummary = summaryResult.summary.replace(/[#*]/g, '');
        setProcessSummary(cleanedSummary);
        toast({ title: "Resumo do Processo Gerado", description: "O resumo do processo foi carregado com sucesso." });
      }

    } catch (error) {
      console.error("[UI] Erro inesperado ao buscar dados do processo e/ou resumo:", error);
      let errorMessage = "Ocorreu um erro inesperado ao tentar buscar os dados e/ou resumo.";
      if (error instanceof Error) {
        errorMessage += ` Detalhes: ${error.message}`;
      }
      toast({ title: "Erro Inesperado na Aplicação", description: errorMessage, variant: "destructive", duration: 7000 });
      setRawProcessData(null);
      setProcessSummary(null);
    } finally {
      setLoadingMessage("Processando dados..."); 
      setIsLoading(false);
      setIsLoadingSummary(false);
    }
  };


  const onLoginSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoggingIn(true);
    setLoginError(null);
    console.log("[UI] onLoginSubmit - Iniciando login com dados:", data);
    try {
      const response = await loginToSEI(data);
      console.log("[UI] onLoginSubmit - Resposta da action loginToSEI:", response);

      if (response.success && response.token) {
        setLoginCredentials(data);
        setIsAuthenticated(true);
        
        const unidadesRecebidas = response.unidades || [];
        console.log("[UI] onLoginSubmit - Unidades recebidas da action:", unidadesRecebidas);
        setUnidadesFiltroList(unidadesRecebidas);
        console.log("[UI] onLoginSubmit - Estado unidadesFiltroList definido com:", unidadesRecebidas);


        if (unidadesRecebidas.length > 0) {
          toast({
            title: "Login bem-sucedido!",
            description: `${unidadesRecebidas.length} unidades carregadas.`,
          });
        } else {
          toast({
            title: "Login Bem-sucedido",
            description: "Nenhuma unidade de acesso foi retornada para seleção. Verifique suas permissões ou a configuração da API.",
            variant: "default",
            duration: 7000,
          });
        }
        setSelectedUnidadeFiltro(undefined); 
        setIsLoginDialogOpen(false);
        methods.reset();
      } else {
        setLoginError(response.error || "Falha no login. Verifique suas credenciais.");
        toast({ title: "Erro de Login", description: response.error || "Falha no login.", variant: "destructive" });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido durante o login.";
      setLoginError(errorMsg);
      toast({ title: "Erro de Login", description: errorMsg, variant: "destructive" });
      console.error("[UI] onLoginSubmit - Erro no catch:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginCredentials(null);
    setUnidadesFiltroList([]);
    setSelectedUnidadeFiltro(undefined);
    setRawProcessData(null);
    setOpenUnitsInProcess(null);
    setProcessSummary(null);
    toast({ title: "Logout realizado." });
  };


  const handleTaskCardClick = (task: ProcessedAndamento) => {
    setTaskToScrollTo(task);
  };

  const handleScrollToFirstTask = () => {
    if (processedFlowData && processedFlowData.tasks.length > 0) {
      setTaskToScrollTo(processedFlowData.tasks[0]);
    }
  };

  const handleScrollToLastTask = () => {
    if (processedFlowData && processedFlowData.tasks.length > 0) {
      setTaskToScrollTo(processedFlowData.tasks[processedFlowData.tasks.length - 1]);
    }
  };

  const inputRef = React.createRef<HTMLInputElement>();


  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="p-4 border-b border-border shadow-sm">
        <div className="container mx-auto flex items-center justify-between max-w-full">
          <div className="flex items-center space-x-3">
            <Image
              src="/logo-sead.png"
              alt="Logo SEAD Piauí"
              width={160}
              height={60}
              priority
              data-ai-hint="logo government"
            />
            <h1 className="text-xl font-semibold" style={{ color: '#107527' }}>
              Visualizador de Processos
            </h1>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Beta</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Número do Processo..."
                className="h-9 text-sm w-48"
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
                <SelectTrigger className="h-9 text-sm w-[200px]">
                  <SelectValue placeholder={isAuthenticated ? (unidadesFiltroList.length > 0 ? "Filtrar por Unidade" : "Nenhuma unidade disponível") : "Faça login para unidades"} />
                </SelectTrigger>
                <SelectContent>
                  {unidadesFiltroList.map((unidade) => (
                    <SelectItem key={unidade.Id} value={unidade.Id}>
                      {unidade.Sigla} ({unidade.Descricao.substring(0,25)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearchClick}
                disabled={isLoading || isLoadingSummary || !processoNumeroInput || !selectedUnidadeFiltro || !isAuthenticated}
              >
                {(isLoading || isLoadingSummary) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {(isLoading || isLoadingSummary) ? "Pesquisando..." : "Pesquisar"}
              </Button>
            </div>
            <Button onClick={handleFileUploadClick} variant="outline" size="sm" disabled={isLoading || isLoadingSummary}>
              <Upload className="mr-2 h-4 w-4" />
              Carregar JSON
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/json"
            />
            <div className="flex items-center space-x-2">
              <Switch
                id="summarize-graph"
                checked={isSummarizedView}
                onCheckedChange={setIsSummarizedView}
                disabled={!rawProcessData || isLoading || isLoadingSummary}
              />
              <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Versão Resumida</Label>
            </div>
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsLoginDialogOpen(true)}>
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            )}
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>IA potencializada pelo SoberaniA</span>
            </div>
          </div>
        </div>
      </header>

      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Login SEI</DialogTitle>
            <DialogDescription>
              Forneça suas credenciais para acessar a API SEI.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onLoginSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="usuario" className="text-right">
                  Usuário
                </Label>
                <Input
                  id="usuario"
                  {...register("usuario")}
                  className="col-span-3"
                  disabled={isLoggingIn}
                />
                {errors.usuario && <p className="col-span-4 text-destructive text-xs text-right">{errors.usuario.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="senha" className="text-right">
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  {...register("senha")}
                  className="col-span-3"
                  disabled={isLoggingIn}
                />
                {errors.senha && <p className="col-span-4 text-destructive text-xs text-right">{errors.senha.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="orgao" className="text-right">
                  Orgão
                </Label>
                <Input
                  id="orgao"
                  {...register("orgao")}
                  className="col-span-3"
                  disabled={isLoggingIn}
                />
                {errors.orgao && <p className="col-span-4 text-destructive text-xs text-right">{errors.orgao.message}</p>}
              </div>
              {loginError && <p className="text-destructive text-sm text-center col-span-4">{loginError}</p>}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isLoggingIn}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isLoggingIn}>
                  {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entrar
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      { (isLoadingSummary || processSummary) && (
        <section className="container mx-auto max-w-full p-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookText className="mr-2 h-5 w-5 text-primary" />
                Resumo do Processo {processoNumeroInput ? `(${processoNumeroInput})` : ''}
              </CardTitle>
              <CardDescription>
                Este é um resumo gerado por IA sobre o processo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-shrink-0"> 
              {isLoadingSummary && !processSummary && ( 
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="ml-3 text-muted-foreground">Gerando resumo do processo...</p>
                </div>
              )}
              {processSummary && ( 
                 <ScrollArea className="max-h-[300px] rounded-md border flex-shrink-0"> 
                   <div className="p-4">
                    <pre className="text-sm whitespace-pre-wrap break-words font-sans">
                      {processSummary}
                    </pre>
                  </div>
                </ScrollArea>
              )}
              {!processSummary && !isLoadingSummary && (
                <div className="flex items-center justify-center p-6 text-muted-foreground">
                    <Info className="mr-2 h-5 w-5" />
                    Nenhum resumo de processo disponível. Clique em "Pesquisar" para gerar.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <div className="flex flex-1 overflow-hidden">
        <ProcessMetadataSidebar
          processNumber={processoNumeroInput || (rawProcessData?.Info?.NumeroProcesso)}
          processNumberPlaceholder="Nenhum processo carregado"
          openUnitsInProcess={openUnitsInProcess}
          isLoadingOpenUnits={isLoadingOpenUnits}
          processedFlowData={processedFlowData}
          onTaskCardClick={handleTaskCardClick}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading && !loadingMessage.includes("API SEI") && !loadingMessage.includes("resumo") ? ( 
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <Loader2 className="h-20 w-20 text-primary animate-spin mb-6" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {loadingMessage}
              </h2>
              <p className="text-muted-foreground max-w-md">
                Por favor, aguarde. Os dados estão sendo preparados para visualização.
              </p>
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
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {loadingMessage}
              </h2>
              <p className="text-muted-foreground max-w-md">
                Por favor, aguarde. A consulta à API SEI e/ou API de resumo pode levar alguns instantes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <FileJson className="h-20 w-20 text-muted-foreground/50 mb-6" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {isAuthenticated ? "Nenhum processo carregado" : "Autenticação Necessária"}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {isAuthenticated
                  ? 'Para iniciar, insira o número do processo, selecione a unidade e clique em "Pesquisar", clique em "Carregar JSON" para selecionar um arquivo do seu computador, ou carregue os dados de exemplo.'
                  : "Por favor, faça login para pesquisar processos ou carregar dados da API SEI."
                }
              </p>
              <div className="flex space-x-4">
                <Button onClick={loadSampleData} variant="secondary" disabled={isLoading || isLoadingSummary}>
                  Usar Dados de Exemplo
                </Button>
                 {!isAuthenticated && (
                  <Button onClick={() => setIsLoginDialogOpen(true)} variant="default">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login SEI
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="p-3 border-t border-border text-center text-xs text-muted-foreground">
        © {currentYear !== null ? currentYear : new Date().getFullYear()} Visualizador de Processos. Todos os direitos reservados.
        <p className="text-xs text-muted-foreground/80 mt-1">
          Nota: Para fins de prototipagem, as credenciais de login são armazenadas temporariamente no estado do cliente. Em produção, utilize métodos de autenticação mais seguros.
        </p>
      </footer>
    </main>
  );
}
