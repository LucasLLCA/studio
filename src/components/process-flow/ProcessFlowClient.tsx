"use client";

import type { ProcessoData, ProcessedFlowData } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import { processAndamentos } from '@/lib/process-flow-utils';
import React from 'react';

interface ProcessFlowClientProps {
  initialData: ProcessoData;
}

export function ProcessFlowClient({ initialData }: ProcessFlowClientProps) {
  const { tasks, connections } = React.useMemo(() => {
    return processAndamentos(initialData.Andamentos);
  }, [initialData.Andamentos]);

  return <ProcessFlowDiagram tasks={tasks} connections={connections} />;
}
