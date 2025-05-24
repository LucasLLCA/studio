
"use client";

import type { ProcessedAndamento, Unidade } from '@/types/process-flow';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from '@/lib/process-flow-utils';
import React, { useMemo } from 'react';

const OPEN_END_NODE_COLOR_HSL_VAR = 'hsl(var(--destructive))'; // Matches the color used in process-flow-utils

interface UnitProcessSummary {
  unitId: string;
  unitSigla: string;
  unitDescricao: string;
  andamentosCount: number;
  firstAction: {
    globalSequence: number;
    tarefa: string;
    date: string; 
  } | null;
  lastAction: {
    globalSequence: number;
    tarefa: string;
    date: string; 
    isPending: boolean;
    daysOpen?: number;
    color?: string; 
  } | null;
}

interface ProcessHistoryTableProps {
  tasks: ProcessedAndamento[];
}

export function ProcessHistoryTable({ tasks }: ProcessHistoryTableProps) {

  const unitSummaries: UnitProcessSummary[] = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    const tasksByUnit = tasks.reduce((acc, task) => {
      const unitId = task.Unidade.IdUnidade;
      if (!acc[unitId]) {
        acc[unitId] = {
          unit: task.Unidade,
          andamentos: [],
        };
      }
      acc[unitId].andamentos.push(task);
      return acc;
    }, {} as Record<string, { unit: Unidade, andamentos: ProcessedAndamento[] }>);

    return Object.values(tasksByUnit).map(group => {
      // Sort andamentos within the unit chronologically by globalSequence
      const sortedAndamentos = [...group.andamentos].sort((a, b) => a.globalSequence - b.globalSequence);
      
      const firstAndamento = sortedAndamentos[0];
      const lastAndamento = sortedAndamentos[sortedAndamentos.length - 1];

      return {
        unitId: group.unit.IdUnidade,
        unitSigla: group.unit.Sigla,
        unitDescricao: group.unit.Descricao,
        andamentosCount: sortedAndamentos.length,
        firstAction: firstAndamento ? {
          globalSequence: firstAndamento.globalSequence,
          tarefa: firstAndamento.Tarefa,
          date: formatDisplayDate(firstAndamento.parsedDate),
        } : null,
        lastAction: lastAndamento ? {
          globalSequence: lastAndamento.globalSequence,
          tarefa: lastAndamento.Tarefa,
          date: formatDisplayDate(lastAndamento.parsedDate),
          isPending: lastAndamento.color === OPEN_END_NODE_COLOR_HSL_VAR && lastAndamento.daysOpen !== undefined && lastAndamento.daysOpen >= 0,
          daysOpen: lastAndamento.daysOpen,
          color: lastAndamento.color,
        } : null,
      };
    }).sort((a,b) => { // Optional: sort units by sigla or first/last action date
        if (a.firstAction && b.firstAction) {
            return new Date(a.firstAction.date.split(" ")[0].split("/").reverse().join("-") + "T" + a.firstAction.date.split(" ")[1]).getTime() - 
                   new Date(b.firstAction.date.split(" ")[0].split("/").reverse().join("-") + "T" + b.firstAction.date.split(" ")[1]).getTime();
        }
        return a.unitSigla.localeCompare(b.unitSigla);
    });
  }, [tasks]);

  if (!unitSummaries || unitSummaries.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum histórico para exibir na tabela.</p>;
  }

  const renderStatusBadge = (lastAction: UnitProcessSummary['lastAction']) => {
    if (!lastAction) return <span className="text-muted-foreground">N/A</span>;

    if (lastAction.isPending && typeof lastAction.daysOpen === 'number') {
      return <Badge variant="destructive">Pendente há {lastAction.daysOpen} dia(s)</Badge>;
    }
    if (lastAction.tarefa === 'CONCLUSAO-PROCESSO-UNIDADE' || lastAction.tarefa === 'CONCLUSAO-AUTOMATICA-UNIDADE') {
      return <Badge variant="secondary">Concluído</Badge>;
    }
    if (lastAction.tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      return <Badge variant="outline">Remetido</Badge>;
    }
    return <span className="text-foreground">Em Andamento</span>;
  };

  return (
    <div className="mt-8 p-4 md:p-6 lg:p-8 border-t border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4">Resumo do Processo por Unidade</h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] sticky left-0 bg-card z-10">Unidade</TableHead>
              <TableHead className="w-[120px] text-center">Nº de Ações</TableHead>
              <TableHead className="min-w-[300px]">Primeira Ação (Seq. - Tarefa - Data)</TableHead>
              <TableHead className="min-w-[300px]">Última Ação (Seq. - Tarefa - Data)</TableHead>
              <TableHead className="w-[200px]">Situação na Unidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unitSummaries.map((summary) => (
              <TableRow key={summary.unitId}>
                <TableCell className="font-medium sticky left-0 bg-card z-10" title={summary.unitDescricao}>
                  {summary.unitSigla}
                </TableCell>
                <TableCell className="text-center">{summary.andamentosCount}</TableCell>
                <TableCell>
                  {summary.firstAction 
                    ? `${summary.firstAction.globalSequence} - ${summary.firstAction.tarefa} (${summary.firstAction.date})` 
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {summary.lastAction 
                    ? `${summary.lastAction.globalSequence} - ${summary.lastAction.tarefa} (${summary.lastAction.date})` 
                    : 'N/A'}
                </TableCell>
                <TableCell>{renderStatusBadge(summary.lastAction)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
