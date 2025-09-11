
"use client";

import type { ProcessedAndamento, Connection, LoginCredentials, Documento } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { VERTICAL_LANE_SPACING } from '@/lib/process-flow-utils'; 
import { ProcessTimelineBar } from './ProcessTimelineBar';

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[];
  connections: Connection[];
  svgWidth: number;
  svgHeight: number;
  laneMap: Map<string, number>;
  taskToScrollTo?: ProcessedAndamento | null;
  loginCredentials: LoginCredentials | null;
  isAuthenticated: boolean;
  selectedUnidadeFiltro: string | undefined;
  processNumber?: string;
  documents?: Documento[] | null;
  isLoadingDocuments?: boolean;
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
  selectedUnidadeFiltro,
  processNumber,
  documents,
  isLoadingDocuments,
}: ProcessFlowDiagramProps) {
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const laneEntries = Array.from(laneMap.entries());
  const LANE_LABEL_AREA_WIDTH = 150;
  
  // Função para quebrar texto longo em múltiplas linhas
  const breakLongText = (text: string, maxLength: number = 12): string[] => {
    if (text.length <= maxLength) return [text];
    
    // Primeiro, tentar quebrar por '/' para preservar identificação das siglas
    if (text.includes('/')) {
      const parts = text.split('/');
      const lines: string[] = [];
      let currentLine = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const separator = i === 0 ? '' : '/';
        const newContent = currentLine + separator + part;
        
        if (newContent.length <= maxLength || currentLine === '') {
          currentLine = newContent;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = separator + part;
        }
      }
      
      if (currentLine) lines.push(currentLine);
      
      // Verificar se alguma linha ainda está muito longa
      return lines.flatMap(line => {
        if (line.length <= maxLength) return line;
        // Se ainda muito longo, quebrar por espaços/hífens
        const words = line.split(/[\s-]/);
        const subLines: string[] = [];
        let subLine = '';
        
        for (const word of words) {
          if (subLine.length + word.length + 1 <= maxLength || subLine === '') {
            subLine += (subLine && !subLine.endsWith('/') ? ' ' : '') + word;
          } else {
            if (subLine) subLines.push(subLine);
            subLine = word;
          }
        }
        
        if (subLine) subLines.push(subLine);
        return subLines.length > 0 ? subLines : [line];
      });
    }
    
    // Fallback: quebrar por espaços/hífens como antes
    const words = text.split(/[\s-]/);
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    
    // Se ainda estiver muito longo, força quebra por caracteres
    return lines.flatMap(line => {
      if (line.length <= maxLength) return line;
      const chunks = [];
      for (let i = 0; i < line.length; i += maxLength - 1) {
        chunks.push(line.slice(i, i + maxLength - 1) + (i + maxLength - 1 < line.length ? '-' : ''));
      }
      return chunks;
    });
  }; 

  useEffect(() => {
    if (taskToScrollTo && viewportRef.current) {
      const viewport = viewportRef.current;
      const targetScrollLeft = LANE_LABEL_AREA_WIDTH + taskToScrollTo.x - (viewport.offsetWidth / 2);
      const targetScrollTop = taskToScrollTo.y - (viewport.offsetHeight / 2) + 50; // +50px offset to account for timeline bar

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
    const target = e.target as HTMLElement;
    const targetTagName = target.tagName.toLowerCase();
    
    // Não interceptar cliques em elementos interativos (nodos clicáveis)
    const isInteractiveElement = target.closest('.cursor-pointer') || 
                                target.classList.contains('cursor-pointer');
    
    if (viewportRef.current && e.button === 0 && !isInteractiveElement && 
        (targetTagName === 'svg' || target.dataset.diagramRoot)) { 
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
      });
      if (target.dataset.diagramRoot) {
        target.style.cursor = 'grabbing';
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
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }
  
  const TOP_PADDING = 20; // Space for the top date labels
  const TIMELINE_HEIGHT = 65; // Height of the timeline bar
  const DIAGRAM_TOP_OFFSET = TIMELINE_HEIGHT; // The diagram starts right after the timeline

  return (
    <div className="h-full flex flex-col flex-grow w-full">
      <ScrollArea
        className="w-full rounded-md border flex-grow bg-card shadow-inner overflow-hidden"
        viewportRef={viewportRef}
      >
        <div
          data-diagram-root 
          style={{
            width: svgWidth + LANE_LABEL_AREA_WIDTH, 
            height: svgHeight + DIAGRAM_TOP_OFFSET + TOP_PADDING,
            position: 'relative', 
            cursor: 'grab', 
            paddingTop: `${TOP_PADDING}px`,
          }}
          onMouseDown={handleMouseDown} 
        >
          {/* Sticky Lane Labels */}
          <div
            style={{
              position: 'sticky', 
              left: 0,
              top: DIAGRAM_TOP_OFFSET, // Align with the start of the SVG lanes
              width: `${LANE_LABEL_AREA_WIDTH}px`,
              height: `${svgHeight}px`, 
              zIndex: 10, 
              pointerEvents: 'none', 
              backgroundColor: 'hsl(var(--card))', 
            }}
          >
            {laneEntries.map(([sigla, yPos]) => {
              const textLines = breakLongText(sigla);
              
              return (
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
                  <div className="flex flex-col justify-center leading-tight">
                    {textLines.map((line, index) => (
                      <span key={index} className="block">
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Horizontal Timeline Bar */}
          <div 
             style={{
                position: 'absolute',
                top: 0,
                left: `${LANE_LABEL_AREA_WIDTH}px`,
                width: `${svgWidth}px`,
                height: `${TIMELINE_HEIGHT}px`,
                zIndex: 5, // Below node tooltips, above connections
             }}
          >
            <ProcessTimelineBar tasks={tasks} svgWidth={svgWidth} />
          </div>

          {/* SVG Diagram */}
          <svg
            width={svgWidth} 
            height={svgHeight}
            xmlns="http://www.w3.org/2000/svg"
            className="bg-background" 
            style={{
              position: 'absolute', 
              left: `${LANE_LABEL_AREA_WIDTH}px`, 
              top: `${DIAGRAM_TOP_OFFSET}px`, // Position below timeline
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

            {/* Linhas divisórias entre raias */}
            {laneEntries.map(([sigla, yPos], index) => {
              // Não desenhar linha após a última raia
              if (index === laneEntries.length - 1) return null;
              
              const nextYPos = laneEntries[index + 1][1];
              const lineY = yPos + (nextYPos - yPos) / 2;
              
              return (
                <line
                  key={`lane-divider-${sigla}`}
                  x1="0"
                  y1={lineY}
                  x2={svgWidth}
                  y2={lineY}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  opacity="0.3"
                />
              );
            })}

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
        selectedUnidadeFiltro={selectedUnidadeFiltro}
        processNumber={processNumber}
        documents={documents}
        isLoadingDocuments={isLoadingDocuments}
      />
    </div>
  );
}
