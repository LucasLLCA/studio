
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import React from 'react';

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick }) => {
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  const radius = task.nodeRadius || 18; 
  const showDaysOpenLabel = typeof task.daysOpen === 'number' && task.daysOpen >= 0;

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
          y={-radius - 6} // Position above the circle
          textAnchor="middle"
          fontSize="10px"
          fontWeight="bold"
          fill="hsl(var(--destructive))" // Use destructive color for the label text
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
      <title>{`Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${formatDisplayDate(task.parsedDate)}\nDias Aberto: ${task.daysOpen ?? 'N/A'}`}</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';

// Helper function (can be moved to utils if used elsewhere)
function formatDisplayDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Data inválida';
  // Example: 23/08/2023 10:56
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
