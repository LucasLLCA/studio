
"use client";

import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import { sampleProcessFlowData } from '@/data/sample-process-data'; // Importar os dados
import { GitFork, Zap } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

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
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-accent" />
            <span>AI-Powered Insights</span>
          </div>
        </div>
      </header>
      <div className="flex-grow container mx-auto max-w-full">
        {/* Usar os dados importados */}
        <ProcessFlowClient fullProcessData={sampleProcessFlowData} />
      </div>
      <footer className="p-4 border-t border-border text-center text-sm text-muted-foreground">
        © {currentYear !== null ? currentYear : new Date().getFullYear()} Process Flow Tracker. Todos os direitos reservados.
      </footer>
    </main>
  );
}

    