
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, UnidadeFiltro, UnidadesFiltroData, UnidadeAberta, ApiError } from '@/types/process-flow';
import { Upload, FileJson, Search, Sparkles, Loader2, FileText, ChevronsLeft, ChevronsRight, BookText, Info } from 'lucide-react';
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
import unidadesData from '@/../unidades_filtradas.json';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchProcessDataFromSEI, fetchOpenUnitsForProcess } from './sei-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function Home() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [rawProcessData, setRawProcessData] = useState<ProcessoData | null>(null);
  const [taskToScrollTo, setTaskToScrollTo] = useState<ProcessedFlowData['tasks'][0] | null>(null);
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


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const data = unidadesData as UnidadesFiltroData;
    if (data && data.Unidades) {
      setUnidadesFiltroList(data.Unidades);
    }
  }, []);

  const processedFlowData: ProcessedFlowData | null = useMemo(() => {
    if (!rawProcessData || !rawProcessData.Andamentos) {
      setProcessSummary(null); 
      return null;
    }
    const dataToProcess = {
      ...rawProcessData,
      Info: {
        ...rawProcessData.Info,
        NumeroProcesso: rawProcessData.Info?.NumeroProcesso || processoNumeroInput,
      }
    };
    return processAndamentos(dataToProcess.Andamentos, dataToProcess.Info?.NumeroProcesso || processoNumeroInput, isSummarizedView);
  }, [rawProcessData, processoNumeroInput, isSummarizedView]);

  useEffect(() => {
    const numeroProcessoAtual = rawProcessData?.Info?.NumeroProcesso;
    if (numeroProcessoAtual && selectedUnidadeFiltro) {
      setIsLoadingOpenUnits(true);
      setOpenUnitsInProcess(null); 
      fetchOpenUnitsForProcess(numeroProcessoAtual, selectedUnidadeFiltro)
        .then(result => {
          if ('error' in result) {
            console.error(
              `Error fetching open units: Status ${result.status || 'N/A'}, Error: "${result.error}"`,
              `Details: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details)}`,
              `Params used: processo="${numeroProcessoAtual}", unidade="${selectedUnidadeFiltro}"`
            );
            setOpenUnitsInProcess([]); 
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
  }, [rawProcessData, selectedUnidadeFiltro]);


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
    if (!processoNumeroInput) {
      toast({ title: "Entrada Inválida", description: "Por favor, insira o número do processo.", variant: "destructive" });
      return;
    }
    if (!selectedUnidadeFiltro) {
      toast({ title: "Entrada Inválida", description: "Por favor, selecione uma unidade.", variant: "destructive" });
      return;
    }

    console.log(`[UI] Iniciando busca SEI com: Processo='${processoNumeroInput}', Unidade='${selectedUnidadeFiltro}'`);
    setLoadingMessage("Buscando dados do processo na API SEI...");
    setIsLoading(true);
    setRawProcessData(null); 
    setOpenUnitsInProcess(null);
    setProcessSummary(null);


    try {
      const result = await fetchProcessDataFromSEI(processoNumeroInput, selectedUnidadeFiltro);
      console.log("[UI] Resultado da API SEI para andamentos:", result);
      
      if ('error' in result && typeof result.error === 'string') { 
        let errorTitle = "Erro ao buscar dados do processo";
        let errorDescription = result.error;

        if (result.status === 422) {
          errorTitle = "Erro de Validação dos Dados (422)";
          errorDescription = `A API não pôde processar os dados fornecidos. Verifique se o 'Número do Processo' (ex: 00002.001000/2024-92) e a 'Unidade' selecionada estão corretos e são válidos para esta consulta.`;
        } else if (result.status === 404) {
          errorTitle = "Processo Não Encontrado (404)";
          errorDescription = `Processo não encontrado na unidade ${selectedUnidadeFiltro} para o número ${processoNumeroInput}, ou o processo não possui andamentos registrados nessa unidade. Verifique os dados e tente novamente.`;
        } else if (result.status === 401) {
          errorTitle = "Falha na Autenticação com a API SEI (401)";
          errorDescription = `Não foi possível autenticar com o servidor SEI. Verifique se as credenciais configuradas no servidor da aplicação (.env.local) estão corretas e ativas.`;
        } else if (result.status === 500) {
            errorTitle = "Erro Interno no Servidor da API SEI (500)";
            errorDescription = `O servidor da API SEI encontrou um problema. Tente novamente mais tarde.`;
        } else if (result.status) { 
             errorDescription = `Erro ${result.status}: ${result.error || 'Desconhecido'}`;
        }
        
        if (result.details) {
            try {
                const detailsString = typeof result.details === 'string' ? result.details : JSON.stringify(result.details);
                if (detailsString && detailsString !== '{}' && detailsString.length < 250) { 
                    errorDescription += ` Detalhes: ${detailsString}`;
                } else if (detailsString.length >= 250) {
                    errorDescription += ` Detalhes da API muito longos para exibição.`;
                }
            } catch (e) { /* erro ao formatar detalhes */ }
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
          duration: 9000,
        });
        setRawProcessData(null);
      } else if (!('error' in result)) { 
        if (result && result.Andamentos && Array.isArray(result.Andamentos)) {
          setRawProcessData(result); 
          toast({
            title: "Sucesso!",
            description: `Dados do processo (total ${result.Andamentos.length} andamentos) carregados da API.`,
          });
        } else {
          console.error("[UI] Resposta da API SEI bem-sucedida, mas 'Andamentos' está ausente ou não é um array:", result);
          toast({
            title: "Dados Incompletos da API",
            description: "A API retornou uma resposta, mas não contém os andamentos do processo esperados. Pode não haver andamentos para este processo nesta unidade.",
            variant: "destructive",
            duration: 7000,
          });
          setRawProcessData(null);
        }
      } else { 
        console.error("[UI] Resposta inesperada da API SEI:", result);
        toast({ title: "Erro Desconhecido", description: "A API retornou uma resposta inesperada.", variant: "destructive" });
        setRawProcessData(null);
      }
    } catch (error) { 
      console.error("[UI] Erro inesperado ao buscar dados do processo:", error);
      let errorMessage = "Ocorreu um erro inesperado ao tentar buscar os dados.";
      if (error instanceof Error) {
        errorMessage += ` Detalhes: ${error.message}`;
      }
      toast({
        title: "Erro Inesperado na Aplicação",
        description: errorMessage,
        variant: "destructive",
        duration: 7000,
      });
      setRawProcessData(null);
    } finally {
      setLoadingMessage("Processando dados..."); 
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!processoNumeroInput) {
      toast({ title: "Entrada Inválida", description: "Por favor, insira o número do processo para gerar o resumo.", variant: "destructive" });
      return;
    }
    setIsLoadingSummary(true);
    setProcessSummary(null);

    const formattedProcessNumber = processoNumeroInput.replace(/[./-]/g, "");
    const summaryApiUrl = `http://127.0.0.1:8000/resumo_completo/${formattedProcessNumber}`;

    try {
      const response = await fetch(summaryApiUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Erro ao buscar resumo. A API não retornou um JSON válido." }));
        const errorDetail = errorData?.detail || `Erro ${response.status} - ${response.statusText}`;
        throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
      }

      const data = await response.json();

      if (data && data.resumo && data.resumo.resumo_combinado && data.resumo.resumo_combinado.resposta_ia) {
        const cleanedSummary = data.resumo.resumo_combinado.resposta_ia.replace(/[#*]/g, '');
        setProcessSummary(cleanedSummary);
        toast({
          title: "Resumo Gerado",
          description: "O resumo do processo foi carregado com sucesso.",
        });
      } else {
        throw new Error("Formato da resposta do resumo inesperado.");
      }

    } catch (error) {
      console.error("Error fetching process summary:", error);
      let description = "Ocorreu um erro desconhecido.";
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes("failed to fetch")) {
          description = "Falha ao conectar com a API de resumo. Verifique se o serviço local (em http://127.0.0.1:8000) está rodando e se as configurações de CORS estão corretas.";
        } else {
          description = error.message;
        }
      }
      toast({
        title: "Erro ao Gerar Resumo",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };


  const handleTaskCardClick = (task: ProcessedFlowData['tasks'][0]) => {
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
                disabled={isLoading || isLoadingSummary}
                ref={inputRef}
              />
               <Select value={selectedUnidadeFiltro} onValueChange={setSelectedUnidadeFiltro} disabled={isLoading || isLoadingSummary}>
                <SelectTrigger className="h-9 text-sm w-[200px]">
                  <SelectValue placeholder="Filtrar por Unidade" />
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
                disabled={isLoading || isLoadingSummary || !processoNumeroInput || !selectedUnidadeFiltro}
              >
                {isLoading && loadingMessage.includes("API SEI") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {isLoading && loadingMessage.includes("API SEI") ? "Pesquisando..." : "Pesquisar"}
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
             <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateSummary}
              disabled={isLoading || isLoadingSummary || !processoNumeroInput}
            >
              {isLoadingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookText className="mr-2 h-4 w-4" />}
              Gerar Resumo
            </Button>
            <div className="flex items-center space-x-2">
              <Switch 
                id="summarize-graph" 
                checked={isSummarizedView}
                onCheckedChange={setIsSummarizedView}
                disabled={!rawProcessData || isLoading || isLoadingSummary} 
              />
              <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Versão Resumida</Label>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>IA potencializada pelo SoberaniA</span>
            </div>
          </div>
        </div>
      </header>

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
            <CardContent>
              {isLoadingSummary && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="ml-3 text-muted-foreground">Gerando resumo...</p>
                </div>
              )}
              {processSummary && !isLoadingSummary && (
                <ScrollArea className="max-h-[300px] rounded-md border">
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
                    Nenhum resumo disponível ou gerado. Clique em "Gerar Resumo".
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
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading && !loadingMessage.includes("API SEI") ? ( 
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
            />
          ) : isLoading && loadingMessage.includes("API SEI") ? ( 
             <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <Loader2 className="h-20 w-20 text-primary animate-spin mb-6" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {loadingMessage}
              </h2>
              <p className="text-muted-foreground max-w-md">
                Por favor, aguarde. A consulta à API SEI pode levar alguns instantes, especialmente para processos com muitos andamentos.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <FileJson className="h-20 w-20 text-muted-foreground/50 mb-6" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum processo carregado</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Para iniciar, insira o número do processo, selecione a unidade e clique em "Pesquisar",
                clique em "Carregar JSON" para selecionar um arquivo do seu computador, ou carregue os dados de exemplo.
              </p>
              <div className="flex space-x-4">
                <Button onClick={loadSampleData} variant="secondary" disabled={isLoading || isLoadingSummary}>
                  Usar Dados de Exemplo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="p-3 border-t border-border text-center text-xs text-muted-foreground">
        © {currentYear !== null ? currentYear : new Date().getFullYear()} Visualizador de Processos. Todos os direitos reservados.
      </footer>
    </main>
  );
}

    

    