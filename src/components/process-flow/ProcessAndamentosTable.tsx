"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { TaskDetailsModal } from './TaskDetailsModal';

interface ProcessAndamentosTableProps {
  andamentos: ProcessedAndamento[];
}

export function ProcessAndamentosTable({ andamentos }: ProcessAndamentosTableProps) {
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString || dateString.trim() === '') return '-';

      const date = new Date(dateString);
      // Validate if date is valid
      if (isNaN(date.getTime())) {
        return dateString;
      }

      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      if (!dateString || dateString.trim() === '') return '';

      const date = new Date(dateString);
      // Validate if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }

      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      console.error('Error formatting relative time:', dateString, error);
      return '';
    }
  };

  const cleanDescription = (description: string) => {
    return description.replace(/<[^>]*>?/gm, '');
  };

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
        <ScrollArea className="h-[400px] w-full">
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
                {andamentos.map((andamento, index) => (
                  <tr
                    key={andamento.IdAndamento}
                    onClick={() => handleRowClick(andamento)}
                    className={`border-b last:border-b-0 transition-colors hover:bg-accent cursor-pointer ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
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
                      <div className="font-medium text-foreground">{andamento.Unidade.Sigla}</div>
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
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
