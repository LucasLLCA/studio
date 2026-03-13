"use client";

import type { Andamento } from '@/types/process-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollBar } from '@/components/ui/scroll-area';
import { useMemo } from 'react';
import { parseCustomDateString } from '@/lib/process-flow-utils';

interface ProcessProductivityTableProps {
  andamentos: Andamento[];
}

interface ProductivityRow {
  userId: string;
  userSigla: string;
  userName: string;
  taskCounts: Record<string, number>;
  taskCollapsedSourceCounts: Record<string, number>;
  total: number;
}

const AUTO_CONCLUSION_TASK_TYPE = 'CONCLUSAO-AUTOMATICA-UNIDADE';

const getDateHourMinuteKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const buildAutoConclusionGroupKey = (andamento: Andamento): string => {
  const userKey = andamento.Usuario?.IdUsuario || andamento.Usuario?.Sigla || 'usuario-desconhecido';
  const unitKey = andamento.Unidade?.IdUnidade || 'unidade-desconhecida';
  const parsedDate = parseCustomDateString(andamento.DataHora || '');
  const dateHourMinute = getDateHourMinuteKey(parsedDate);
  return `${userKey}|${unitKey}|${dateHourMinute}`;
};

export function ProcessProductivityTable({ andamentos }: ProcessProductivityTableProps) {
  const { tasks, rows } = useMemo(() => {
    const taskSet = new Set<string>();
    const groupedRows = new Map<string, ProductivityRow>();
    const autoConclusionGroups = new Map<string, Andamento[]>();

    const ensureRow = (andamento: Andamento): ProductivityRow => {
      const userId = andamento.Usuario?.IdUsuario || andamento.Usuario?.Sigla || 'usuario-desconhecido';
      const userSigla = andamento.Usuario?.Sigla || 'Usuário desconhecido';
      const userName = andamento.Usuario?.Nome || 'Usuário desconhecido';

      const existingRow = groupedRows.get(userId);
      if (!existingRow) {
        const createdRow: ProductivityRow = {
          userId,
          userSigla,
          userName,
          taskCounts: {},
          taskCollapsedSourceCounts: {},
          total: 0,
        };
        groupedRows.set(userId, createdRow);
        return createdRow;
      }
      return existingRow;
    };

    andamentos.forEach((andamento) => {
      const task = andamento.Tarefa || 'Tarefa desconhecida';
      taskSet.add(task);

      if (task === AUTO_CONCLUSION_TASK_TYPE) {
        const groupKey = buildAutoConclusionGroupKey(andamento);
        const existingGroup = autoConclusionGroups.get(groupKey) || [];
        existingGroup.push(andamento);
        autoConclusionGroups.set(groupKey, existingGroup);
        return;
      }

      const row = ensureRow(andamento);
      row.taskCounts[task] = (row.taskCounts[task] || 0) + 1;
      row.total += 1;
    });

    autoConclusionGroups.forEach((group) => {
      const firstInGroup = group[0];
      if (!firstInGroup) return;

      const row = ensureRow(firstInGroup);
      row.taskCounts[AUTO_CONCLUSION_TASK_TYPE] = (row.taskCounts[AUTO_CONCLUSION_TASK_TYPE] || 0) + 1;
      if (group.length > 1) {
        row.taskCollapsedSourceCounts[AUTO_CONCLUSION_TASK_TYPE] =
          (row.taskCollapsedSourceCounts[AUTO_CONCLUSION_TASK_TYPE] || 0) + group.length;
      }
      row.total += 1;
    });

    const sortedTasks = Array.from(taskSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const sortedRows = Array.from(groupedRows.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      const userComparison = a.userName.localeCompare(b.userName, 'pt-BR');
      return userComparison;
    });

    return {
      tasks: sortedTasks,
      rows: sortedRows,
    };
  }, [andamentos]);

  return (
    <div className="w-full border rounded-lg overflow-hidden bg-card shadow-sm">
      <ScrollArea className="h-[320px] w-full">
        <div className="w-max min-w-full">
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-400 dark:bg-slate-600">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-semibold text-slate-50 min-w-[240px]">
                  Usuário
                </th>
                {tasks.map((task) => (
                  <th
                    key={task}
                    className="px-3 py-3 text-center font-semibold text-slate-50 min-w-[140px]"
                    title={task}
                  >
                    <span className="line-clamp-2">{task}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-50 min-w-[100px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={tasks.length + 2} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum andamento disponível para cálculo de produtividade.
                  </td>
                </tr>
              )}

              {rows.map((row, index) => (
                <tr
                  key={row.userId}
                  className={`border-b last:border-b-0 ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{row.userSigla}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate" title={row.userName}>
                      {row.userName}
                    </div>
                  </td>
                  {tasks.map((task) => (
                    <td key={`${row.userId}-${task}`} className="px-3 py-3 text-center">
                      <span
                        className="font-medium text-foreground"
                        title={task === AUTO_CONCLUSION_TASK_TYPE
                          ? `Quantidade agrupada: ${row.taskCollapsedSourceCounts[task] || 0}`
                          : undefined}
                      >
                        {row.taskCounts[task] || 0}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-foreground">{row.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
