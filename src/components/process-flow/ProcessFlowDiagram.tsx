
"use client";

import type { ProcessedAndamento, ProcessedFlowData, Connection } from '@/types/process-flow';
import { TaskNode } from './TaskNode';
import { TaskDetailsModal } from './TaskDetailsModal';
import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ProcessFlowDiagramProps {
  processedData: ProcessedFlowData;
}

// const NODE_RADIUS = 18; // Agora vem de ProcessedAndamento
const CURVE_CONTROL_OFFSET_X = 70; // Controls the "S" shape of curves, ajustado para novo espaçamento

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
    const sRadius = s.nodeRadius || 18; // Usar o raio do nó de origem
    const tRadius = t.nodeRadius || 18; // Usar o raio do nó de destino


    if (s.y === t.y) { // Same lane, horizontal line
      return `M ${s.x + sRadius} ${s.y} L ${t.x - tRadius} ${t.y}`;
    } else { // Different lanes, curved line (cubic Bezier)
      const controlX1 = s.x + CURVE_CONTROL_OFFSET_X;
      const controlY1 = s.y;
      const controlX2 = t.x - CURVE_CONTROL_OFFSET_X;
      const controlY2 = t.y;
      // Conectar centros para curvas, o nó será desenhado sobre a extremidade da linha
      return `M ${s.x} ${s.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${t.x} ${t.y}`;
    }
  };
  
  const laneEntries = Array.from(laneMap.entries());

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
      <ScrollArea className="w-full rounded-md border flex-grow bg-card shadow-inner">
        <div style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
          <svg 
            width={svgWidth} 
            height={svgHeight} 
            xmlns="http://www.w3.org/2000/svg"
            className="bg-background" // Mantido para consistência, mas a ScrollArea tem bg-card
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9.5" // Ajustado para posicionar corretamente na ponta da linha
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
              </marker>
            </defs>

            {/* Render Lane Labels */}
            {laneEntries.map(([sigla, yPos]) => (
              <text
                key={`lane-label-${sigla}`}
                x="15" // Pequeno padding da borda esquerda
                y={yPos}
                dy=".3em" // Ajuste de alinhamento vertical
                fontSize="13px" // Aumentado para melhor leitura
                fill="hsl(var(--muted-foreground))"
                className="font-semibold" // Mais destaque
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
                strokeWidth="2" // Linha um pouco mais grossa
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
                // radius prop não é mais necessária aqui, já que vem de task.nodeRadius
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

