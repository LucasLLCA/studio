
"use client";

import type { ProcessedAndamento, Connection, LoginCredentials } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
// ProcessFlowLegend is no longer imported/used here, dialog is in page.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
// Buttons and icons for diagram controls are removed as they are now in page.tsx
import { VERTICAL_LANE_SPACING } from '@/lib/process-flow-utils'; 

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[];
  connections: Connection[];
  svgWidth: number;
  svgHeight: number;
  laneMap: Map<string, number>;
  taskToScrollTo?: ProcessedAndamento | null;
  // onScrollToFirstTask and onScrollToLastTask are removed
  loginCredentials: LoginCredentials | null; // Still needed for TaskDetailsModal
  isAuthenticated: boolean; // Still needed for TaskDetailsModal
}

export function ProcessFlowDiagram({ 
  tasks, 
  connections, 
  svgWidth, 
  svgHeight, 
  laneMap,
  taskToScrollTo,
  loginCredentials,
  isAuthenticated,
}: ProcessFlowDiagramProps) {
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  // isLegendModalOpen and setIsLegendModalOpen are removed

  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const laneEntries = Array.from(laneMap.entries());
  const LANE_LABEL_AREA_WIDTH = 150; 

  useEffect(() => {
    if (taskToScrollTo && viewportRef.current) {
      const viewport = viewportRef.current;
      const targetScrollLeft = LANE_LABEL_AREA_WIDTH + taskToScrollTo.x - (viewport.offsetWidth / 2);
      const targetScrollTop = taskToScrollTo.y - (viewport.offsetHeight / 2);

      viewport.scrollTo({
        left: Math.max(0, targetScrollLeft),
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }
  }, [taskToScrollTo, LANE_LABEL_AREA_WIDTH]);


  const handleTaskClick = (task: ProcessedAndamento) => {
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTask(null);
  };

  const getPathDefinition = (conn: Connection): string => {
    const { sourceTask: s, targetTask: t } = conn;
    const sRadius = s.nodeRadius || 18;
    const tRadius = t.nodeRadius || 18;

    if (s.Unidade.IdUnidade !== t.Unidade.IdUnidade) { 
      const startX = s.x; 
      const startY = s.y;
      const endX = t.x;   
      const endY = t.y;
      
      const dx = endX - startX;
      const controlX1 = startX + dx * 0.5; 
      const controlY1 = startY;             
      const controlX2 = endX - dx * 0.5;   
      const controlY2 = endY;               

      return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
    } else { 
      const sourceXEdge = s.x < t.x ? s.x + sRadius : s.x - sRadius;
      const targetXEdge = s.x < t.x ? t.x - tRadius : t.x + tRadius;
      return `M ${sourceXEdge} ${s.y} L ${targetXEdge} ${t.y}`;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const targetTagName = (e.target as HTMLElement).tagName.toLowerCase();
    if (viewportRef.current && e.button === 0 && (targetTagName === 'svg' || (targetTagName === 'div' && (e.target as HTMLElement).dataset.diagramRoot))) { 
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
      });
      if ((e.target as HTMLElement).dataset.diagramRoot) {
        (e.target as HTMLElement).style.cursor = 'grabbing';
      } else if (targetTagName === 'svg') {
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
        if (diagramRootElement) {
          diagramRootElement.style.cursor = 'grab';
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      document.addEventListener('mouseleave', handleMouseUpGlobal); 
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      document.removeEventListener('mouseleave', handleMouseUpGlobal);
    };
  }, [isDragging, dragStart]);


  if (tasks.length === 0) {
    // This case should be handled by page.tsx before rendering this component
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }

  return (
    <div className="h-full flex flex-col flex-grow w-full">
      {/* Control buttons are removed from here and are now in page.tsx */}
      <ScrollArea
        className="w-full rounded-md border flex-grow bg-card shadow-inner overflow-hidden mt-0" // mt-2 removed
        viewportRef={viewportRef}
      >
        <div
          data-diagram-root 
          style={{
            width: svgWidth + LANE_LABEL_AREA_WIDTH, 
            height: svgHeight,
            position: 'relative', 
            cursor: 'grab', 
          }}
          onMouseDown={handleMouseDown} 
        >
          <div
            style={{
              position: 'sticky', 
              left: 0,
              width: `${LANE_LABEL_AREA_WIDTH}px`,
              height: `${svgHeight}px`, 
              zIndex: 10, 
              pointerEvents: 'none', 
              backgroundColor: 'hsl(var(--card))', 
            }}
          >
            {laneEntries.map(([sigla, yPos]) => (
              <div
                key={`lane-label-${sigla}`}
                className="flex items-center pl-4 pr-2 text-sm font-semibold text-muted-foreground"
                style={{
                  position: 'absolute', 
                  top: `${yPos - (VERTICAL_LANE_SPACING / 2)}px`, 
                  height: `${VERTICAL_LANE_SPACING}px`,
                  width: '100%',
                  borderRight: '1px solid hsl(var(--border))', 
                  boxSizing: 'border-box',
                }}
              >
                {sigla}
              </div>
            ))}
          </div>

          <svg
            width={svgWidth} 
            height={svgHeight}
            xmlns="http://www.w3.org/2000/svg"
            className="bg-background" 
            style={{
              position: 'absolute', 
              left: `${LANE_LABEL_AREA_WIDTH}px`, 
              top: 0,
              display: 'block', 
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9" 
                refY="3.5"
                orient="auto-start-reverse" 
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

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        loginCredentials={loginCredentials}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}

    