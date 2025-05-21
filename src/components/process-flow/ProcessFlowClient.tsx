"use client";

import type { ProcessoData } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import { processAndamentos } from '@/lib/process-flow-utils';
import React from 'react';

interface ProcessFlowClientProps {
  initialData: ProcessoData;
}

export function ProcessFlowClient({ initialData }: ProcessFlowClientProps) {
  // A função processAndamentos já ordena as tarefas cronologicamente
  // e adiciona 'globalSequence' e 'parsedDate'.
  // O campo 'connections' não é mais necessário para o layout linear.
  const { tasks } = React.useMemo(() => {
    return processAndamentos(initialData.Andamentos);
  }, [initialData.Andamentos]);

  return <ProcessFlowDiagram tasks={tasks} />;
}
