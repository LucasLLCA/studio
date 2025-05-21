"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDisplayDate } from '@/lib/process-flow-utils';
import {
  CheckCircle2, Zap, Send, Eye, PlusSquare, Inbox, FileQuestion, UserCircle, CalendarDays
} from 'lucide-react';
import React from 'react';

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
  isFirstInLane: boolean;
  isLastInLane: boolean;
}

const getTaskIconAndColor = (tarefa: string): { icon: React.ElementType, colorClass: string } => {
  switch (tarefa) {
    case 'CONCLUSAO-PROCESSO-UNIDADE':
      return { icon: CheckCircle2, colorClass: 'text-green-500' };
    case 'PROCESSO-CIENCIA':
      return { icon: Eye, colorClass: 'text-blue-500' };
    case 'PROCESSO-INCLUIDO-EM-BLOCO':
      return { icon: PlusSquare, colorClass: 'text-purple-500' };
    case 'PROCESSO-RECEBIDO-UNIDADE':
      return { icon: Inbox, colorClass: 'text-orange-500' };
    case 'CONCLUSAO-AUTOMATICA-UNIDADE':
      return { icon: Zap, colorClass: 'text-yellow-600' };
    case 'PROCESSO-REMETIDO-UNIDADE': // This task type often acts as a bridge/log for transfers
      return { icon: Send, colorClass: 'text-sky-500' };
    default:
      return { icon: FileQuestion, colorClass: 'text-gray-500' };
  }
};

export const TaskNode = React.forwardRef<HTMLDivElement, TaskNodeProps>(
  ({ task, onTaskClick, isFirstInLane, isLastInLane }, ref) => {
  const { icon: TaskIcon, colorClass } = getTaskIconAndColor(task.Tarefa);

  const cleanShortDescription = task.Descricao
    .replace(/<a [^>]*>([^<]+)<\/a>/gi, '$1') // Replace <a> tags with their content
    .replace(/<[^>]*>?/gm, '') // Strip any remaining HTML tags
    .substring(0, 70) + (task.Descricao.length > 70 ? '...' : '');


  return (
    <div className="relative w-full py-3" ref={ref} data-task-id={task.IdAndamento}>
      {/* Vertical connector line - upper part (not for the first item in lane) */}
      {!isFirstInLane && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-1/2 bg-border z-0"></div>
      )}
      {/* Vertical connector line - lower part (not for the last item in lane) */}
      {!isLastInLane && (
         <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-1/2 bg-border z-0"></div>
      )}

      <Card
        onClick={() => onTaskClick(task)}
        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 ease-in-out relative z-10 bg-card border-2 border-transparent hover:border-primary active:scale-[0.98]"
        aria-label={`Tarefa ${task.globalSequence}: ${task.Tarefa}`}
      >
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <TaskIcon className={`h-8 w-8 ${colorClass}`} />
            <Badge variant="secondary" className="text-xs">#{task.globalSequence}</Badge>
          </div>
          <CardTitle className="text-base font-semibold mt-2">{task.Tarefa}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm">
          <p className="text-muted-foreground h-10 overflow-hidden" title={task.Descricao.replace(/<[^>]*>?/gm, '')}>
            {cleanShortDescription}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              {formatDisplayDate(task.parsedDate)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <UserCircle className="h-3.5 w-3.5 mr-1.5" />
              {task.Usuario.Nome.split(' ')[0]} {/* First name */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
TaskNode.displayName = 'TaskNode';
