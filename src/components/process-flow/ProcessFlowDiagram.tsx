
"use client";

import type { ProcessedAndamento, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import { ProcessFlowLegend } from './ProcessFlowLegend'; // Importar a legenda
import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[]; 
  connections: Connection[]; 
  svgWidth: number; 
  svgHeight: number; 
  laneMap: Map<string, number>; 
}

export function ProcessFlowDiagram({ tasks, connections, svgWidth, svgHeight, laneMap }: ProcessFlowDiagramProps) {
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

  const getPathDefinition = (conn: Connection): string => {
    const { sourceTask: s, targetTask: t } = conn;
    const sRadius = s.nodeRadius || 18; 
    const tRadius = t.nodeRadius || 18;

    if (s.Unidade.IdUnidade !== t.Unidade.IdUnidade) {
      const startX = s.x + (s.x < t.x ? sRadius : -sRadius);
      const startY = s.y;
      const endX = t.x - (s.x < t.x ? tRadius : -tRadius);
      const endY = t.y;

      const minControlOffset = 20;
      const idealControlOffset = Math.abs(endX - startX) * 0.4;
      const controlXOffset = Math.max(minControlOffset, idealControlOffset);
      
      const controlX1 = startX + (s.x < t.x ? controlXOffset : -controlXOffset);
      const controlY1 = startY;
      const controlX2 = endX - (s.x < t.x ? controlXOffset : -controlXOffset);
      const controlY2 = endY;   
      
      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

    } else { 
      const sourceXEdge = s.x < t.x ? s.x + sRadius : s.x - sRadius;
      const targetXEdge = s.x < t.x ? t.x - tRadius : t.x + tRadius;
      
      if (s.x <= t.x) {
        return `M ${sourceXEdge} ${s.y} L ${targetXEdge} ${t.y}`;
      } else { 
        return `M ${s.x} ${s.y} L ${t.x} ${t.y}`;
      }
    }
  };
  
  const laneEntries = Array.from(laneMap.entries());

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col flex-grow">
      <ScrollArea className="w-full rounded-t-md border flex-grow bg-card shadow-inner">
        <div style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
          <svg 
            width={svgWidth} 
            height={svgHeight} 
            xmlns="http://www.w3.org/2000/svg"
            className="bg-background"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="8"      
                refY="3.5"    
                orient="auto"  
                markerUnits="strokeWidth" 
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>

            {laneEntries.map(([sigla, yPos]) => (
              <text
                key={`lane-label-${sigla}`}
                x="15"
                y={yPos}
                dy=".3em"
                fontSize="13px"
                fill="hsl(var(--muted-foreground))"
                className="font-semibold" 
              >
                {sigla}
              </text>
            ))}

            {connections.map((conn) => (
              <path
                key={`conn-${conn.sourceTask.IdAndamento}-${conn.targetTask.IdAndamento}-${conn.sourceTask.globalSequence}-${conn.targetTask.globalSequence}`}
                d={getPathDefinition(conn)}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2" 
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            ))}

            {tasks.map((task) => (
              <TaskNode
                key={`${task.IdAndamento}-${task.globalSequence}`}
                task={task}
                onTaskClick={handleTaskClick}
              />
            ))}
          </svg>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <ProcessFlowLegend /> {/* Adicionar a legenda aqui */}

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
