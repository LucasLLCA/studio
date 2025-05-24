
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import React from 'react';
import { formatDisplayDate } from '@/lib/process-flow-utils'; 
import { Layers } from 'lucide-react'; // For summary node indication

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick }) => {
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  const radius = task.nodeRadius || 18; 
  const showDaysOpenLabel = typeof task.daysOpen === 'number' && task.daysOpen >= 0 && !task.isSummaryNode; // Don't show days open for summary nodes for now

  return (
    <g
      transform={`translate(${task.x}, ${task.y})`}
      onClick={handleNodeClick}
      className="cursor-pointer group"
      aria-label={`Tarefa ${task.globalSequence}: ${task.Tarefa}`}
    >
      {showDaysOpenLabel && (
        <text
          x={0}
          y={-radius - 6} 
          textAnchor="middle"
          fontSize="10px"
          fontWeight="bold"
          fill="hsl(var(--destructive))"
          className="select-none"
        >
          {task.daysOpen}d
        </text>
      )}
      <circle
        r={radius}
        fill={task.color || "hsl(var(--primary))"}
        stroke="hsl(var(--card-foreground))" 
        strokeWidth="2"
        className="transition-all duration-150 group-hover:stroke-hsl(var(--ring)) group-hover:stroke-[2.5px] group-active:scale-95"
      />
      {task.isSummaryNode && task.groupedTasksCount ? (
        <text
          y={radius * 0.25}
          textAnchor="middle"
          fontSize={radius * 0.5} // Smaller font for count
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
          className="select-none"
        >
          {task.groupedTasksCount}x
        </text>
      ) : (
        <text
          y={radius * 0.25} 
          textAnchor="middle"
          fontSize={radius * 0.6} 
          fontWeight="bold" 
          fill="hsl(var(--primary-foreground))" 
          className="select-none"
        >
          {task.globalSequence}
        </text>
      )}
      <title>{
        task.isSummaryNode ? 
        `${task.groupedTasksCount} ações diversas em ${task.Unidade.Sigla}\nInício em: ${formatDisplayDate(task.parsedDate)}` :
        `Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${formatDisplayDate(task.parsedDate)}\nDias Aberto: ${task.daysOpen ?? 'N/A'}`
      }</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
