"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from './KanbanColumn';
import type { KanbanColumn as KanbanColumnType, KanbanProcesso, TeamTag } from '@/types/teams';

interface KanbanBoardProps {
  colunas: KanbanColumnType[];
  teamTags: TeamTag[];
  onProcessoClick: (processo: KanbanProcesso, tagNome: string) => void;
  onDeleteColumn?: (compartilhamentoId: string) => void;
  onAddGroup?: () => void;
}

export function KanbanBoard({ colunas, teamTags, onProcessoClick, onDeleteColumn, onAddGroup }: KanbanBoardProps) {
  if (colunas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Nenhum grupo de processos nesta equipe.</p>
          <p className="text-xs mt-1">Crie um grupo de processos para comecar.</p>
          {onAddGroup && (
            <Button variant="outline" className="mt-3" onClick={onAddGroup}>
              <Plus className="h-4 w-4 mr-1" /> Novo grupo de processos
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-4 p-4 pb-6 h-full">
      {colunas.map((coluna) => (
        <KanbanColumn
          key={coluna.compartilhamento_id}
          coluna={coluna}
          onProcessoClick={(processo) => onProcessoClick(processo, coluna.tag_nome)}
          onDeleteColumn={onDeleteColumn}
        />
      ))}

      {/* Add group button */}
      {onAddGroup && (
        <button
          onClick={onAddGroup}
          className="flex-shrink-0 w-80 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20 transition-colors cursor-pointer min-h-[200px]"
        >
          <Plus className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <span className="text-sm text-muted-foreground">Novo grupo de processos</span>
        </button>
      )}
    </div>
  );
}
