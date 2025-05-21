
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
        stroke="hsl(var(--card-foreground))" 
        strokeWidth="2" // Ajustado para 2
        className="transition-all duration-150 group-hover:stroke-hsl(var(--ring)) group-hover:stroke-[2.5px] group-active:scale-95" // stroke-[2.5px] para hover
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
      <title>{`Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${task.DataHora}`}</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
