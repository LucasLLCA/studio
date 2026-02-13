"use client";

import { useMemo } from 'react';
import type { ProcessoData, ProcessedFlowData, UnidadeAberta } from '@/types/process-flow';
import type { ProcessCreationInfo } from '@/hooks/use-process-creation-info';
import { parseCustomDateString } from '@/lib/process-flow-utils';

export function extractOrgaoFromSigla(sigla: string): string {
  if (!sigla) return '';
  const parts = sigla.split('/');
  return parts[0].trim();
}

interface UseOrgaoMetricsOptions {
  userOrgao: string | null;
  processCreationInfo: ProcessCreationInfo | null;
  openUnitsInProcess: UnidadeAberta[] | null;
  processedFlowData: ProcessedFlowData | null;
  rawProcessData: ProcessoData | null;
}

export function useOrgaoMetrics({
  userOrgao,
  processCreationInfo,
  openUnitsInProcess,
  processedFlowData,
  rawProcessData,
}: UseOrgaoMetricsOptions) {
  const isExternalProcess = useMemo(() => {
    if (!userOrgao || !processCreationInfo?.creatorUnit) {
      return false;
    }
    const creatorOrgao = extractOrgaoFromSigla(processCreationInfo.creatorUnit).toUpperCase();
    const userOrgaoNormalized = userOrgao.toUpperCase();
    return creatorOrgao !== userOrgaoNormalized;
  }, [userOrgao, processCreationInfo]);

  const daysOpenInUserOrgao = useMemo(() => {
    if (!userOrgao || !openUnitsInProcess || openUnitsInProcess.length === 0 || !processedFlowData || !rawProcessData?.Andamentos) return null;

    const userOrgaoNormalized = userOrgao.toUpperCase();

    const unitsInUserOrgao = openUnitsInProcess.filter(u => {
      const unitOrgao = extractOrgaoFromSigla(u.Unidade.Sigla).toUpperCase();
      return unitOrgao === userOrgaoNormalized;
    });

    if (unitsInUserOrgao.length === 0) return null;

    const creatorOrgao = processCreationInfo?.creatorUnit
      ? extractOrgaoFromSigla(processCreationInfo.creatorUnit).toUpperCase()
      : '';
    const isExternal = creatorOrgao !== userOrgaoNormalized;

    if (isExternal) {
      const andamentosInUserOrgao = rawProcessData.Andamentos.filter(a => {
        const andamentoOrgao = extractOrgaoFromSigla(a.Unidade.Sigla).toUpperCase();
        return andamentoOrgao === userOrgaoNormalized;
      });

      if (andamentosInUserOrgao.length === 0) return null;

      const sortedAndamentos = andamentosInUserOrgao
        .map(a => ({ ...a, parsedDate: parseCustomDateString(a.DataHora) }))
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

      const firstDate = sortedAndamentos[0].parsedDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - firstDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else {
      let maxDays: number | null = null;
      for (const unit of unitsInUserOrgao) {
        const openTasksInUnit = processedFlowData.tasks
          .filter(task => task.Unidade.IdUnidade === unit.Unidade.IdUnidade && typeof task.daysOpen === 'number' && task.daysOpen >= 0)
          .sort((a, b) => b.globalSequence - a.globalSequence);

        const openTask = openTasksInUnit[0];
        if (openTask?.daysOpen !== undefined && openTask.daysOpen !== null) {
          if (maxDays === null || openTask.daysOpen > maxDays) {
            maxDays = openTask.daysOpen;
          }
        }
      }

      return maxDays;
    }
  }, [userOrgao, openUnitsInProcess, processedFlowData, rawProcessData, processCreationInfo]);

  return { isExternalProcess, daysOpenInUserOrgao, extractOrgaoFromSigla };
}
