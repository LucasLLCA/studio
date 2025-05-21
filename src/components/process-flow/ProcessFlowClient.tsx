
"use client";

import type { ProcessoData, ProcessedFlowData } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import { processAndamentos } from '@/lib/process-flow-utils';
import React, { useMemo } from 'react';

interface ProcessFlowClientProps {
  fullProcessData: ProcessoData;
}

export function ProcessFlowClient({ fullProcessData }: ProcessFlowClientProps) {
  const processedFullData: ProcessedFlowData = useMemo(() => {
    // Process all andamentos to get global positions, sequences, and all connections
    return processAndamentos(fullProcessData.Andamentos);
  }, [fullProcessData.Andamentos]);

  if (!processedFullData.tasks.length) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
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
