"use client";

import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { EditableTagBadge } from '@/components/ui/editable-tag-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatProcessNumber } from '@/lib/utils';
import type { KanbanProcesso } from '@/types/teams';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface KanbanCardProps {
  processo: KanbanProcesso;
  sourceTagId: string;
  onClick: () => void;
  onDelete?: (processo: KanbanProcesso) => void;
  isDraggable?: boolean;
}

export function KanbanCard({ processo, sourceTagId, onClick, onDelete, isDraggable = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: processo.id,
    disabled: !isDraggable,
    data: { processo, sourceTagId },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group/card transition-shadow ${
        isDragging
          ? 'opacity-40 shadow-none cursor-grabbing'
          : isDraggable
          ? 'hover:shadow-md cursor-grab active:cursor-grabbing'
          : 'hover:shadow-md cursor-pointer'
      }`}
      onClick={isDragging ? undefined : onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-1">
          {/* Handle de arrasto com fundo visível no hover */}
          {isDraggable && (
            <button
              {...listeners}
              {...attributes}
              className="shrink-0 mt-0.5 touch-none rounded p-0.5 text-muted-foreground/30 group-hover/card:text-muted-foreground/70 group-hover/card:bg-muted hover:!text-foreground hover:!bg-muted-foreground/15 transition-all cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
              title="Arrastar para mover para outro grupo"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-medium text-foreground leading-snug">
                {processo.numero_processo_formatado || formatProcessNumber(processo.numero_processo)}
              </p>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0 opacity-40 sm:opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(processo);
                  }}
                  title="Remover processo deste grupo"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
            {processo.nota && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {processo.nota}
              </p>
            )}
            {processo.team_tags && processo.team_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {processo.team_tags.map((tag) => (
                  <EditableTagBadge
                    key={tag.id}
                    tag={tag}
                    usuario=""
                    readOnly
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
