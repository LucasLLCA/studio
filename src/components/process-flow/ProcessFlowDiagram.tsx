
"use client";

import type { ProcessedAndamento, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import { ProcessFlowLegend } from './ProcessFlowLegend';
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { VERTICAL_LANE_SPACING, INITIAL_X_OFFSET } from '@/lib/process-flow-utils'; 

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[];
  connections: Connection[];
  svgWidth: number;
  svgHeight: number;
  laneMap: Map<string, number>;
  taskToScrollTo?: ProcessedAndamento | null;
}

export function ProcessFlowDiagram({ 
  tasks, 
  connections, 
  svgWidth, 
  svgHeight, 
  laneMap,
  taskToScrollTo 
}: ProcessFlowDiagramProps) {
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const laneEntries = Array.from(laneMap.entries());
  const LANE_LABEL_AREA_WIDTH = 150; // Width for the sticky lane labels

  useEffect(() => {
    if (taskToScrollTo && viewportRef.current) {
      const viewport = viewportRef.current;
      // Calculate target scroll positions to center the task
      // taskToScrollTo.x is relative to the SVG's origin.
      // The SVG's visible area in the viewport needs to be considered.
      
      // Target X to center the node in the *scrollable SVG area*:
      // scrollLeft should be task.x - half_viewport_width_of_svg_area
      const targetScrollLeft = taskToScrollTo.x - (viewport.offsetWidth / 2) + (INITIAL_X_OFFSET / 2);
      
      // Target Y to center the node vertically in the viewport
      const targetScrollTop = taskToScrollTo.y - (viewport.offsetHeight / 2);

      viewport.scrollTo({
        left: Math.max(0, targetScrollLeft), // Ensure not scrolling to negative values
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }
  }, [taskToScrollTo]);


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

    // If tasks are in different units (lanes), draw a bezier curve
    if (s.Unidade.IdUnidade !== t.Unidade.IdUnidade) { 
      const startX = s.x; 
      const startY = s.y;
      const endX = t.x;   
      const endY = t.y;
      
      const dx = endX - startX;
      // Control points for a C-shaped curve (horizontal first, then vertical, then horizontal)
      const controlX1 = startX + dx * 0.5; 
      const controlY1 = startY;             
      const controlX2 = endX - dx * 0.5;   
      const controlY2 = endY;               

      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
    } else { // If tasks are in the same unit, draw a straight horizontal line
      // Adjust start and end points to be at the edge of the circles
      const sourceXEdge = s.x < t.x ? s.x + sRadius : s.x - sRadius;
      const targetXEdge = s.x < t.x ? t.x - tRadius : t.x + tRadius;
      return `M ${sourceXEdge} ${s.y} L ${targetXEdge} ${t.y}`;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Only activate dragging for the main mouse button (left-click)
    // and if the click is directly on the diagram root, not on a task node (g element)
    // or other interactive elements within the SVG.
    const targetTagName = (e.target as HTMLElement).tagName.toLowerCase();
    if (viewportRef.current && e.button === 0 && (targetTagName === 'svg' || targetTagName === 'div' && (e.target as HTMLElement).dataset.diagramRoot)) { 
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
      });
      // Change cursor on the specific element that handles dragging
      if ((e.target as HTMLElement).dataset.diagramRoot) {
        (e.target as HTMLElement).style.cursor = 'grabbing';
      } else if (targetTagName === 'svg') {
         // If direct click on SVG, its parent (data-diagram-root) might be better for cursor
        const diagramRoot = viewportRef.current?.querySelector('[data-diagram-root]') as HTMLElement | null;
        if (diagramRoot) diagramRoot.style.cursor = 'grabbing';
      }
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
        // Reset cursor on the diagram root element
        if (diagramRootElement) {
          diagramRootElement.style.cursor = 'grab';
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      // Also listen for mouseleave on the document to stop dragging if mouse leaves window
      document.addEventListener('mouseleave', handleMouseUpGlobal); 
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      document.removeEventListener('mouseleave', handleMouseUpGlobal);
    };
  }, [isDragging, dragStart]);


  if (tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col flex-grow">
      <ProcessFlowLegend />
      <ScrollArea
        className="w-full rounded-md border flex-grow bg-card shadow-inner overflow-hidden mt-4"
        viewportRef={viewportRef} // Pass ref to ScrollArea's viewport
      >
        <div
          data-diagram-root // Add data attribute for specific targeting
          style={{
            width: svgWidth + LANE_LABEL_AREA_WIDTH, // Total width includes lane labels
            height: svgHeight,
            position: 'relative', // For sticky positioning of labels
            cursor: 'grab', // Initial cursor for dragging
          }}
          onMouseDown={handleMouseDown} // Attach mouse down directly here
        >
          {/* Fixed Lane Labels Container */}
          <div
            style={{
              position: 'sticky', // Makes labels stick to the left
              left: 0,
              width: `${LANE_LABEL_AREA_WIDTH}px`,
              height: `${svgHeight}px`, // Match SVG height
              zIndex: 10, // Ensure labels are on top
              pointerEvents: 'none', // Allow clicks to pass through to the diagram for dragging
              backgroundColor: 'hsl(var(--card))', // Background for opacity over SVG
            }}
          >
            {laneEntries.map(([sigla, yPos]) => (
              <div
                key={`lane-label-${sigla}`}
                className="flex items-center pl-4 pr-2 text-sm font-semibold text-muted-foreground"
                style={{
                  position: 'absolute', // Position within the sticky container
                  top: `${yPos - (VERTICAL_LANE_SPACING / 2)}px`, // Center vertically in its lane space
                  height: `${VERTICAL_LANE_SPACING}px`,
                  width: '100%',
                  borderRight: '1px solid hsl(var(--border))', // Visual separator
                  boxSizing: 'border-box',
                }}
              >
                {sigla}
              </div>
            ))}
          </div>

          {/* SVG Diagram - Positioned next to the lane labels */}
          <svg
            width={svgWidth} 
            height={svgHeight}
            xmlns="http://www.w3.org/2000/svg"
            className="bg-background" 
            style={{
              position: 'absolute', // Position relative to data-diagram-root
              left: `${LANE_LABEL_AREA_WIDTH}px`, // Offset by lane label width
              top: 0,
              display: 'block', // Prevents extra space below SVG
            }}
            // onMouseDown should be on the parent div for better drag control
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9" // Adjusted for better arrow tip alignment
                refY="3.5"
                orient="auto-start-reverse" // Ensures arrow orients with line direction
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>

            {/* Render Connections */}
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

            {/* Render Task Nodes */}
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

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
