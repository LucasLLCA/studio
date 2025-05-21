
"use client";

import type { ProcessedAndamento, ProcessedFlowData, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ProcessFlowDiagramProps {
  processedData: ProcessedFlowData;
}

const NODE_RADIUS = 15;
const CURVE_CONTROL_OFFSET_X = 60; // Controls the "S" shape of curves

export function ProcessFlowDiagram({ processedData }: ProcessFlowDiagramProps) {
  const { tasks, connections, svgWidth, svgHeight, laneMap } = processedData;
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

    // Path from right edge of source node to left edge of target node for horizontal
    // For curves, connect centers and let nodes draw on top.
    if (s.y === t.y) { // Same lane, horizontal line
      return `M ${s.x + NODE_RADIUS} ${s.y} L ${t.x - NODE_RADIUS} ${t.y}`;
    } else { // Different lanes, curved line (cubic Bezier)
      const controlX1 = s.x + CURVE_CONTROL_OFFSET_X;
      const controlY1 = s.y;
      const controlX2 = t.x - CURVE_CONTROL_OFFSET_X;
      const controlY2 = t.y;
      return `M ${s.x} ${s.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${t.x} ${t.y}`;
    }
  };
  
  const laneEntries = Array.from(laneMap.entries());

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
      <ScrollArea className="w-full rounded-md border flex-grow">
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
                refX="9" // Adjust to position arrowhead at the end of the line (considering stroke-width)
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
              </marker>
            </defs>

            {/* Render Lane Labels */}
            {laneEntries.map(([sigla, yPos]) => (
              <text
                key={`lane-label-${sigla}`}
                x="10" // Small padding from the left edge
                y={yPos}
                dy=".3em" // Vertical alignment adjustment
                fontSize="12px"
                fill="hsl(var(--muted-foreground))"
                className="font-medium"
              >
                {sigla}
              </text>
            ))}


            {/* Render Connections */}
            {connections.map((conn, index) => (
              <path
                key={`conn-${index}`}
                d={getPathDefinition(conn)}
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            ))}

            {/* Render Tasks (Nodes) */}
            {tasks.map((task) => (
              <TaskNode
                key={task.IdAndamento}
                task={task}
                onTaskClick={handleTaskClick}
                radius={NODE_RADIUS}
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
