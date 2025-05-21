"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState } from 'react';
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

  if (tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <ScrollArea className="w-full rounded-md border">
        {/* Centraliza a coluna de tarefas e define uma largura máxima responsiva */}
        <div className="flex flex-col items-center p-4 min-h-[calc(100vh-120px)] w-full md:w-3/4 lg:w-2/3 mx-auto">
          {tasks.map((task, index) => (
            <TaskNode
              key={task.IdAndamento}
              task={task}
              onTaskClick={handleTaskClick}
              isFirstInLane={index === 0}
              isLastInLane={index === tasks.length - 1}
              // taskNodeRefs não é mais necessário aqui, TaskNode lida com seu próprio ref se precisar.
            />
          ))}
        </div>
        <ScrollBar orientation="vertical" /> {/* Manter scrollbar vertical caso a lista seja longa */}
      </ScrollArea>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
