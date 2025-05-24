
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
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
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProcessHistoryTableProps {
  tasks: ProcessedAndamento[];
}

// Helper to clean HTML from descriptions for display
const stripHtml = (html: string): string => {
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }
  // Fallback for server-side rendering or environments without DOMParser
  return html.replace(/<[^>]*>?/gm, '');
};


export function ProcessHistoryTable({ tasks }: ProcessHistoryTableProps) {
  if (!tasks || tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum histórico para exibir na tabela.</p>;
  }

  return (
    <div className="mt-8 p-4 md:p-6 lg:p-8 border-t border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4">Histórico Detalhado do Processo</h2>
      <ScrollArea className="w-full rounded-md border max-h-[600px]">
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Seq.</TableHead>
                <TableHead className="w-[170px]">Data/Hora</TableHead>
                <TableHead className="w-[180px]">Unidade</TableHead>
                <TableHead className="min-w-[200px]">Tarefa</TableHead>
                <TableHead className="min-w-[300px]">Descrição</TableHead>
                <TableHead className="min-w-[250px]">Usuário</TableHead>
                <TableHead className="w-[150px] text-center">Dias Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const cleanedDescription = stripHtml(task.Descricao);

                return (
                  <TableRow key={`${task.IdAndamento}-${task.globalSequence}`}>
                    <TableCell className="font-medium text-center align-top">{task.globalSequence}</TableCell>
                    <TableCell className="align-top">{formatDisplayDate(task.parsedDate)}</TableCell>
                    <TableCell title={task.Unidade.Descricao} className="align-top">{task.Unidade.Sigla}</TableCell>
                    <TableCell className="align-top">{task.Tarefa}</TableCell>
                    <TableCell className="whitespace-normal break-words align-top">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default block">{cleanedDescription}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-lg">
                          <p>{cleanedDescription}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="align-top">{task.Usuario.Nome} ({task.Usuario.Sigla})</TableCell>
                    <TableCell className="text-center align-top">
                      {task.daysOpen !== undefined && task.daysOpen >= 0 ? (
                        <Badge variant="destructive">{task.daysOpen} dia(s)</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

