"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatProcessNumber } from '@/lib/utils';
import type { KanbanProcesso } from '@/types/teams';

interface KanbanCardProps {
  processo: KanbanProcesso;
  onClick: () => void;
  onDelete?: (processo: KanbanProcesso) => void;
}

export function KanbanCard({ processo, onClick, onDelete }: KanbanCardProps) {
  return (
    <Card
      className="group/card cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium text-foreground leading-snug">
            {processo.numero_processo_formatado || formatProcessNumber(processo.numero_processo)}
          </p>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-destructive/10"
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
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
                style={tag.cor ? { backgroundColor: tag.cor, color: '#fff' } : undefined}
              >
                {tag.nome}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
