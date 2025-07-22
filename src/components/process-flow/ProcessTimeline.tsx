
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import { formatDisplayDate, SIGNIFICANT_TASK_TYPES } from '@/lib/process-flow-utils';
import { Circle, FileText, CheckCircle } from 'lucide-react';
import React from 'react';

interface ProcessTimelineProps {
  tasks: ProcessedAndamento[] | null;
}

export function ProcessTimeline({ tasks }: ProcessTimelineProps) {
  if (!tasks || tasks.length === 0) {
    return <p className="text-sm text-muted-foreground p-2">Não há tarefas para exibir na linha do tempo.</p>;
  }

  const significantTasks = tasks
    .filter(task => SIGNIFICANT_TASK_TYPES.includes(task.Tarefa))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  if (significantTasks.length === 0) {
    return <p className="text-sm text-muted-foreground p-2">Nenhuma tarefa principal encontrada para a linha do tempo.</p>;
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[34px] top-2 bottom-2 w-0.5 bg-border -translate-x-1/2"></div>
      
      <ul className="space-y-4">
        {significantTasks.map((task, index) => (
          <li key={`${task.IdAndamento}-${index}`} className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground z-10">
                {task.Tarefa.includes('CONCLUSAO') ? <CheckCircle size={16} /> : <FileText size={16} />}
              </div>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm font-semibold text-foreground">{task.Tarefa}</p>
              <p className="text-xs text-muted-foreground">{formatDisplayDate(task.parsedDate)}</p>
              <p className="text-xs text-muted-foreground">{task.Unidade.Sigla}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
