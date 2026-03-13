
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import React from 'react';
import { formatDisplayDate, MARKER_COLORS } from '@/lib/process-flow-utils';
import { extractDocumentNumber } from '@/lib/document-extraction';

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
  hideSequence?: boolean;
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick, hideSequence = false }) => {
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  const radius = task.nodeRadius || 18;
  const showDaysOpenLabel = typeof task.daysOpen === 'number' && task.daysOpen >= 0 && !task.isSummaryNode;

  const extractableDocument = extractDocumentNumber(task.Descricao);
  const hasDocument = extractableDocument !== null;

  // Marker positioning
  const markerX = radius * 0.7;
  const markerY = -radius * 0.7;

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
        style={{
          transition: "all 0.15s ease-in-out",
          cursor: "pointer"
        }}
        className="group-hover:stroke-hsl(var(--ring)) group-hover:stroke-[2.5px] group-active:scale-95"
      />
      {task.isSummaryNode && task.groupedTasksCount ? (
        <text
          y={radius * 0.25}
          textAnchor="middle"
          fontSize={radius * 0.5}
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
          {hideSequence ? '?' : task.globalSequence}
        </text>
      )}

      {/* Document indicator */}
      {hasDocument && (
        <circle
          r={radius / 4}
          cx={markerX}
          cy={markerY}
          fill={MARKER_COLORS.document.fill}
          stroke={MARKER_COLORS.document.stroke}
          strokeWidth="1"
          style={{ pointerEvents: 'none' }}
        />
      )}

      <title>{
        task.isSummaryNode ?
        `${task.groupedTasksCount} ações diversas em ${task.Unidade.Sigla}\nInício em: ${formatDisplayDate(task.parsedDate)}${hasDocument ? '\n🔍 Possui documento para resumo' : ''}` :
        `Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${formatDisplayDate(task.parsedDate)}\nDias Aberto: ${task.daysOpen ?? 'N/A'}${hasDocument ? `\n🔍 Documento: ${extractableDocument}` : ''}`
      }</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
