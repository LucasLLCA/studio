"use client";

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { KanbanColumn as KanbanColumnType, KanbanProcesso, TeamTag } from '@/types/teams';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';

interface KanbanBoardProps {
  colunas: KanbanColumnType[];
  teamTags: TeamTag[];
  onProcessoClick: (processo: KanbanProcesso, tagNome: string) => void;
  onDeleteColumn?: (tagId: string) => void;
  onDeleteProcesso?: (processo: KanbanProcesso) => void;
  onAddGroup?: () => void;
  onMoveProcesso?: (processo: KanbanProcesso, sourceTagId: string, targetTagId: string) => Promise<void>;
}

export function KanbanBoard({
  colunas,
  teamTags,
  onProcessoClick,
  onDeleteColumn,
  onDeleteProcesso,
  onAddGroup,
  onMoveProcesso,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<{ processo: KanbanProcesso; sourceTagId: string } | null>(null);

  // Drag só é habilitado se houver mais de uma coluna
  const canDrag = colunas.length > 1 && !!onMoveProcesso;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Exige arrastar 8px antes de iniciar — evita conflito com clique
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { processo: KanbanProcesso; sourceTagId: string } | undefined;
    if (data) setActiveCard(data);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !onMoveProcesso) return;

    const data = active.data.current as { processo: KanbanProcesso; sourceTagId: string } | undefined;
    if (!data) return;

    const { processo, sourceTagId } = data;
    const targetTagId = over.id as string;

    // Não faz nada se soltar na mesma coluna
    if (targetTagId === sourceTagId) return;

    await onMoveProcesso(processo, sourceTagId, targetTagId);
  }

  if (colunas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] h-full text-muted-foreground">
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex overflow-x-auto gap-4 p-4 pb-6 h-full">
        {colunas.map((coluna) => (
          <KanbanColumn
            key={coluna.tag_id}
            coluna={coluna}
            onProcessoClick={(processo) => onProcessoClick(processo, coluna.tag_nome)}
            onDeleteColumn={onDeleteColumn}
            onDeleteProcesso={onDeleteProcesso}
            isDraggable={canDrag}
          />
        ))}

        {/* Botão de novo grupo */}
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

      {/* Fantasma do card seguindo o cursor durante o drag */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="rotate-2 opacity-90 w-80 shadow-2xl">
            <KanbanCard
              processo={activeCard.processo}
              sourceTagId={activeCard.sourceTagId}
              onClick={() => {}}
              isDraggable={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
