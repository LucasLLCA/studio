
"use client";

import type { ProcessedAndamento, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import { ProcessFlowLegend } from './ProcessFlowLegend';
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { VERTICAL_LANE_SPACING } from '@/lib/process-flow-utils'; // Import for consistent spacing

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

  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const laneEntries = Array.from(laneMap.entries());
  const LANE_LABEL_AREA_WIDTH = 150; // Increased width for lane labels

  const handleTaskClick = (task: ProcessedAndamento) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const getPathDefinition = (conn: Connection): string => {
    const { sourceTask: s, targetTask: t } = conn;
    const sRadius = s.nodeRadius || 18;
    const tRadius = t.nodeRadius || 18;

    if (s.Unidade.IdUnidade !== t.Unidade.IdUnidade) { // Different lanes (units) - Curved path
      const startX = s.x; // Use center of node
      const startY = s.y;
      const endX = t.x;   // Use center of node
      const endY = t.y;

      // Control points for Bezier curve
      // Make curves more pronounced if X distance is small, or Y distance is large
      const dx = endX - startX;
      // const dy = endY - startY;
      
      // Adjusted control point logic for better curves
      const controlX1 = startX + dx * 0.5; // Midpoint X for smoother horizontal transition start
      const controlY1 = startY;             // Keep Y same as source for horizontal start of curve
      const controlX2 = endX - dx * 0.5;   // Midpoint X for smoother horizontal transition end
      const controlY2 = endY;               // Keep Y same as target for horizontal end of curve

      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
    } else { // Same lane (unit) - Straight horizontal line
      // Connect from edge to edge of nodes
      const sourceXEdge = s.x < t.x ? s.x + sRadius : s.x - sRadius;
      const targetXEdge = s.x < t.x ? t.x - tRadius : t.x + tRadius;
      return `M ${sourceXEdge} ${s.y} L ${targetXEdge} ${t.y}`;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (viewportRef.current && e.button === 0) { // Only main left click
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
      });
      e.currentTarget.style.cursor = 'grabbing';
      e.preventDefault(); 
    }
  };

  useEffect(() => {
    const diagramRootElement = viewportRef.current?.querySelector('[data-diagram-root]') as HTMLElement | null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !viewportRef.current) return;
      e.preventDefault();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      viewportRef.current.scrollLeft = dragStart.scrollLeft - dx;
      viewportRef.current.scrollTop = dragStart.scrollTop - dy;
    };

    const handleMouseUpGlobal = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        if (diagramRootElement) {
          diagramRootElement.style.cursor = 'grab';
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUpGlobal);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isDragging, dragStart]);


  if (tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col flex-grow">
      <ScrollArea
        className="w-full rounded-t-md border flex-grow bg-card shadow-inner overflow-hidden"
        viewportRef={viewportRef}
      >
        <div
          data-diagram-root
          style={{
            width: svgWidth + LANE_LABEL_AREA_WIDTH, // Total width for scrolling
            height: svgHeight,
            position: 'relative',
            cursor: 'grab',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Fixed Lane Labels Container */}
          <div
            style={{
              position: 'sticky',
              left: 0,
              width: `${LANE_LABEL_AREA_WIDTH}px`,
              height: `${svgHeight}px`, // Match the SVG height for consistent sticky behavior
              zIndex: 10,
              pointerEvents: 'none', // Allow mousedown to pass to parent for dragging
              backgroundColor: 'hsl(var(--card))', // Opaque background
            }}
          >
            {laneEntries.map(([sigla, yPos]) => (
              <div
                key={`lane-label-${sigla}`}
                className="flex items-center pl-4 pr-2 text-sm font-semibold text-muted-foreground"
                style={{
                  position: 'absolute', // Position within the sticky container
                  top: `${yPos - (VERTICAL_LANE_SPACING / 2)}px`, // Align with the center of the SVG lane
                  height: `${VERTICAL_LANE_SPACING}px`,
                  width: '100%',
                  borderRight: '1px solid hsl(var(--border))', // Visual separation from SVG
                  boxSizing: 'border-box',
                }}
              >
                {sigla}
              </div>
            ))}
          </div>

          {/* SVG Diagram - Positioned next to the lane labels */}
          <svg
            width={svgWidth} // Actual drawing width
            height={svgHeight}
            xmlns="http://www.w3.org/2000/svg"
            className="bg-background" // Background for the SVG drawing area
            style={{
              position: 'absolute',
              left: `${LANE_LABEL_AREA_WIDTH}px`,
              top: 0,
              display: 'block', // Prevents extra space issues
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9" // Adjusted for better arrow appearance on curves
                refY="3.5"
                orient="auto-start-reverse" // Better orientation for various line angles
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>

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

      <ProcessFlowLegend />
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
