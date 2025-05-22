
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData } from '@/types/process-flow';
import { GitFork, Zap, Upload, FileJson } from 'lucide-react';
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [displayedProcessData, setDisplayedProcessData] = useState<ProcessoData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

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
          // Basic validation for ProcessoData structure
          if (jsonData && jsonData.Andamentos && Array.isArray(jsonData.Andamentos) && jsonData.Info) {
            setDisplayedProcessData(jsonData as ProcessoData);
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
        // Reset file input to allow uploading the same file again if needed
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

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="p-6 border-b border-border shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitFork className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              Process Flow Tracker
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={handleFileUploadClick} variant="outline">
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
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-accent" />
              <span>AI-Powered Insights</span>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-grow container mx-auto max-w-full">
        {displayedProcessData ? (
          <ProcessFlowClient fullProcessData={displayedProcessData} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <FileJson className="h-24 w-24 text-muted-foreground/50 mb-6" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Nenhum processo carregado</h2>
            <p className="text-muted-foreground mb-6">
              Clique em "Carregar JSON" para selecionar um arquivo e visualizar o fluxo do processo.
            </p>
            <Button onClick={handleFileUploadClick}>
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Arquivo JSON
            </Button>
          </div>
        )}
      </div>
      <footer className="p-4 border-t border-border text-center text-sm text-muted-foreground">
        © {currentYear !== null ? currentYear : new Date().getFullYear()} Process Flow Tracker. Todos os direitos reservados.
      </footer>
    </main>
  );
}
