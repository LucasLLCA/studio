"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { Briefcase } from 'lucide-react';
// Removido: import type React from 'react'; - taskNodeRefs não é mais necessário aqui

interface SwimlaneColumnProps {
  unitSigla: string;
  unitDescricao: string;
  tasks: ProcessedAndamento[];
  onTaskClick: (task: ProcessedAndamento) => void;
  // Removido: taskNodeRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
}

// Este componente não será mais utilizado no layout linear, mas o mantenho caso seja útil no futuro.
// As props foram ajustadas para remover taskNodeRefs.
export function SwimlaneColumn({ unitSigla, unitDescricao, tasks, onTaskClick }: SwimlaneColumnProps) {
  const sortedTasks = [...tasks].sort((a,b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  return (
    <div className="flex-none w-72 md:w-80 lg:w-96 p-3 bg-secondary/30 rounded-lg shadow-inner min-h-[calc(100vh-150px)]">
      <div className="sticky top-0 bg-secondary/50 backdrop-blur-sm z-20 p-3 rounded-md mb-4 shadow">
        <h2 className="text-lg font-semibold text-foreground truncate flex items-center" title={unitDescricao}>
          <Briefcase className="h-5 w-5 mr-2 text-primary shrink-0" />
          {unitSigla}
        </h2>
        <p className="text-xs text-muted-foreground truncate">{unitDescricao}</p>
      </div>
      <div className="space-y-0 flex flex-col items-center relative">
        {sortedTasks.map((task, index) => (
          <TaskNode
            key={task.IdAndamento}
            task={task}
            onTaskClick={onTaskClick}
            isFirstInLane={index === 0}
            isLastInLane={index === sortedTasks.length - 1}
            // ref não é mais necessário aqui para ser coletado pelo pai
          />
        ))}
      </div>
    </div>
  );
}
