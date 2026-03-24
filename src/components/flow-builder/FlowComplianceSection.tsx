'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { GitBranch, CheckCircle2, Clock, AlertTriangle, Circle, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useFluxosByProcesso } from '@/lib/react-query/queries/useFluxos';
import { computeFlowCompliance } from '@/lib/flow-compliance';
import { stripProcessNumber } from '@/lib/utils';
import type { Andamento } from '@/types/process-flow';
import type { ComplianceStatus, FluxoComplianceResult } from '@/types/fluxos';
import { parseCustomDateString } from '@/lib/process-flow-utils';

interface FlowComplianceSectionProps {
  usuario: string;
  numeroProcesso: string;
  andamentos: Andamento[];
}

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; icon: React.ReactNode; className: string }> = {
  concluido: {
    label: 'Concluído',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  em_andamento: {
    label: 'Em andamento',
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  pendente: {
    label: 'Pendente',
    icon: <Circle className="h-3.5 w-3.5" />,
    className: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
  violado: {
    label: 'Pulado',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
};

const NODE_TYPE_LABELS: Record<string, string> = {
  inicio: 'Início',
  fim: 'Fim',
  sei_task: 'Tarefa SEI',
  etapa: 'Etapa',
  decisao: 'Decisão',
  fork: 'Fork',
  join: 'Join',
};

function formatTimestamp(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = parseCustomDateString(dateStr);
    if (isNaN(d.getTime())) {
      // Try ISO format
      const iso = new Date(dateStr);
      if (!isNaN(iso.getTime())) return iso.toLocaleString('pt-BR');
      return null;
    }
    return d.toLocaleString('pt-BR');
  } catch {
    return null;
  }
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function FlowComplianceCard({ result }: { result: FluxoComplianceResult }) {
  const { fluxo, summary, nodes } = result;

  // All nodes including inicio/fim for the step list display
  const displayNodes = nodes;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/fluxos/${fluxo.id}`}
              className="font-semibold text-sm hover:underline flex items-center gap-1"
            >
              {fluxo.nome}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Link>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {fluxo.status}
            </Badge>
          </div>
          {fluxo.descricao && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{fluxo.descricao}</p>
          )}
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {summary.concluido > 0 && (
            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 bg-green-500/10 text-green-700 dark:text-green-400">
              {summary.concluido}
            </Badge>
          )}
          {summary.violado > 0 && (
            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 bg-red-500/10 text-red-700 dark:text-red-400">
              {summary.violado} puladas
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{summary.concluido} de {summary.total} etapas concluídas</span>
          <span>{summary.progress_percent}%</span>
        </div>
        <Progress value={summary.progress_percent} className="h-2" />
      </div>

      {/* Violation warning */}
      {summary.violado > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{summary.violado} etapa{summary.violado > 1 ? 's foram puladas' : ' foi pulada'} no fluxo esperado.</span>
        </div>
      )}

      {/* Step list (expandable) */}
      {displayNodes.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="steps" className="border-none">
            <AccordionTrigger className="py-1.5 text-xs text-muted-foreground hover:no-underline">
              Ver etapas ({displayNodes.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pt-1">
                {displayNodes.map((nc) => (
                  <div
                    key={nc.node.node_id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm"
                  >
                    <ComplianceBadge status={nc.status} />
                    <span className="font-medium flex-1 min-w-0 truncate">{nc.node.nome}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {NODE_TYPE_LABELS[nc.node.tipo] ?? nc.node.tipo}
                    </span>
                    {nc.timestamp && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTimestamp(nc.timestamp)}
                      </span>
                    )}
                    {nc.matched_andamentos.length > 0 && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({nc.matched_andamentos.length} andamento{nc.matched_andamentos.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

export function FlowComplianceSection({
  usuario,
  numeroProcesso,
  andamentos,
}: FlowComplianceSectionProps) {
  const strippedProcesso = stripProcessNumber(numeroProcesso);
  const { data: fluxosVinculados, isLoading } = useFluxosByProcesso(usuario, strippedProcesso);

  const complianceResults = useMemo(() => {
    if (!fluxosVinculados || fluxosVinculados.length === 0) return [];
    return fluxosVinculados.map(({ fluxo, vinculacao }) =>
      computeFlowCompliance(fluxo, vinculacao, andamentos)
    );
  }, [fluxosVinculados, andamentos]);

  // Don't render at all if no flows linked and not loading
  if (!isLoading && (!fluxosVinculados || fluxosVinculados.length === 0)) {
    return null;
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="h-5 w-5" /> Conformidade de Fluxo
        </CardTitle>
        <CardDescription>
          Verificação das etapas do fluxo vinculado contra os andamentos reais do processo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {complianceResults.map((result) => (
              <FlowComplianceCard key={result.fluxo.id} result={result} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
