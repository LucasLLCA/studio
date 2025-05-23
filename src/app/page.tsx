
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData, ProcessedFlowData, ProcessedAndamento } from '@/types/process-flow';
import { Upload, FileJson, Search, Sparkles } from 'lucide-react';
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

export default function Home() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [rawProcessData, setRawProcessData] = useState<ProcessoData | null>(null);
  const [taskToScrollTo, setTaskToScrollTo] = useState<ProcessedAndamento | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const processedFlowData: ProcessedFlowData | null = useMemo(() => {
    if (!rawProcessData || !rawProcessData.Andamentos) {
      return null;
    }
    return processAndamentos(rawProcessData.Andamentos);
  }, [rawProcessData]);

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
    toast({
        title: "Dados de exemplo carregados",
        description: "Visualizando o fluxograma de exemplo.",
    });
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
              <Input type="text" placeholder="Número do Processo..." className="h-9 text-sm w-48" />
              <Button variant="outline" size="sm">
                <Search className="mr-2 h-4 w-4" />
                Pesquisar
              </Button>
            </div>
            <Button onClick={handleFileUploadClick} variant="outline" size="sm">
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
              <Switch id="summarize-graph" />
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
          processNumber={rawProcessData?.Info?.NumeroProcesso}
          processNumberPlaceholder="0042431-96.2023.8.18.0001 (Exemplo)" 
          onTaskCardClick={handleTaskCardClick}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {processedFlowData ? (
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
                Para iniciar, clique em "Carregar JSON" para selecionar um arquivo do seu computador ou carregue os dados de exemplo.
              </p>
              <div className="flex space-x-4">
                <Button onClick={handleFileUploadClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Arquivo JSON
                </Button>
                <Button onClick={loadSampleData} variant="secondary">
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
