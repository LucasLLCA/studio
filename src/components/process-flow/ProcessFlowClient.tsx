
"use client";

import type { ProcessoData, ProcessedFlowData } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import { processAndamentos } from '@/lib/process-flow-utils';
import React, { useMemo } from 'react';

interface ProcessFlowClientProps {
  fullProcessData: ProcessoData | null; // Allow null for initial state
}

export function ProcessFlowClient({ fullProcessData }: ProcessFlowClientProps) {
  const processedFullData: ProcessedFlowData | null = useMemo(() => {
    if (!fullProcessData || !fullProcessData.Andamentos) {
      return null; // Handle null input gracefully
    }
    // Process all andamentos to get global positions, sequences, and all connections
    return processAndamentos(fullProcessData.Andamentos);
  }, [fullProcessData]);

  if (!processedFullData || !processedFullData.tasks || processedFullData.tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir ou dados inválidos.</p>;
  }
  
  return (
    <div className="h-full flex flex-col">
      <ProcessFlowDiagram 
        tasks={processedFullData.tasks}
        connections={processedFullData.connections}
        svgWidth={processedFullData.svgWidth}
        svgHeight={processedFullData.svgHeight}
        laneMap={processedFullData.laneMap}
      />
    </div>
  );
}
