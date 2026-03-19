"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import type { KanbanColumn as KanbanColumnType, KanbanProcesso } from '@/types/teams';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  coluna: KanbanColumnType;
  onProcessoClick: (processo: KanbanProcesso) => void;
  onDeleteColumn?: (tagId: string) => void;
  onDeleteProcesso?: (processo: KanbanProcesso) => void;
  isDraggable?: boolean;
}

export function KanbanColumn({ coluna, onProcessoClick, onDeleteColumn, onDeleteProcesso, isDraggable = false }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.tag_id });

  return (
    <div className="flex-shrink-0 w-80 flex flex-col rounded-lg border bg-muted/30">
      {/* Cabeçalho da coluna */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b">
        {coluna.tag_cor && (
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: coluna.tag_cor }} />
        )}
        <h3 className="text-sm font-semibold text-foreground truncate flex-1">
          {coluna.tag_nome}
        </h3>
        <span className="text-xs text-muted-foreground shrink-0">
          {coluna.processos.length}
        </span>
        {onDeleteColumn && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => onDeleteColumn(coluna.tag_id)}
            title="Remover grupo do quadro"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {/* Área de cards — droppable */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <div
          ref={setNodeRef}
          className={cn(
            'space-y-2 pt-1 min-h-[80px] rounded-md transition-colors',
            isOver && 'bg-primary/10 ring-2 ring-primary/30 ring-inset',
          )}
        >
          {coluna.processos.length === 0 ? (
            <p className={cn(
              'text-xs text-muted-foreground text-center py-4',
              isOver && 'text-primary font-medium',
            )}>
              {isOver ? 'Soltar aqui' : 'Nenhum processo.'}
            </p>
          ) : (
            coluna.processos.map((processo) => (
              <KanbanCard
                key={processo.id}
                processo={processo}
                sourceTagId={coluna.tag_id}
                onClick={() => onProcessoClick(processo)}
                onDelete={onDeleteProcesso}
                isDraggable={isDraggable}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
