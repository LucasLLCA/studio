
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
import { formatDisplayDate } from '@/lib/process-flow-utils';
import React from 'react';

interface ProcessHistoryTableProps {
  tasks: ProcessedAndamento[];
}

// Basic HTML stripper for display
function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, '');
}

export function ProcessHistoryTable({ tasks }: ProcessHistoryTableProps) {
  if (!tasks || tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum histórico para exibir na tabela.</p>;
  }

  return (
    <div className="mt-8 p-4 md:p-6 lg:p-8 border-t border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4">Histórico do Processo em Tabela</h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Seq.</TableHead>
              <TableHead className="w-[150px]">Data/Hora</TableHead>
              <TableHead className="w-[180px]">Unidade</TableHead>
              <TableHead className="w-[200px]">Tarefa</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[200px]">Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={`${task.IdAndamento}-${task.globalSequence}`}>
                <TableCell>{task.globalSequence}</TableCell>
                <TableCell>{formatDisplayDate(task.parsedDate)}</TableCell>
                <TableCell>{task.Unidade.Sigla}</TableCell>
                <TableCell>{task.Tarefa}</TableCell>
                <TableCell className="whitespace-normal max-w-xs truncate" title={stripHtml(task.Descricao)}>
                  {stripHtml(task.Descricao).substring(0, 100) + (stripHtml(task.Descricao).length > 100 ? '...' : '')}
                </TableCell>
                <TableCell>{task.Usuario.Nome}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
