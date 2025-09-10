
"use client";

import type { ProcessedFlowData, ProcessedAndamento, LoginCredentials, Documento } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import React from 'react';

interface ProcessFlowClientProps {
  processedFlowData: ProcessedFlowData | null;
  taskToScrollTo?: ProcessedAndamento | null;
  // onScrollToFirstTask and onScrollToLastTask are removed as buttons are now in page.tsx
  loginCredentials: LoginCredentials | null;
  isAuthenticated: boolean;
  selectedUnidadeFiltro: string | undefined;
  processNumber?: string;
  documents?: Documento[] | null;
}

export function ProcessFlowClient({ 
  processedFlowData, 
  taskToScrollTo, 
  loginCredentials,
  isAuthenticated,
  selectedUnidadeFiltro,
  processNumber,
  documents,
}: ProcessFlowClientProps) {
  if (!processedFlowData || !processedFlowData.tasks || processedFlowData.tasks.length === 0) {
    // This case should ideally be handled by the parent component (page.tsx) before rendering ProcessFlowClient
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir ou dados inválidos.</p>;
  }
  
  return (
    <div className="h-full flex flex-col w-full">
      <ProcessFlowDiagram 
        tasks={processedFlowData.tasks}
        connections={processedFlowData.connections}
        svgWidth={processedFlowData.svgWidth}
        svgHeight={processedFlowData.svgHeight}
        laneMap={processedFlowData.laneMap}
        taskToScrollTo={taskToScrollTo}
        loginCredentials={loginCredentials}
        isAuthenticated={isAuthenticated}
        selectedUnidadeFiltro={selectedUnidadeFiltro}
        processNumber={processNumber}
        documents={documents}
      />
    </div>
  );
}

    