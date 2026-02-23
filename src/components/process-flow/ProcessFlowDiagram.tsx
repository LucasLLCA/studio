
"use client";

import type { ProcessedAndamento, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { VERTICAL_LANE_SPACING, detectPartialDataGap } from '@/lib/process-flow-utils';
import { ProcessTimelineBar } from './ProcessTimelineBar';
import { useProcessContext } from '@/contexts/process-context';

interface ProcessFlowDiagramProps {
  tasks: ProcessedAndamento[];
  connections: Connection[];
  svgWidth: number;
  svgHeight: number;
  laneMap: Map<string, number>;
  taskToScrollTo?: ProcessedAndamento | null;
  filteredLaneUnits?: string[];
  isPartialData?: boolean;
}

export function ProcessFlowDiagram({
  tasks,
  connections,
  svgWidth,
  svgHeight,
  laneMap,
  taskToScrollTo,
  filteredLaneUnits = [],
  isPartialData = false,
}: ProcessFlowDiagramProps) {
  const { sessionToken, isAuthenticated, selectedUnidadeFiltro, processNumber, documents, isLoadingDocuments, openUnitsInProcess } = useProcessContext();
  const [selectedTask, setSelectedTask] = useState<ProcessedAndamento | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isTimelineStuck, setIsTimelineStuck] = useState(false);
  const [timelinePosition, setTimelinePosition] = useState({ left: 0, width: 0 });
  const [diagramScrollLeft, setDiagramScrollLeft] = useState(0);

  // Filtrar tarefas primeiro
  const filteredTasks = tasks.filter(task => {
    if (filteredLaneUnits.length === 0) return true;
    return filteredLaneUnits.includes(task.Unidade.Sigla);
  });

  // Obter unidades que têm tarefas visíveis
  const unitsWithTasks = new Set(filteredTasks.map(task => task.Unidade.Sigla));

  // Filtrar lanes: remover raias vazias + aplicar filtro de unidades
  const filteredAndSortedLanes = Array.from(laneMap.entries())
    .filter(([sigla]) => {
      // Sempre ocultar raias que não têm tarefas
      if (!unitsWithTasks.has(sigla)) return false;

      // Se há filtro, mostrar apenas unidades selecionadas
      if (filteredLaneUnits.length === 0) return true;
      return filteredLaneUnits.includes(sigla);
    })
    .sort(([siglaA], [siglaB]) => {
      // Se há filtro ativo, colocar unidades filtradas no topo
      if (filteredLaneUnits.length > 0) {
        const aIsFiltered = filteredLaneUnits.includes(siglaA);
        const bIsFiltered = filteredLaneUnits.includes(siglaB);

        if (aIsFiltered && !bIsFiltered) return -1;
        if (!aIsFiltered && bIsFiltered) return 1;
      }

      // Manter ordem original baseada em Y position
      return (laneMap.get(siglaA) || 0) - (laneMap.get(siglaB) || 0);
    });

  // Criar novo mapeamento de posições Y para as lanes reordenadas
  const repositionedLaneMap = new Map<string, number>();
  filteredAndSortedLanes.forEach(([sigla], index) => {
    const newYPos = VERTICAL_LANE_SPACING / 2 + index * VERTICAL_LANE_SPACING;
    repositionedLaneMap.set(sigla, newYPos);
  });

  // Ajustar posições Y das tarefas de acordo com as novas posições das lanes
  const repositionedTasks = filteredTasks.map(task => {
    const newYPos = repositionedLaneMap.get(task.Unidade.Sigla);
    if (newYPos !== undefined) {
      return { ...task, y: newYPos };
    }
    return task;
  });

  // Criar mapa de tarefas reposicionadas para atualizar as conexões
  const taskPositionMap = new Map<string, ProcessedAndamento>();
  repositionedTasks.forEach(task => {
    taskPositionMap.set(task.IdAndamento, task);
  });

  // Filtrar e ajustar conexões com as novas posições das tarefas
  const filteredTaskIds = new Set(repositionedTasks.map(t => t.IdAndamento));
  const repositionedConnections = connections
    .filter(conn =>
      filteredTaskIds.has(conn.sourceTask.IdAndamento) &&
      filteredTaskIds.has(conn.targetTask.IdAndamento)
    )
    .map(conn => ({
      ...conn,
      sourceTask: taskPositionMap.get(conn.sourceTask.IdAndamento) || conn.sourceTask,
      targetTask: taskPositionMap.get(conn.targetTask.IdAndamento) || conn.targetTask,
    }));

  // Usar os dados reposicionados no lugar dos originais
  const laneEntries = Array.from(repositionedLaneMap.entries());
  const filteredConnections = repositionedConnections;

  // Detect gap for partial data visual separator
  const gapInfo = isPartialData ? detectPartialDataGap(repositionedTasks) : null;

  const LANE_LABEL_AREA_WIDTH = 150;

  // Função para verificar se uma unidade está com processo aberto
  const isUnitOpen = (sigla: string): boolean => {
    if (!openUnitsInProcess || openUnitsInProcess.length === 0) return false;
    return openUnitsInProcess.some(unit => unit.Unidade.Sigla === sigla);
  };

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

  // Sync timeline horizontal position with diagram scroll
  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const handleScroll = () => {
      const scrollLeft = viewport.scrollLeft;
      // Update state to move both timelines via transform
      setDiagramScrollLeft(scrollLeft);
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer to detect when timeline goes out of view
  useEffect(() => {
    const timelineContainer = timelineContainerRef.current;
    if (!timelineContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When timeline is NOT intersecting (out of view), make it stuck
        setIsTimelineStuck(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-60px 0px 0px 0px', // Account for top navbar height
      }
    );

    observer.observe(timelineContainer);
    return () => observer.disconnect();
  }, []);

  // Update floating timeline position to match original timeline
  useEffect(() => {
    const updatePosition = () => {
      const timelineContainer = timelineContainerRef.current;
      if (!timelineContainer) return;

      const rect = timelineContainer.getBoundingClientRect();
      setTimelinePosition({
        left: rect.left,
        width: rect.width,
      });
    };

    // Update position initially and on window resize
    updatePosition();
    window.addEventListener('resize', updatePosition);

    // Also update when sidebar might change (using a MutationObserver would be better but this works)
    const interval = setInterval(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      clearInterval(interval);
    };
  }, [isTimelineStuck]);

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

    const handleMouseUpGlobal = () => {
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


  if (repositionedTasks.length === 0) {
    return <p className="text-center text-muted-foreground py-10">
      {filteredLaneUnits.length > 0
        ? "Nenhum andamento encontrado para as unidades selecionadas."
        : "Nenhum andamento para exibir."}
    </p>;
  }

  const TOP_PADDING = 30; // Space for the top date labels
  const TIMELINE_HEIGHT = 50; // Height of the timeline bar itself
  const BOTTOM_PADDING = 30; // Space for dates below the timeline
  const TOTAL_TIMELINE_HEIGHT = TIMELINE_HEIGHT + TOP_PADDING + BOTTOM_PADDING; // 110px total

  return (
    <div className="h-full flex flex-col w-full relative">
      {/* Horizontal Timeline Bar - Original position */}
      <div
        ref={timelineContainerRef}
        style={{
          width: '100%',
          height: `${TOTAL_TIMELINE_HEIGHT}px`,
          backgroundColor: 'hsl(var(--card))',
          borderBottom: '1px solid hsl(var(--border))',
          boxSizing: 'border-box',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            paddingLeft: `${LANE_LABEL_AREA_WIDTH}px`,
            paddingTop: `${TOP_PADDING}px`,
            paddingBottom: `${BOTTOM_PADDING}px`,
            height: `${TOTAL_TIMELINE_HEIGHT}px`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{
            width: `${svgWidth}px`,
            height: `${TIMELINE_HEIGHT}px`,
            transform: `translateX(-${diagramScrollLeft}px)`,
            willChange: 'transform',
          }}>
            <ProcessTimelineBar tasks={repositionedTasks} svgWidth={svgWidth} isPartialData={isPartialData} />
          </div>
        </div>
      </div>

      {/* Timeline flutuante - aparece quando a original sai da view */}
      {isTimelineStuck && (
        <div
          style={{
            position: 'fixed',
            top: '57px', // Below the top navbar
            left: `${timelinePosition.left}px`,
            width: `${timelinePosition.width}px`,
            height: `${TOTAL_TIMELINE_HEIGHT}px`,
            backgroundColor: 'hsl(var(--card))',
            borderBottom: '1px solid hsl(var(--border))',
            boxSizing: 'border-box',
            zIndex: 25,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              paddingLeft: `${LANE_LABEL_AREA_WIDTH}px`,
              paddingTop: `${TOP_PADDING}px`,
              paddingBottom: `${BOTTOM_PADDING}px`,
              height: `${TOTAL_TIMELINE_HEIGHT}px`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div style={{
              width: `${svgWidth}px`,
              height: `${TIMELINE_HEIGHT}px`,
              transform: `translateX(-${diagramScrollLeft}px)`,
              willChange: 'transform',
            }}>
              <ProcessTimelineBar tasks={repositionedTasks} svgWidth={svgWidth} isPartialData={isPartialData} />
            </div>
          </div>
        </div>
      )}

      <ScrollArea
        className="w-full rounded-md border flex-grow bg-card shadow-inner"
        viewportRef={viewportRef}
      >
        <div
          data-diagram-root
          style={{
            width: svgWidth + LANE_LABEL_AREA_WIDTH,
            minHeight: svgHeight,
            position: 'relative',
            cursor: 'grab',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Container for Lane Labels and SVG */}
          <div style={{ position: 'relative', height: `${svgHeight}px` }}>
            {/* Sticky Lane Labels */}
            <div
              style={{
                position: 'sticky',
                left: 0,
                top: 0,
                width: `${LANE_LABEL_AREA_WIDTH}px`,
                height: `${svgHeight}px`,
                zIndex: 10,
                pointerEvents: 'none',
                backgroundColor: 'hsl(var(--card))',
              }}
            >
              {laneEntries.map(([sigla, yPos]) => {
                const textLines = breakLongText(sigla);
                const unitIsOpen = isUnitOpen(sigla);

                return (
                  <div
                    key={`lane-label-${sigla}`}
                    className={`flex items-center pl-4 pr-2 text-sm font-semibold ${unitIsOpen ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    style={{
                      position: 'absolute',
                      top: `${yPos - (VERTICAL_LANE_SPACING / 2)}px`,
                      height: `${VERTICAL_LANE_SPACING}px`,
                      width: '100%',
                      borderRight: '1px solid hsl(var(--border))',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: unitIsOpen ? 'rgba(239, 68, 68, 0.1)' : 'hsl(var(--card))',
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

            {/* SVG Diagram */}
            <svg
              width={svgWidth}
              height={svgHeight}
              xmlns="http://www.w3.org/2000/svg"
              className=""
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

              {filteredConnections.map((conn) => (
                <path
                  key={`conn-${conn.sourceTask.IdAndamento}-${conn.targetTask.IdAndamento}-${conn.sourceTask.globalSequence}-${conn.targetTask.globalSequence}`}
                  d={getPathDefinition(conn)}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              ))}

              {/* Partial data gap separator */}
              {gapInfo && (() => {
                const midX = (gapInfo.leftX + gapInfo.rightX) / 2;
                const halfGap = 10;
                return (
                  <g>
                    {/* Semi-transparent background strip */}
                    <rect
                      x={midX - halfGap}
                      y={0}
                      width={halfGap * 2}
                      height={svgHeight}
                      fill="hsl(var(--muted))"
                      opacity="0.15"
                    />
                    {/* Left vertical cut line */}
                    <line
                      x1={midX - halfGap} y1={0}
                      x2={midX - halfGap} y2={svgHeight}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="6 4"
                      strokeWidth="1.5"
                      opacity="0.4"
                    />
                    {/* Right vertical cut line */}
                    <line
                      x1={midX + halfGap} y1={0}
                      x2={midX + halfGap} y2={svgHeight}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="6 4"
                      strokeWidth="1.5"
                      opacity="0.4"
                    />
                    {/* Loading dots between cut lines */}
                    <text
                      x={midX}
                      y={svgHeight / 2}
                      textAnchor="middle"
                      fontSize="11"
                      fill="hsl(var(--muted-foreground))"
                      opacity="0.5"
                    >
                      •••
                    </text>
                  </g>
                );
              })()}

              {repositionedTasks.map((task) => (
                <TaskNode
                  key={`${task.IdAndamento}-${task.globalSequence}`}
                  task={task}
                  onTaskClick={handleTaskClick}
                  hideSequence={!!(gapInfo && task.x >= gapInfo.rightX)}
                />
              ))}
            </svg>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
      />
    </div>
  );
}
