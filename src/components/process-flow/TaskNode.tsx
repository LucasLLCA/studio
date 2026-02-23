
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import React from 'react';
import { formatDisplayDate, MARKER_COLORS } from '@/lib/process-flow-utils';
import { extractDocumentNumber, findMatchedDocument } from '@/lib/document-extraction';
import { Layers } from 'lucide-react';
import { useProcessContext } from '@/contexts/process-context';

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
  hideSequence?: boolean;
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick, hideSequence = false }) => {
  const { documents, isLoadingDocuments } = useProcessContext();
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  const radius = task.nodeRadius || 18;
  const showDaysOpenLabel = typeof task.daysOpen === 'number' && task.daysOpen >= 0 && !task.isSummaryNode;

  const extractableDocument = extractDocumentNumber(task.Descricao);
  const hasDocument = extractableDocument !== null;

  // Determine signature status for Ofício documents (Serie.Nome contains "oficio")
  const matchedDoc = hasDocument && documents?.length
    ? findMatchedDocument(extractableDocument!, documents)
    : null;
  const isOficio = matchedDoc?.Serie?.Nome?.toLowerCase().includes('oficio') ?? false;
  const hasSigned = isOficio && matchedDoc?.Assinaturas && matchedDoc.Assinaturas.length > 0;
  const isUnsignedOficio = isOficio && (!matchedDoc?.Assinaturas || matchedDoc.Assinaturas.length === 0);

  // Document exists in task description but user can't access it
  const isDocumentInaccessible = hasDocument && !matchedDoc
    && Array.isArray(documents) && !isLoadingDocuments;

  // Marker positioning
  const markerX = radius * 0.7;
  const markerY = -radius * 0.7;
  const markerSize = radius / 3;

  return (
    <g
      transform={`translate(${task.x}, ${task.y})`}
      onClick={handleNodeClick}
      className="cursor-pointer group"
      aria-label={`Tarefa ${task.globalSequence}: ${task.Tarefa}`}
    >
      {showDaysOpenLabel && (
        <text
          x={0}
          y={-radius - 6}
          textAnchor="middle"
          fontSize="10px"
          fontWeight="bold"
          fill="hsl(var(--destructive))"
          className="select-none"
        >
          {task.daysOpen}d
        </text>
      )}
      <circle
        r={radius}
        fill={task.color || "hsl(var(--primary))"}
        stroke="hsl(var(--card-foreground))"
        strokeWidth="2"
        style={{
          transition: "all 0.15s ease-in-out",
          cursor: "pointer"
        }}
        className="group-hover:stroke-hsl(var(--ring)) group-hover:stroke-[2.5px] group-active:scale-95"
      />
      {task.isSummaryNode && task.groupedTasksCount ? (
        <text
          y={radius * 0.25}
          textAnchor="middle"
          fontSize={radius * 0.5}
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
          className="select-none"
        >
          {task.groupedTasksCount}x
        </text>
      ) : (
        <text
          y={radius * 0.25}
          textAnchor="middle"
          fontSize={radius * 0.6}
          fontWeight="bold"
          fill="hsl(var(--primary-foreground))"
          className="select-none"
        >
          {hideSequence ? '?' : task.globalSequence}
        </text>
      )}

      {/* Signature-aware markers for Serie 11 (Oficio) documents */}
      {isUnsignedOficio && (
        <g transform={`translate(${markerX}, ${markerY})`} style={{ pointerEvents: 'none' }}>
          {/* Orange/amber warning triangle for unsigned Oficio */}
          <polygon
            points={`0,${-markerSize} ${markerSize},${markerSize} ${-markerSize},${markerSize}`}
            fill={MARKER_COLORS.unsignedOficio.fill}
            stroke={MARKER_COLORS.unsignedOficio.stroke}
            strokeWidth="1"
          />
          <text
            y={markerSize * 0.55}
            textAnchor="middle"
            fontSize={markerSize * 1.1}
            fontWeight="bold"
            fill={MARKER_COLORS.unsignedOficio.text}
          >
            !
          </text>
        </g>
      )}

      {hasSigned && (
        <g transform={`translate(${markerX}, ${markerY})`} style={{ pointerEvents: 'none' }}>
          {/* Green circle with pen icon for signed Oficio */}
          <circle r={markerSize} fill={MARKER_COLORS.signedOficio.fill} stroke={MARKER_COLORS.signedOficio.stroke} strokeWidth="1" />
          {/* Pen/signature SVG path */}
          <g transform={`scale(${markerSize / 8}) translate(-8, -8)`}>
            <path
              d="M13.5 3.5l3 3L7 16H4v-3L13.5 3.5z"
              fill="white"
              stroke="none"
            />
          </g>
        </g>
      )}

      {/* Default amber circle for accessible non-Serie-11 documents */}
      {hasDocument && matchedDoc && !isOficio && (
        <circle
          r={radius / 4}
          cx={markerX}
          cy={markerY}
          fill={MARKER_COLORS.document.fill}
          stroke={MARKER_COLORS.document.stroke}
          strokeWidth="1"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Gray lock badge for inaccessible documents */}
      {isDocumentInaccessible && (
        <g transform={`translate(${markerX}, ${markerY})`} style={{ pointerEvents: 'none' }}>
          <circle r={markerSize} fill={MARKER_COLORS.restricted.fill} stroke={MARKER_COLORS.restricted.stroke} strokeWidth="1" />
          {/* Lock SVG icon */}
          <g transform={`scale(${markerSize / 8}) translate(-8, -8)`}>
            <rect x="5" y="8" width="10" height="8" rx="1" fill="white" />
            <path
              d="M7 8V6a3 3 0 0 1 6 0v2"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        </g>
      )}

      <title>{
        task.isSummaryNode ?
        `${task.groupedTasksCount} ações diversas em ${task.Unidade.Sigla}\nInício em: ${formatDisplayDate(task.parsedDate)}${hasDocument ? '\n🔍 Possui documento para resumo' : ''}` :
        `Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${formatDisplayDate(task.parsedDate)}\nDias Aberto: ${task.daysOpen ?? 'N/A'}${isDocumentInaccessible ? `\n🔒 Documento restrito (${extractableDocument})` : isUnsignedOficio ? '\n⚠️ Ofício sem assinatura' : hasSigned ? '\n✅ Ofício assinado' : hasDocument ? `\n🔍 Documento detectado: ${extractableDocument}` : ''}`
      }</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
