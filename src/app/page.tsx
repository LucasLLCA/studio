
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, ProcessedAndamento, UnidadeFiltro, UnidadesFiltroData } from '@/types/process-flow';
import { Upload, FileJson, Search, Sparkles, Loader2 } from 'lucide-react';
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
import { fetchProcessDataFromSEI } from './sei-actions';


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

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const data = unidadesData as UnidadesFiltroData;
    if (data && data.Unidades) {
      setUnidadesFiltroList(data.Unidades);
    }
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
    return processAndamentos(dataToProcess.Andamentos, dataToProcess.Info?.NumeroProcesso || processoNumeroInput);
  }, [rawProcessData, processoNumeroInput]);

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

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const jsonData = JSON.parse(text);
          if (jsonData && jsonData.Andamentos && Array.isArray(jsonData.Andamentos) && jsonData.Info) {
            setRawProcessData(jsonData as ProcessoData);
            setProcessoNumeroInput(jsonData.Info?.NumeroProcesso || "N/A via JSON");
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
        toast({
          title: "Erro ao processar JSON",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
          variant: "destructive",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
    };
    reader.readAsText(file);
  };
  
  const loadSampleData = () => {
    setRawProcessData(sampleProcessFlowData);
    setProcessoNumeroInput(sampleProcessFlowData.Info?.NumeroProcesso || "0042431-96.2023.8.18.0001 (Exemplo)");
    toast({
        title: "Dados de exemplo carregados",
        description: "Visualizando o fluxograma de exemplo.",
    });
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

    setIsLoading(true);
    setRawProcessData(null); 

    try {
      const result = await fetchProcessDataFromSEI(processoNumeroInput, selectedUnidadeFiltro);
      
      if ('error' in result) {
        let errorTitle = "Erro ao buscar dados do processo";
        let errorDescription = result.error;

        if (result.status === 422) {
          errorTitle = "Erro de Validação dos Dados (422)";
          errorDescription = "A API não pôde processar os dados fornecidos. Verifique se o 'Número do Processo' está correto e se a 'Unidade' é válida para esta consulta.";
          if (result.details) {
            try {
                const detailsString = typeof result.details === 'string' ? result.details : JSON.stringify(result.details);
                if (detailsString && detailsString !== '{}') {
                    errorDescription += ` Detalhes da API: ${detailsString}`;
                }
            } catch (e) {
                // If stringify fails or details is not a simple string
                errorDescription += ` Detalhes da API (erro ao formatar): ${String(result.details)}`;
            }
          }
        } else if (result.status) {
            errorDescription = `Erro ${result.status}: ${result.error}`;
             if (result.details) {
               if (typeof result.details === 'string') {
                errorDescription += ` Detalhes: ${result.details}`;
              } else if (result.details.Fault && result.details.Fault.Reason && result.details.Fault.Reason.Text) {
                errorDescription += ` Detalhes: ${result.details.Fault.Reason.Text}`;
              } else if (typeof result.details === 'object' && result.details !== null && Object.keys(result.details).length > 0) {
                try {
                    const detailsString = JSON.stringify(result.details);
                    if (detailsString !== '{}') { 
                        errorDescription += ` Detalhes: ${detailsString}`;
                    }
                } catch (e) { /* ... */ }
              } else if (result.details.message) { 
                 errorDescription += ` Detalhes: ${result.details.message}`;
              }
            }
        }
        
        if (result.status === 404 && result.status !== 422) {
          errorDescription = `Processo não encontrado ou sem andamentos na unidade selecionada (${selectedUnidadeFiltro}) para o número ${processoNumeroInput}. Verifique os dados. (Erro: ${result.status})`;
        } else if (result.status === 401 && result.status !== 422) {
          errorTitle = "Falha na Autenticação com a API SEI";
          errorDescription = `Não foi possível autenticar com o servidor SEI. Verifique se as credenciais configuradas no servidor da aplicação estão corretas e ativas. (Erro: ${result.status})`;
        } else if (result.status === 500 && result.status !== 422) {
            errorTitle = "Erro Interno no Servidor da API SEI";
            errorDescription = `O servidor da API SEI encontrou um problema. Tente novamente mais tarde. (Erro: ${result.status})`;
        }


        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        });
        setRawProcessData(null);
      } else {
        const fetchedDataWithProcessNumber = {
          ...result,
          Info: {
            ...result.Info,
            NumeroProcesso: result.Info?.NumeroProcesso || processoNumeroInput,
          }
        };
        setRawProcessData(fetchedDataWithProcessNumber);
        toast({
          title: "Sucesso!",
          description: "Dados do processo carregados da API.",
        });
      }
    } catch (error) {
      console.error("Error in handleSearchClick:", error);
      toast({
        title: "Erro Inesperado na Aplicação",
        description: "Ocorreu um erro inesperado ao tentar buscar os dados. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
      setRawProcessData(null);
    } finally {
      setIsLoading(false);
    }
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


  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="p-4 border-b border-border shadow-sm">
        <div className="container mx-auto flex items-center justify-between max-w-full">
          <div className="flex items-center space-x-3">
            <Image 
              src="/logo-sead.jpeg" 
              alt="Logo SEAD Piauí" 
              width={160} 
              height={60} 
              className="h-auto" 
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
              />
               <Select value={selectedUnidadeFiltro} onValueChange={setSelectedUnidadeFiltro}>
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
                disabled={isLoading || !processoNumeroInput || !selectedUnidadeFiltro}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {isLoading ? "Pesquisando..." : "Pesquisar"}
              </Button>
            </div>
            <Button onClick={handleFileUploadClick} variant="outline" size="sm" disabled={isLoading}>
              <Upload className="mr-2 h-4 w-4" />
              Carregar JSON
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <div className="flex items-center space-x-2">
              <Switch id="summarize-graph" disabled={isLoading} />
              <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Versão Resumida</Label>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>IA potencializada pelo SoberaniA</span>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <ProcessMetadataSidebar 
          processedFlowData={processedFlowData} 
          processNumber={processoNumeroInput || (rawProcessData?.Info?.NumeroProcesso)}
          processNumberPlaceholder="Nenhum processo carregado" 
          onTaskCardClick={handleTaskCardClick}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <Loader2 className="h-20 w-20 text-primary animate-spin mb-6" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Buscando dados do processo...</h2>
              <p className="text-muted-foreground max-w-md">
                Por favor, aguarde. A consulta à API SEI pode levar alguns instantes.
              </p>
            </div>
          ) : processedFlowData ? (
            <ProcessFlowClient 
              processedFlowData={processedFlowData} 
              taskToScrollTo={taskToScrollTo}
              onScrollToFirstTask={handleScrollToFirstTask}
              onScrollToLastTask={handleScrollToLastTask}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
              <FileJson className="h-20 w-20 text-muted-foreground/50 mb-6" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum processo carregado</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Para iniciar, insira o número do processo, selecione a unidade e clique em "Pesquisar",
                clique em "Carregar JSON" para selecionar um arquivo do seu computador, ou carregue os dados de exemplo.
              </p>
              <div className="flex space-x-4">
                <Button onClick={loadSampleData} variant="secondary" disabled={isLoading}>
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
