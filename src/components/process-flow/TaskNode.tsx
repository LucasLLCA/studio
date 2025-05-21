
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import React from 'react';

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
  // radius prop é removida, pois task.nodeRadius será usado
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick }) => {
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  const radius = task.nodeRadius || 18; // Usar o raio do objeto task, com fallback

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
        stroke="hsl(var(--card-foreground))" // Contraste melhor com o nó
        strokeWidth="2.5" // Borda mais espessa
        className="transition-all duration-150 group-hover:stroke-hsl(var(--ring)) group-hover:stroke-2 group-active:scale-95"
      />
      <text
        y={radius * 0.25} // Ajustado para o novo raio (ex: 18 * 0.25 = 4.5)
        textAnchor="middle"
        fontSize={radius * 0.6} // Tamanho da fonte proporcional ao raio (ex: 18 * 0.6 = ~11px)
        fontWeight="bold" // Texto mais nítido
        fill="hsl(var(--primary-foreground))" 
        className="select-none"
      >
        {task.globalSequence}
      </text>
      {/* Tooltip-like text on hover - SVG title é uma forma simples */}
      <title>{`Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${task.DataHora}`}</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
