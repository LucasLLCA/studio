
"use client";

import type { ProcessedAndamento, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
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

    // If units are different (inter-unit handoff), draw a straight diagonal line
    if (s.Unidade.IdUnidade !== t.Unidade.IdUnidade) {
      // Draw straight line from center to center
      return `M ${s.x} ${s.y} L ${t.x} ${t.y}`;
    } else { 
      // If units are the same (intra-unit flow), draw a straight horizontal line between node edges
      const sourceX = s.x < t.x ? s.x + sRadius : s.x - sRadius;
      const targetX = s.x < t.x ? t.x - tRadius : t.x + tRadius;
      // Ensure line is drawn only if target is to the right of source to avoid backward lines for simple sequence
      if (s.x < t.x) {
        return `M ${sourceX} ${s.y} L ${targetX} ${t.y}`;
      } else { // If target is to the left (e.g. data error or complex non-chronological link not yet supported by this rule)
        // For now, let's still draw it, but this might need more sophisticated handling for specific cases.
        // Or, if we strictly enforce chronological X, this "else" might not be hit often for intra-unit.
        // Let's draw from center to center for any non-standard horizontal to avoid visual bugs.
         return `M ${s.x} ${s.y} L ${t.x} ${t.y}`;
      }
    }
  };
  
  const laneEntries = Array.from(laneMap.entries());

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col flex-grow">
      <ScrollArea className="w-full rounded-md border flex-grow bg-card shadow-inner">
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
                refX="9.5" 
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
                key={task.IdAndamento}
                task={task}
                onTaskClick={handleTaskClick}
              />
            ))}
          </svg>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
