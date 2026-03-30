'use client';

import React from 'react';
import { X, User, Building2, FileText, CheckSquare, AlertTriangle, Play, StopCircle, GitBranch, Shuffle, Merge, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Node } from '@xyflow/react';

interface FlowSummaryPanelProps {
  nodes: Node[];
  onClose: () => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-green-700',  bg: 'bg-green-50'  },
  media:   { label: 'Média',   color: 'text-amber-700',  bg: 'bg-amber-50'  },
  alta:    { label: 'Alta',    color: 'text-orange-700', bg: 'bg-orange-50' },
  critica: { label: 'Crítica', color: 'text-red-700',    bg: 'bg-red-50'    },
};

const NODE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; border: string }> = {
  inicio:   { label: 'Início',             icon: <Play className="h-3.5 w-3.5" />,        color: 'text-green-700',  border: 'border-green-200 bg-green-50/50'  },
  fim:      { label: 'Fim',                icon: <StopCircle className="h-3.5 w-3.5" />,  color: 'text-red-600',    border: 'border-red-200 bg-red-50/50'      },
  etapa:    { label: 'Etapa',              icon: <Layers className="h-3.5 w-3.5" />,      color: 'text-blue-700',   border: 'border-blue-200 bg-blue-50/50'    },
  sei_task: { label: 'Tarefa SEI',         icon: <FileText className="h-3.5 w-3.5" />,    color: 'text-purple-700', border: 'border-purple-200 bg-purple-50/50'},
  decisao:  { label: 'Decisão',            icon: <GitBranch className="h-3.5 w-3.5" />,   color: 'text-orange-700', border: 'border-orange-200 bg-orange-50/50'},
  fork:     { label: 'Fork',               icon: <Shuffle className="h-3.5 w-3.5" />,     color: 'text-foreground',  border: 'border-border bg-muted/30'  },
  join:     { label: 'Join',               icon: <Merge className="h-3.5 w-3.5" />,       color: 'text-foreground',  border: 'border-border bg-muted/30'  },
};

const TYPE_ORDER: Record<string, number> = {
  inicio: 0, etapa: 1, sei_task: 2, decisao: 3, fork: 4, join: 5, fim: 99,
};

function sortNodes(nodes: Node[]): Node[] {
  return [...nodes].sort((a, b) => {
    const orderA = TYPE_ORDER[a.type || ''] ?? 50;
    const orderB = TYPE_ORDER[b.type || ''] ?? 50;
    if (orderA !== orderB) return orderA - orderB;
    // Mesmo tipo: ordena por posição vertical
    return (a.position?.y ?? 0) - (b.position?.y ?? 0);
  });
}

export default function FlowSummaryPanel({ nodes, onClose }: FlowSummaryPanelProps) {
  const sorted = sortNodes(nodes);
  const hasContent = sorted.some((n) => {
    const d = n.data as Record<string, unknown>;
    return (
      d.responsavel || d.descricao || d.prioridade ||
      (d.documentos_necessarios as string[] | null)?.filter(Boolean).length ||
      (d.checklist as Array<{ item: string }> | null)?.filter((c) => c.item).length ||
      (d.metadata_extra as Record<string, unknown> | null)?.unidade_sei_sigla
    );
  });

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col flex-shrink-0 overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold">Resumo do Fluxo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{sorted.length} etapa{sorted.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhuma etapa no fluxo ainda.
          </p>
        )}

        {sorted.map((node) => {
          const d = node.data as Record<string, unknown>;
          const meta = (d.metadata_extra as Record<string, unknown>) || {};
          const tipo = node.type || 'etapa';
          const cfg = NODE_TYPE_CONFIG[tipo] || NODE_TYPE_CONFIG.etapa;
          const prioridade = d.prioridade as string | undefined;
          const pCfg = prioridade ? PRIORITY_CONFIG[prioridade] : null;
          const documentos = ((d.documentos_necessarios as string[]) || []).filter(Boolean);
          const checklist = ((d.checklist as Array<{ item: string; obrigatorio: boolean }>) || []).filter((c) => c.item);
          const unidadeSigla = meta.unidade_sei_sigla as string | undefined;
          const unidadeDesc = meta.unidade_sei_descricao as string | undefined;
          const nome = (d.nome as string) || 'Sem nome';
          const descricao = d.descricao as string | undefined;
          const responsavel = d.responsavel as string | undefined;

          return (
            <div
              key={node.id}
              className={cn('rounded-lg border p-3 space-y-2', cfg.border)}
            >
              {/* Tipo + Nome */}
              <div className="flex items-start gap-2">
                <span className={cn('mt-0.5 shrink-0', cfg.color)}>{cfg.icon}</span>
                <div className="min-w-0">
                  <p className={cn('text-2xs font-medium uppercase tracking-wide', cfg.color)}>{cfg.label}</p>
                  <p className="text-sm font-semibold leading-tight">{nome}</p>
                </div>
                {pCfg && (
                  <span className={cn('ml-auto shrink-0 text-2xs font-semibold px-1.5 py-0.5 rounded-full', pCfg.bg, pCfg.color)}>
                    {pCfg.label}
                  </span>
                )}
              </div>

              {/* Descrição */}
              {descricao && (
                <p className="text-xs text-muted-foreground leading-relaxed">{descricao}</p>
              )}

              {/* Responsável */}
              {responsavel && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span>{responsavel}</span>
                </div>
              )}

              {/* Unidade */}
              {unidadeSigla && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-medium">{unidadeSigla}</span>
                    {unidadeDesc && <p className="text-2xs text-muted-foreground/70 truncate">{unidadeDesc}</p>}
                  </div>
                </div>
              )}

              {/* Documentos necessários */}
              {documentos.length > 0 && (
                <div>
                  <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Documentos
                  </p>
                  <ul className="space-y-0.5">
                    {documentos.map((doc, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <FileText className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Checklist */}
              {checklist.length > 0 && (
                <div>
                  <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Checklist
                  </p>
                  <ul className="space-y-0.5">
                    {checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <CheckSquare className={cn('h-3 w-3 shrink-0 mt-0.5', item.obrigatorio ? 'text-orange-500' : 'text-muted-foreground')} />
                        <span>{item.item}</span>
                        {item.obrigatorio && (
                          <span className="ml-auto text-2xs text-orange-600 font-medium shrink-0">obrig.</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sem detalhes */}
              {!descricao && !responsavel && !unidadeSigla && documentos.length === 0 && checklist.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sem detalhes preenchidos.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
