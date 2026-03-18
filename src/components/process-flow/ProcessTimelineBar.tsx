
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import { SIGNIFICANT_TASK_TYPES, detectPartialDataGap } from '@/lib/process-flow-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from 'react';
import { CheckCircle, FileText, Send, ChevronsRight, CornerRightUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ProcessTimelineBarProps {
  tasks: ProcessedAndamento[];
  svgWidth: number;
  isPartialData?: boolean;
}

const getIconForTask = (taskType: string) => {
    if (taskType.includes('CONCLUSAO')) return <CheckCircle className="h-4 w-4 text-success" />;
    if (taskType.includes('REMETIDO')) return <Send className="h-4 w-4 text-yellow-600" />;
    if (taskType.includes('RECEBIDO')) return <ChevronsRight className="h-4 w-4 text-blue-500" />;
    if (taskType.includes('REABERTURA')) return <CornerRightUp className="h-4 w-4 text-purple-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
};

const formatTimelineDate = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yy');
}

export function ProcessTimelineBar({ tasks, svgWidth, isPartialData = false }: ProcessTimelineBarProps) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  const significantTasks = tasks
    .filter(task => SIGNIFICANT_TASK_TYPES.includes(task.Tarefa))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  if (significantTasks.length === 0) {
    return null;
  }

  const gapInfo = isPartialData ? detectPartialDataGap(tasks) : null;

  // p-2 = 8px padding offsets the markers container relative to absolute children
  const P = 8;
  const CUT_INSET = 12;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="relative w-full h-full p-2" style={{ width: svgWidth }}>
        {/* Main timeline bar */}
        {gapInfo ? (
          <>
            {/* Left solid segment */}
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-border -translate-y-1/2"
              style={{ width: `${P + gapInfo.leftX + CUT_INSET}px` }}
            />
            {/* Gap region with cut indicators */}
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                left: `${P + gapInfo.leftX + CUT_INSET}px`,
                width: `${gapInfo.rightX - gapInfo.leftX - CUT_INSET * 2}px`,
                height: '28px',
              }}
            >
              {/* Left vertical cut line */}
              <div className="absolute left-0 top-0 bottom-0 border-l-[1.5px] border-dashed border-muted-foreground/40" />
              {/* Right vertical cut line */}
              <div className="absolute right-0 top-0 bottom-0 border-r-[1.5px] border-dashed border-muted-foreground/40" />
              {/* Dashed connector between cuts */}
              <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 border-t border-dashed border-muted-foreground/25" />
              {/* Loading spinner in the gap center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-full p-0.5">
                <Loader2 className="h-3 w-3 text-muted-foreground/50 animate-spin" />
              </div>
            </div>
            {/* Right solid segment */}
            <div
              className="absolute top-1/2 h-0.5 bg-border -translate-y-1/2"
              style={{ left: `${P + gapInfo.rightX - CUT_INSET}px`, right: 0 }}
            />
          </>
        ) : (
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2" />
        )}

        {/* Timeline markers */}
        <div className="relative w-full h-full">
          {(() => {
            // Distância mínima (px) entre dois rótulos de data para não sobreposição
            const MIN_LABEL_SPACING = 48;
            let lastLabelAboveX = -Infinity;
            let lastLabelBelowX = -Infinity;

            return significantTasks.map((task, index) => {
              // Track preferencial: par = cima, ímpar = baixo
              const preferAbove = index % 2 === 0;

              const fitsAbove = (task.x - lastLabelAboveX) >= MIN_LABEL_SPACING;
              const fitsBelow = (task.x - lastLabelBelowX) >= MIN_LABEL_SPACING;

              // Tenta o track preferencial; se não couber, tenta o oposto;
              // se nenhum couber, omite o label (mas mantém o ponto + tooltip).
              let showLabel = false;
              let isAbove = preferAbove;

              if (preferAbove ? fitsAbove : fitsBelow) {
                // Cabe no track preferencial
                showLabel = true;
                isAbove = preferAbove;
              } else if (preferAbove ? fitsBelow : fitsAbove) {
                // Não cabe no preferencial, mas cabe no oposto
                showLabel = true;
                isAbove = !preferAbove;
              }
              // else: ambos ocupados → omite label

              if (showLabel) {
                if (isAbove) lastLabelAboveX = task.x;
                else lastLabelBelowX = task.x;
              }

              return (
                <Tooltip key={`${task.IdAndamento}-${index}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      style={{ left: `${task.x}px` }}
                    >
                      {/* Rótulo de data — migra para o track oposto antes de suprimir */}
                      {showLabel && (
                        <div className={`absolute flex flex-col items-center ${isAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimelineDate(task.parsedDate)}
                          </span>
                          <div className="h-2 w-px bg-border"></div>
                        </div>
                      )}

                      {/* Ponto na linha do tempo */}
                      <div className="h-3 w-3 rounded-full bg-primary border-2 border-card shadow-sm cursor-pointer z-10"></div>
                    </div>
                  </TooltipTrigger>
                  {/* Portal garante que o tooltip escapa de qualquer overflow:hidden pai */}
                  <TooltipPrimitive.Portal>
                    <TooltipContent
                      side="bottom"
                      sideOffset={8}
                      collisionPadding={12}
                      className="max-w-xs shadow-lg rounded-lg z-[200]"
                    >
                      <div className="p-2 space-y-1">
                        <div className="flex items-center gap-2">
                          {getIconForTask(task.Tarefa)}
                          <p className="font-semibold text-sm text-foreground">{task.Tarefa}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Unidade: {task.Unidade.Sigla}</p>
                        <p className="text-xs text-muted-foreground">Usuário: {task.Usuario.Nome}</p>
                      </div>
                    </TooltipContent>
                  </TooltipPrimitive.Portal>
                </Tooltip>
              );
            });
          })()}
        </div>
      </div>
    </TooltipProvider>
  );
}
