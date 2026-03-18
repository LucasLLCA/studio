"use client";

import React, { useMemo } from 'react';
import type { ProcessedFlowData, ProcessedAndamento, UnidadeAberta } from '@/types/process-flow';
import { Loader2, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { findOpenTaskForUnit } from '@/lib/process-flow-utils';

interface OpenUnitsCardProps {
  openUnitsInProcess: UnidadeAberta[] | null;
  isLoadingOpenUnits: boolean;
  unitAccessDenied: boolean;
  processedFlowData: ProcessedFlowData | null;
  onTaskCardClick: (task: ProcessedAndamento) => void;
  isPartialData?: boolean;
}

export function OpenUnitsCard({
  openUnitsInProcess,
  isLoadingOpenUnits,
  unitAccessDenied,
  processedFlowData,
  onTaskCardClick,
  isPartialData = false,
}: OpenUnitsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" /> Unidades em Aberto
        </CardTitle>
        <CardDescription>
          Clique em uma unidade em aberto para foca-la na linha do tempo
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {unitAccessDenied ? (
          <div className="flex items-center gap-2 text-sm text-warning-foreground">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Não foi possível consultar unidades em aberto</span>
          </div>
        ) : isLoadingOpenUnits ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando unidades abertas...</span>
          </div>
        ) : openUnitsInProcess && openUnitsInProcess.length > 0 ? (
          <SortedOpenUnits
            openUnitsInProcess={openUnitsInProcess}
            processedFlowData={processedFlowData}
            onTaskCardClick={onTaskCardClick}
            isPartialData={isPartialData}
          />
        ) : openUnitsInProcess && openUnitsInProcess.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-success font-medium">Processo concluído — nenhuma unidade em aberto</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SortedOpenUnits({
  openUnitsInProcess,
  processedFlowData,
  onTaskCardClick,
  isPartialData = false,
}: {
  openUnitsInProcess: UnidadeAberta[];
  processedFlowData: ProcessedFlowData | null;
  onTaskCardClick: (task: ProcessedAndamento) => void;
  isPartialData?: boolean;
}) {
  const sortedUnits = useMemo(() => {
    return openUnitsInProcess
      .map(unitInfo => ({
        unitInfo,
        openTask: findOpenTaskForUnit(processedFlowData?.tasks, unitInfo.Unidade.IdUnidade),
      }))
      .sort((a, b) => {
        const daysA = a.openTask?.daysOpen ?? -1;
        const daysB = b.openTask?.daysOpen ?? -1;
        return daysB - daysA;
      });
  }, [openUnitsInProcess, processedFlowData]);

  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-2">
      {sortedUnits.map(({ unitInfo, openTask }) => (
        <Card
          key={unitInfo.Unidade.IdUnidade}
          className={`flex-shrink-0 p-3 shadow-sm border-destructive/30 min-w-[160px] ${openTask ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          onClick={() => openTask && onTaskCardClick(openTask)}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-destructive">{unitInfo.Unidade.Sigla}</span>
            <span className="text-xs text-muted-foreground flex items-center">
              <User className="h-3 w-3 mr-1 flex-shrink-0" />
              {unitInfo.UsuarioAtribuicao?.Nome || "Sem atribuição"}
            </span>
            {openTask && typeof openTask.daysOpen === 'number' ? (
              <span className="text-xs text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                {openTask.daysOpen} {openTask.daysOpen === 1 ? 'dia' : 'dias'}
              </span>
            ) : isPartialData ? (
              <span className="text-xs text-muted-foreground flex items-center">
                <Loader2 className="h-3 w-3 mr-1 flex-shrink-0 animate-spin" />
                Aguardando carregamento
              </span>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
