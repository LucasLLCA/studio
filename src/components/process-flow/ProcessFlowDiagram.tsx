"use client";

import type { ProcessedAndamento, Unidade } from '@/types/process-flow';
import { SwimlaneColumn } from './SwimlaneColumn';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState, useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[];
}

export function ProcessFlowDiagram({ tasks }: ProcessFlowDiagramProps) {
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTaskClick = (task: ProcessedAndamento) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const { uniqueUnits, tasksByUnit } = useMemo(() => {
    const unitMap = new Map<string, Unidade>();
    const tasksByUnitMap = new Map<string, ProcessedAndamento[]>();

    tasks.forEach(task => {
      if (!unitMap.has(task.Unidade.IdUnidade)) {
        unitMap.set(task.Unidade.IdUnidade, task.Unidade);
      }
      if (!tasksByUnitMap.has(task.Unidade.IdUnidade)) {
        tasksByUnitMap.set(task.Unidade.IdUnidade, []);
      }
      tasksByUnitMap.get(task.Unidade.IdUnidade)!.push(task);
    });
    
    // Sort uniqueUnits by the globalSequence of their first task to maintain rough chronological lane order
    const sortedUniqueUnits = Array.from(unitMap.values()).sort((a, b) => {
      const firstTaskA = tasks.find(t => t.Unidade.IdUnidade === a.IdUnidade)?.globalSequence || Infinity;
      const firstTaskB = tasks.find(t => t.Unidade.IdUnidade === b.IdUnidade)?.globalSequence || Infinity;
      return firstTaskA - firstTaskB;
    });

    return { uniqueUnits: sortedUniqueUnits, tasksByUnit: tasksByUnitMap };
  }, [tasks]);

  if (tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="flex space-x-4 p-4 min-h-[calc(100vh-120px)] items-start">
          {uniqueUnits.map(unit => (
            <SwimlaneColumn
              key={unit.IdUnidade}
              unitSigla={unit.Sigla}
              unitDescricao={unit.Descricao}
              tasks={tasksByUnit.get(unit.IdUnidade) || []}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
