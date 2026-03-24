'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink } from 'lucide-react';
import type { FluxoProcesso } from '@/types/fluxos';
import type { Node } from '@xyflow/react';

interface FlowProcessesListProps {
  processos: FluxoProcesso[];
  nodes: Node[];
  onRemove?: (processoId: string) => void;
  onAdvance?: (processoId: string, nodeId: string) => void;
  readOnly?: boolean;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  em_andamento: { label: 'Em Andamento', variant: 'default' },
  concluido: { label: 'Concluído', variant: 'secondary' },
  pausado: { label: 'Pausado', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

export default function FlowProcessesList({
  processos,
  nodes,
  onRemove,
  readOnly = false,
}: FlowProcessesListProps) {
  if (processos.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Nenhum processo vinculado
      </div>
    );
  }

  const getNodeName = (nodeId: string | null | undefined) => {
    if (!nodeId) return 'N/A';
    const node = nodes.find((n) => n.id === nodeId);
    return node ? (node.data as Record<string, unknown>).nome as string : nodeId;
  };

  return (
    <div className="divide-y divide-border">
      {processos.map((proc) => {
        const badge = STATUS_BADGES[proc.status] || STATUS_BADGES.em_andamento;
        return (
          <div key={proc.id} className="p-3 space-y-1">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {proc.numero_processo_formatado || proc.numero_processo}
              </span>
              <Badge variant={badge.variant} className="w-fit">{badge.label}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Etapa atual: <strong>{getNodeName(proc.node_atual_id)}</strong>
            </div>
            <div className="text-xs text-muted-foreground">
              Atribuído por: {proc.atribuido_por}
            </div>
            {proc.notas && (
              <div className="text-xs text-muted-foreground italic">{proc.notas}</div>
            )}
            <div className="flex items-center gap-1 pt-1">
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`/processo/${encodeURIComponent(proc.numero_processo_formatado || proc.numero_processo)}/visualizar`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver
                </a>
              </Button>
              {!readOnly && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => onRemove(proc.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remover
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
