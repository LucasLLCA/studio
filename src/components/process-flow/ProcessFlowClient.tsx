
"use client";

import type { ProcessedFlowData, ProcessedAndamento } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import { ProcessHistoryTable } from './ProcessHistoryTable'; // Import the new table component
import React from 'react';

interface ProcessFlowClientProps {
  processedFlowData: ProcessedFlowData | null;
  taskToScrollTo?: ProcessedAndamento | null;
  onScrollToFirstTask: () => void;
  onScrollToLastTask: () => void;
}

export function ProcessFlowClient({ 
  processedFlowData, 
  taskToScrollTo, 
  onScrollToFirstTask, 
  onScrollToLastTask 
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
      />
      {/* Add the ProcessHistoryTable component here */}
      <ProcessHistoryTable tasks={processedFlowData.tasks} />
    </div>
  );
}
