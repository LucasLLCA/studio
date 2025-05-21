
"use client";

import type { ProcessedAndamento, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[]; // Now receives paginated tasks
  connections: Connection[]; // Now receives filtered connections for the current page
  svgWidth: number; // Global SVG width for the entire dataset
  svgHeight: number; // Global SVG height
  laneMap: Map<string, number>; // Global lane map
}

const CURVE_CONTROL_OFFSET_X = 70; 

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

  if (tasks.length === 0 && connections.length === 0) { // Check if there are any tasks on the current page
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir nesta página.</p>;
  }

  const getPathDefinition = (conn: Connection): string => {
    const { sourceTask: s, targetTask: t } = conn;
    const sRadius = s.nodeRadius || 18; 
    const tRadius = t.nodeRadius || 18;

    if (s.y === t.y) { 
      return `M ${s.x + sRadius} ${s.y} L ${t.x - tRadius} ${t.y}`;
    } else { 
      const controlX1 = s.x + CURVE_CONTROL_OFFSET_X;
      const controlY1 = s.y;
      const controlX2 = t.x - CURVE_CONTROL_OFFSET_X;
      const controlY2 = t.y;
      return `M ${s.x} ${s.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${t.x} ${t.y}`;
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

            {/* Render Lane Labels using the global laneMap */}
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

            {/* Render Connections for the current page */}
            {connections.map((conn, index) => (
              <path
                key={`conn-${conn.sourceTask.IdAndamento}-${conn.targetTask.IdAndamento}`}
                d={getPathDefinition(conn)}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2" 
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            ))}

            {/* Render Tasks (Nodes) for the current page */}
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
