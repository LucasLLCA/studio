
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

    // If units are different (inter-unit handoff), draw a curved line
    if (s.Unidade.IdUnidade !== t.Unidade.IdUnidade) {
      const startX = s.x + (s.x < t.x ? sRadius : -sRadius); // Emerge from the side facing the target
      const startY = s.y;
      const endX = t.x - (s.x < t.x ? tRadius : -tRadius); // Arrive on the side facing the source
      const endY = t.y;

      // Control points for cubic Bezier curve to make an S-shape
      // The horizontal offset for control points ensures the curve starts and ends horizontally.
      // We use a fraction of the horizontal distance between the nodes for the control point offset.
      const minControlOffset = 20; // Minimum horizontal reach of control points
      const idealControlOffset = Math.abs(endX - startX) * 0.4;
      const controlXOffset = Math.max(minControlOffset, idealControlOffset);
      
      const controlX1 = startX + (s.x < t.x ? controlXOffset : -controlXOffset);
      const controlY1 = startY; // Control point 1 aligned with source Y
      const controlX2 = endX - (s.x < t.x ? controlXOffset : -controlXOffset);
      const controlY2 = endY;   // Control point 2 aligned with target Y
      
      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

    } else { 
      // If units are the same (intra-unit flow), draw a straight horizontal line between node edges
      // Ensure sourceX and targetX are correctly ordered for line direction
      const sourceXEdge = s.x < t.x ? s.x + sRadius : s.x - sRadius;
      const targetXEdge = s.x < t.x ? t.x - tRadius : t.x + tRadius;
      
      // Draw line only if target is to the right of source to avoid backward lines
      // or if they are at the same x (should be rare with current layout)
      if (s.x <= t.x) {
        return `M ${sourceXEdge} ${s.y} L ${targetXEdge} ${t.y}`;
      } else { 
        // If target is to the left (e.g. loop or complex non-chronological link not common in this data)
        // For now, draw from center to center for these less common cases to avoid visual bugs with edges.
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
            className="bg-background" // Use background for the SVG area itself
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10" // Width of the viewport for the marker
                markerHeight="7" // Height of the viewport for the marker
                refX="8"         // Arrow tip x-coordinate in marker's viewport (relative to marker end)
                                 // Adjusted to be slightly before the full markerWidth to better align with curved paths
                refY="3.5"       // Arrow tip y-coordinate (center of markerHeight)
                orient="auto"    // Automatically orient the marker along the path
                markerUnits="strokeWidth" // Scale marker with stroke width (optional, can be userSpaceOnUse)
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>

            {/* Lane Labels */}
            {laneEntries.map(([sigla, yPos]) => (
              <text
                key={`lane-label-${sigla}`}
                x="15"  // Position from the left edge
                y={yPos}
                dy=".3em" // Vertical alignment adjustment
                fontSize="13px"
                fill="hsl(var(--muted-foreground))"
                className="font-semibold" 
              >
                {sigla}
              </text>
            ))}

            {/* Connections (Paths/Lines) */}
            {connections.map((conn) => (
              <path
                key={`conn-${conn.sourceTask.IdAndamento}-${conn.targetTask.IdAndamento}-${conn.sourceTask.globalSequence}-${conn.targetTask.globalSequence}`}
                d={getPathDefinition(conn)}
                stroke="hsl(var(--muted-foreground))" // Color for the lines
                strokeWidth="2" 
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            ))}

            {/* Task Nodes */}
            {tasks.map((task) => (
              <TaskNode
                key={`${task.IdAndamento}-${task.globalSequence}`} // Ensure unique key if IdAndamento could repeat
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
