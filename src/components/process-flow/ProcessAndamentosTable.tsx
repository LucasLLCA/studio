"use client";

import type { ProcessedAndamento, UnidadeAberta } from '@/types/process-flow';
import { parseCustomDateString, formatDisplayDate } from '@/lib/process-flow-utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TaskDetailsModal } from './TaskDetailsModal';

interface ProcessAndamentosTableProps {
  andamentos: ProcessedAndamento[];
  searchQuery?: string;
  openUnitsInProcess?: UnidadeAberta[] | null;
}

const ROW_HEIGHT = 72; // Estimated row height in px

export function ProcessAndamentosTable({ andamentos, searchQuery = '', openUnitsInProcess }: ProcessAndamentosTableProps) {
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Build set of open unit IDs and find last andamento per open unit
  const lastAndamentoIdsInOpenUnits = useMemo(() => {
    const openUnitIds = new Set(
      openUnitsInProcess?.map(u => u.Unidade.IdUnidade) || []
    );
    if (openUnitIds.size === 0) return new Set<string>();

    const latestByUnit = new Map<string, ProcessedAndamento>();
    for (const a of andamentos) {
      if (!openUnitIds.has(a.Unidade.IdUnidade)) continue;
      const existing = latestByUnit.get(a.Unidade.IdUnidade);
      if (!existing || a.parsedDate.getTime() > existing.parsedDate.getTime()) {
        latestByUnit.set(a.Unidade.IdUnidade, a);
      }
    }

    return new Set(Array.from(latestByUnit.values()).map(a => a.IdAndamento));
  }, [andamentos, openUnitsInProcess]);

  const sortedAndFiltered = useMemo(() => {
    const sorted = [...andamentos].sort(
      (a, b) => b.parsedDate.getTime() - a.parsedDate.getTime()
    );
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(a =>
      a.Unidade.Sigla.toLowerCase().includes(q) ||
      a.Unidade.Descricao.toLowerCase().includes(q) ||
      a.Usuario.Sigla.toLowerCase().includes(q) ||
      a.Usuario.Nome.toLowerCase().includes(q) ||
      a.Descricao.replace(/<[^>]*>?/gm, '').toLowerCase().includes(q)
    );
  }, [andamentos, searchQuery]);

  const virtualizer = useVirtualizer({
    count: sortedAndFiltered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const formatDateTime = useCallback((dateString: string) => {
    try {
      if (!dateString || dateString.trim() === '') return '-';
      const date = parseCustomDateString(dateString);
      if (isNaN(date.getTime())) return dateString;
      return formatDisplayDate(date);
    } catch {
      return dateString;
    }
  }, []);

  const formatRelativeTime = useCallback((dateString: string) => {
    try {
      if (!dateString || dateString.trim() === '') return '';
      const date = parseCustomDateString(dateString);
      if (isNaN(date.getTime())) return '';
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  }, []);

  const cleanDescription = useCallback((description: string) => {
    return description.replace(/<[^>]*>?/gm, '');
  }, []);

  const handleRowClick = (andamento: ProcessedAndamento) => {
    setSelectedTask(andamento);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <>
      <div className="w-full border rounded-lg overflow-hidden bg-card shadow-sm">
        <div ref={parentRef} className="h-[400px] w-full overflow-auto">
          <div className="w-full">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-400 dark:bg-slate-600">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold text-slate-50 min-w-[200px]">
                    Data/Hora
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-50 min-w-[120px]">
                    Unidade
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-50 min-w-[150px]">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-50 min-w-[300px]">
                    Descrição
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Spacer for items before the virtual window */}
                {virtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0, padding: 0, border: 'none' }}
                    />
                  </tr>
                )}
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const andamento = sortedAndFiltered[virtualRow.index];
                  const isOpenUnitLast = lastAndamentoIdsInOpenUnits.has(andamento.IdAndamento);
                  return (
                    <tr
                      key={andamento.IdAndamento}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      onClick={() => handleRowClick(andamento)}
                      className={`border-b last:border-b-0 transition-colors hover:bg-accent cursor-pointer ${
                        isOpenUnitLast
                          ? 'bg-red-50 dark:bg-red-950/30'
                          : virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {formatDateTime(andamento.DataHora)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(andamento.DataHora)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-medium ${isOpenUnitLast ? 'text-destructive' : 'text-foreground'}`}>{andamento.Unidade.Sigla}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 truncate" title={andamento.Unidade.Descricao}>
                          {andamento.Unidade.Descricao}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{andamento.Usuario.Sigla}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 truncate" title={andamento.Usuario.Nome}>
                          {andamento.Usuario.Nome}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm line-clamp-2 text-foreground" title={cleanDescription(andamento.Descricao)}>
                          {cleanDescription(andamento.Descricao)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Spacer for items after the virtual window */}
                {virtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        height: virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                        padding: 0,
                        border: 'none',
                      }}
                    />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
