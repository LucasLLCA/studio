
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import { formatDisplayDate, SIGNIFICANT_TASK_TYPES } from '@/lib/process-flow-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React from 'react';
import { CheckCircle, FileText, Send, ChevronsRight, CornerRightUp } from 'lucide-react';

interface ProcessTimelineBarProps {
  tasks: ProcessedAndamento[];
  svgWidth: number;
}

const getIconForTask = (taskType: string) => {
    if (taskType.includes('CONCLUSAO')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (taskType.includes('REMETIDO')) return <Send className="h-4 w-4 text-yellow-600" />;
    if (taskType.includes('RECEBIDO')) return <ChevronsRight className="h-4 w-4 text-blue-500" />;
    if (taskType.includes('REABERTURA')) return <CornerRightUp className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

export function ProcessTimelineBar({ tasks, svgWidth }: ProcessTimelineBarProps) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const significantTasks = tasks
    .filter(task => SIGNIFICANT_TASK_TYPES.includes(task.Tarefa))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  if (significantTasks.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="relative w-full h-full p-2" style={{ width: svgWidth }}>
        {/* Main timeline bar */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2"></div>
        
        {/* Timeline markers */}
        <div className="relative w-full h-full">
          {significantTasks.map((task, index) => (
            <Tooltip key={`${task.IdAndamento}-${index}`}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${task.x}px` }}
                >
                  <div className="h-3 w-3 rounded-full bg-primary border-2 border-card shadow-sm cursor-pointer"></div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs shadow-lg rounded-lg">
                <div className="p-2 space-y-1">
                   <div className="flex items-center gap-2">
                     {getIconForTask(task.Tarefa)}
                     <p className="font-semibold text-sm text-foreground">{task.Tarefa}</p>
                   </div>
                  <p className="text-xs text-muted-foreground">{formatDisplayDate(task.parsedDate)}</p>
                  <p className="text-xs text-muted-foreground">Unidade: {task.Unidade.Sigla}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
