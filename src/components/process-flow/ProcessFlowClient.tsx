
"use client";

import type { ProcessedFlowData, ProcessedAndamento, LoginCredentials } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import React from 'react';

interface ProcessFlowClientProps {
  processedFlowData: ProcessedFlowData | null;
  taskToScrollTo?: ProcessedAndamento | null;
  onScrollToFirstTask: () => void;
  onScrollToLastTask: () => void;
  loginCredentials: LoginCredentials | null;
  isAuthenticated: boolean;
}

export function ProcessFlowClient({ 
  processedFlowData, 
  taskToScrollTo, 
  onScrollToFirstTask, 
  onScrollToLastTask,
  loginCredentials,
  isAuthenticated,
}: ProcessFlowClientProps) {
  if (!processedFlowData || !processedFlowData.tasks || processedFlowData.tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir ou dados inválidos.</p>;
  }
  
  return (
    <div className="h-full flex flex-col">
      <ProcessFlowDiagram 
        tasks={processedFlowData.tasks}
        connections={processedFlowData.connections}
        svgWidth={processedFlowData.svgWidth}
        svgHeight={processedFlowData.svgHeight}
        laneMap={processedFlowData.laneMap}
        taskToScrollTo={taskToScrollTo}
        onScrollToFirstTask={onScrollToFirstTask}
        onScrollToLastTask={onScrollToLastTask}
        loginCredentials={loginCredentials}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
