"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatProcessNumber } from '@/lib/utils';
import type { KanbanProcesso } from '@/types/teams';

interface KanbanCardProps {
  processo: KanbanProcesso;
  onClick: () => void;
}

export function KanbanCard({ processo, onClick }: KanbanCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <p className="text-sm font-medium text-foreground">
          {processo.numero_processo_formatado || formatProcessNumber(processo.numero_processo)}
        </p>
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
