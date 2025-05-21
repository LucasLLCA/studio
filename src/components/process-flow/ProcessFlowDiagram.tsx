"use client";

import type { ProcessedAndamento, Unidade, Connection } from '@/types/process-flow';
import { SwimlaneColumn } from './SwimlaneColumn';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[];
  connections: Connection[];
}

export function ProcessFlowDiagram({ tasks, connections }: ProcessFlowDiagramProps) {
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const taskNodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [svgLines, setSvgLines] = useState<JSX.Element[]>([]);
  const diagramAreaRef = useRef<HTMLDivElement>(null);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);


  const handleTaskClick = (task: ProcessedAndamento) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const { uniqueUnits, tasksByUnit } = useMemo(() => {
    const unitMap = new Map<string, Unidade>();
    const tasksByUnitMap = new Map<string, ProcessedAndamento[]>();

    tasks.forEach(task => {
      if (!unitMap.has(task.Unidade.IdUnidade)) {
        unitMap.set(task.Unidade.IdUnidade, task.Unidade);
      }
      if (!tasksByUnitMap.has(task.Unidade.IdUnidade)) {
        tasksByUnitMap.set(task.Unidade.IdUnidade, []);
      }
      tasksByUnitMap.get(task.Unidade.IdUnidade)!.push(task);
    });
    
    const sortedUniqueUnits = Array.from(unitMap.values()).sort((a, b) => {
      const firstTaskA = tasks.find(t => t.Unidade.IdUnidade === a.IdUnidade)?.globalSequence || Infinity;
      const firstTaskB = tasks.find(t => t.Unidade.IdUnidade === b.IdUnidade)?.globalSequence || Infinity;
      return firstTaskA - firstTaskB;
    });

    return { uniqueUnits: sortedUniqueUnits, tasksByUnit: tasksByUnitMap };
  }, [tasks]);

  useEffect(() => {
    if (!diagramAreaRef.current || !scrollAreaViewportRef.current || connections.length === 0 || tasks.length === 0) {
      setSvgLines([]);
      return;
    }
    
    const diagramRect = diagramAreaRef.current.getBoundingClientRect();
    // Use scrollAreaViewportRef for offset calculations if tasks are inside it
    const viewportRect = scrollAreaViewportRef.current.getBoundingClientRect();
    const scrollLeft = scrollAreaViewportRef.current.scrollLeft;
    const scrollTop = scrollAreaViewportRef.current.scrollTop;

    const newSvgLines: JSX.Element[] = [];

    connections.forEach((connection, index) => {
      const sourceNodeEl = taskNodeRefs.current.get(connection.sourceTaskId);
      const targetNodeEl = taskNodeRefs.current.get(connection.targetTaskId);

      if (sourceNodeEl && targetNodeEl) {
        const sourceRect = sourceNodeEl.getBoundingClientRect();
        const targetRect = targetNodeEl.getBoundingClientRect();
        
        const arrowOffset = 8; // For arrowhead visibility

        // Calculate positions relative to the diagramAreaRef (which is the SVG container)
        // Account for scrolling within the ScrollArea
        let x1 = sourceRect.right - viewportRect.left + scrollLeft;
        let y1 = sourceRect.top - viewportRect.top + scrollTop + sourceRect.height / 2;
        let x2 = targetRect.left - viewportRect.left + scrollLeft;
        let y2 = targetRect.top - viewportRect.top + scrollTop + targetRect.height / 2;

        // Apply offset for arrowhead
        if (x2 > x1) { // Target is to the right
            x2 -= arrowOffset;
        } else { // Target is to the left or same column (should not happen with current inter-unit logic)
            x2 += arrowOffset;
        }

        newSvgLines.push(
          <line
            key={`conn-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        );
      }
    });
    setSvgLines(newSvgLines);
  // Rerun when tasks/connections/layout might change, or on scroll
  }, [tasks, connections, uniqueUnits, isModalOpen]); 
  // Added isModalOpen as a proxy for potential layout shifts after modal closes or affects background.
  // A more robust solution might involve ResizeObserver on diagramAreaRef or scrollAreaViewportRef.


  if (tasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 relative" ref={diagramAreaRef}>
      <svg
        width="100%"
        height="100%"
        className="absolute top-0 left-0 pointer-events-none z-[5]" // Ensure SVG is behind interactive elements if needed, but above background
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="8" // Adjusted for arrowhead size and line end
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        {/* Render lines inside the SVG that's relative to diagramAreaRef */}
        {/* The lines will be drawn based on coordinates relative to the scroll viewport */}
        {/* This means the SVG itself doesn't need to be inside the scroll area, but its content is positioned as if it were */}
        <g>{svgLines}</g>
      </svg>

      <ScrollArea 
        className="w-full whitespace-nowrap rounded-md border relative z-10" // Ensure scroll area content is above SVG lines
        viewportRef={scrollAreaViewportRef} // Pass ref to ScrollArea's viewport
        onScroll={() => { // Trigger recalculation on scroll
            // Simple way to trigger re-render of lines. Consider debouncing for performance.
             useEffect(() => {
                const handleScroll = () => {
                    if (!diagramAreaRef.current || !scrollAreaViewportRef.current || connections.length === 0 || tasks.length === 0) {
                        setSvgLines([]);
                        return;
                    }
                    
                    const viewportRect = scrollAreaViewportRef.current.getBoundingClientRect();
                    const scrollLeft = scrollAreaViewportRef.current.scrollLeft;
                    const scrollTop = scrollAreaViewportRef.current.scrollTop;
                
                    const newSvgLinesRecalc: JSX.Element[] = [];
                
                    connections.forEach((connection, index) => {
                        const sourceNodeEl = taskNodeRefs.current.get(connection.sourceTaskId);
                        const targetNodeEl = taskNodeRefs.current.get(connection.targetTaskId);
                
                        if (sourceNodeEl && targetNodeEl) {
                        const sourceRect = sourceNodeEl.getBoundingClientRect();
                        const targetRect = targetNodeEl.getBoundingClientRect();
                        
                        const arrowOffset = 8; 
                
                        let x1_recalc = sourceRect.right - viewportRect.left + scrollLeft;
                        let y1_recalc = sourceRect.top - viewportRect.top + scrollTop + sourceRect.height / 2;
                        let x2_recalc = targetRect.left - viewportRect.left + scrollLeft;
                        let y2_recalc = targetRect.top - viewportRect.top + scrollTop + targetRect.height / 2;
                
                        if (x2_recalc > x1_recalc) { 
                            x2_recalc -= arrowOffset;
                        } else { 
                            x2_recalc += arrowOffset;
                        }
                
                        newSvgLinesRecalc.push(
                            <line
                            key={`conn-recalc-${index}`}
                            x1={x1_recalc}
                            y1={y1_recalc}
                            x2={x2_recalc}
                            y2={y2_recalc}
                            stroke="hsl(var(--primary))"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                            />
                        );
                        }
                    });
                    setSvgLines(newSvgLinesRecalc);
                };

                const viewportElement = scrollAreaViewportRef.current;
                if (viewportElement) {
                    viewportElement.addEventListener('scroll', handleScroll);
                }
                // Initial calculation
                handleScroll();
        
                return () => {
                    if (viewportElement) {
                        viewportElement.removeEventListener('scroll', handleScroll);
                    }
                };

            }, [tasks, connections, uniqueUnits]); // dependencies for recalculation logic
        }}
      >
        <div className="flex space-x-4 p-4 min-h-[calc(100vh-120px)] items-start">
          {uniqueUnits.map(unit => (
            <SwimlaneColumn
              key={unit.IdUnidade}
              unitSigla={unit.Sigla}
              unitDescricao={unit.Descricao}
              tasks={tasksByUnit.get(unit.IdUnidade) || []}
              onTaskClick={handleTaskClick}
              taskNodeRefs={taskNodeRefs}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
