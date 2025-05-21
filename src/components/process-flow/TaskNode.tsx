
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import React from 'react';

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
  radius: number;
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick, radius }) => {
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  return (
    <g
      transform={`translate(${task.x}, ${task.y})`}
      onClick={handleNodeClick}
      className="cursor-pointer group"
      aria-label={`Tarefa ${task.globalSequence}: ${task.Tarefa}`}
    >
      <circle
        r={radius}
        fill={task.color || "hsl(var(--primary))"}
        stroke="hsl(var(--border))"
        strokeWidth="2"
        className="transition-all duration-150 group-hover:stroke-hsl(var(--ring)) group-hover:stroke-2 group-active:scale-95"
      />
      <text
        y={radius / 4} // Adjust for better vertical centering
        textAnchor="middle"
        fontSize="10px"
        fill="hsl(var(--primary-foreground))"
        className="font-semibold select-none"
      >
        {task.globalSequence}
      </text>
      {/* Tooltip-like text on hover - basic example. Could use ShadCN Tooltip for richer experience if SVG tooltip is problematic */}
      <title>{`Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${task.DataHora}`}</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
