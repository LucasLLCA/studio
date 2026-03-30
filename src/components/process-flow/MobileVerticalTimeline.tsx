'use client';

import React from 'react';
import type { ProcessedAndamento } from '@/types/process-flow';
import { SYMBOLIC_TASK_COLORS, SIGNIFICANT_TASK_TYPES } from '@/lib/process-flow-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Send, CornerRightDown, RotateCcw, FileText, Circle } from 'lucide-react';

interface MobileVerticalTimelineProps {
  tasks: ProcessedAndamento[];
}

const TASK_ICONS: Record<string, React.ReactNode> = {
  'GERACAO-PROCEDIMENTO': <FileText className="h-4 w-4" />,
  'PROCESSO-REMETIDO-UNIDADE': <Send className="h-4 w-4" />,
  'PROCESSO-RECEBIDO-UNIDADE': <CornerRightDown className="h-4 w-4" />,
  'CONCLUSAO-PROCESSO-UNIDADE': <CheckCircle2 className="h-4 w-4" />,
  'CONCLUSAO-AUTOMATICA-UNIDADE': <CheckCircle2 className="h-4 w-4" />,
  'REABERTURA-PROCESSO-UNIDADE': <RotateCcw className="h-4 w-4" />,
};

function getTaskColor(tarefa: string): string {
  return SYMBOLIC_TASK_COLORS[tarefa] || 'hsl(var(--muted-foreground))';
}

function isSignificant(tarefa: string): boolean {
  return SIGNIFICANT_TASK_TYPES.includes(tarefa);
}

function formatDate(parsedDate: Date): string {
  return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatTime(parsedDate: Date): string {
  return parsedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Group tasks by date string for date headers */
function groupByDate(tasks: ProcessedAndamento[]): { date: string; items: ProcessedAndamento[] }[] {
  const groups: { date: string; items: ProcessedAndamento[] }[] = [];
  let currentDate = '';

  for (const task of tasks) {
    const dateStr = formatDate(task.parsedDate);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      groups.push({ date: dateStr, items: [] });
    }
    groups[groups.length - 1].items.push(task);
  }

  return groups;
}

export function MobileVerticalTimeline({ tasks }: MobileVerticalTimelineProps) {
  // Sort oldest first (chronological)
  const sorted = [...tasks].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  const dateGroups = groupByDate(sorted);

  if (sorted.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-10">
        Nenhum andamento para exibir.
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="px-2 py-3 space-y-4">
        {dateGroups.map((group) => (
          <div key={group.date}>
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm pb-1 mb-2">
              <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                {group.date}
              </span>
            </div>

            {/* Timeline items */}
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-2">
                {group.items.map((task) => {
                  const significant = isSignificant(task.Tarefa);
                  const color = getTaskColor(task.Tarefa);
                  const icon = TASK_ICONS[task.Tarefa];
                  const descText = stripHtml(task.Descricao);

                  return (
                    <div key={task.IdAndamento} className="relative">
                      {/* Dot on the vertical line */}
                      <div
                        className="absolute -left-6 top-1.5 h-[18px] w-[18px] rounded-full border-2 border-card flex items-center justify-center"
                        style={{ backgroundColor: significant ? color : 'hsl(var(--muted))' }}
                      >
                        {significant && icon && (
                          <span className="text-white" style={{ fontSize: 10 }}>
                            {React.cloneElement(icon as React.ReactElement, { className: 'h-2.5 w-2.5' })}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className={`rounded-lg border px-3 py-2 ${significant ? 'bg-card shadow-sm' : 'bg-muted/20'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-medium ${significant ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {task.Tarefa}
                          </span>
                          <span className="text-2xs text-muted-foreground shrink-0">
                            {formatTime(task.parsedDate)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {task.Unidade?.Sigla}
                        </div>
                        {task.isSummaryNode && task.groupedTasksCount && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {task.groupedTasksCount} ações agrupadas
                          </div>
                        )}
                        {descText && !task.isSummaryNode && (
                          <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                            {descText}
                          </p>
                        )}
                        {task.Usuario?.Nome && (
                          <div className="text-2xs text-muted-foreground/60 mt-1">
                            {task.Usuario.Nome}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
