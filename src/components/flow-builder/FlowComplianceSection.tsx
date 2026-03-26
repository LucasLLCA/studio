'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ReactFlowProvider } from '@xyflow/react';
import { GitBranch, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useFluxosByProcesso } from '@/lib/react-query/queries/useFluxos';
import { computeFlowCompliance } from '@/lib/flow-compliance';
import { stripProcessNumber } from '@/lib/utils';
import type { Andamento } from '@/types/process-flow';
import type { FluxoComplianceResult } from '@/types/fluxos';
import { FlowComplianceGraph } from './FlowComplianceGraph';

interface FlowComplianceSectionProps {
  usuario: string;
  numeroProcesso: string;
  andamentos: Andamento[];
}

function FlowComplianceCard({ result }: { result: FluxoComplianceResult }) {
  const { fluxo, summary, nodes } = result;
  const escapedCount = nodes.filter((nc) => nc.escapedFlow).length;

  return (
    <div className="space-y-3">
      {/* Header row */}
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
          {escapedCount > 0 && (
            <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {escapedCount} fora do fluxo
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

      {/* Visual flow graph */}
      <ReactFlowProvider>
        <FlowComplianceGraph result={result} />
      </ReactFlowProvider>
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

  if (!isLoading && (!fluxosVinculados || fluxosVinculados.length === 0)) {
    return null;
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="h-5 w-5" /> Fluxo
        </CardTitle>
        <CardDescription>
          Acompanhamento das etapas do fluxo vinculado ao processo.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {complianceResults.map((result) => (
              <FlowComplianceCard key={result.fluxo.id} result={result} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
