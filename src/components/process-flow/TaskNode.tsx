
"use client";

import type { ProcessedAndamento, Documento } from '@/types/process-flow';
import React from 'react';
import { formatDisplayDate } from '@/lib/process-flow-utils';
import { Layers } from 'lucide-react'; // For summary node indication

// Função para detectar se o nó possui documento extraível para resumo
// EXATAMENTE a mesma lógica do TaskDetailsModal
function hasExtractableDocument(task: ProcessedAndamento): string | null {
  const patterns = [
    // Padrão original (8-9 dígitos isolados) - mais confiável
    { name: 'isolado', regex: /\b(\d{8,9})\b/, priority: 1 },

    // Com prefixos comuns (DOC, DOCUMENTO, ANEXO, etc.)
    { name: 'prefixo_doc', regex: /(?:DOC|DOCUMENTO|ANEXO|PROCESS)[O]?[:\s#-]*(\d{7,10})/i, priority: 2 },

    // Protocolo ou número de processo
    { name: 'protocolo', regex: /(?:PROTOCOLO|PROCESSO|SEI)[:\s#-]*(\d{7,10})/i, priority: 2 },

    // Entre parênteses ou colchetes
    { name: 'parenteses', regex: /[\(\[](\d{7,10})[\)\]]/, priority: 3 },

    // Precedido por "nº", "n°", "num", "número"
    { name: 'numero', regex: /(?:n[ºo°]?|num|número)[:\s]*(\d{7,10})/i, priority: 3 },

    // Qualquer sequência de 7-10 dígitos (menos confiável)
    { name: 'generico', regex: /(\d{7,10})(?=\s|$|[^\d])/g, priority: 4 }
  ];

  let bestMatch = null;
  let bestPriority = 999;

  for (const pattern of patterns) {
    const matches = pattern.regex.global ?
      [...task.Descricao.matchAll(pattern.regex)] :
      [task.Descricao.match(pattern.regex)];

    for (const match of matches) {
      if (match && match[1] && pattern.priority < bestPriority) {
        const number = match[1];

        // Rejeitar números muito pequenos (menos de 7 dígitos)
        if (number.length < 7) continue;

        // Rejeitar números muito grandes (mais de 12 dígitos)
        if (number.length > 12) continue;

        // Rejeitar padrões óbvios de data (formato YYYYMMDD ou DDMMYYYY)
        if (number.length === 8) {
          const year = parseInt(number.substring(0, 4));
          const year2 = parseInt(number.substring(4, 8));
          if ((year >= 1990 && year <= 2030) || (year2 >= 1990 && year2 <= 2030)) {
            continue;
          }
        }

        bestMatch = number;
        bestPriority = pattern.priority;
      }
    }
  }

  return bestMatch;
}

function findMatchedDocument(docNumber: string, documents: Documento[]): Documento | null {
  return documents.find(doc =>
    doc.DocumentoFormatado === docNumber ||
    doc.Numero === docNumber ||
    doc.DocumentoFormatado.includes(docNumber) ||
    docNumber.includes(doc.DocumentoFormatado)
  ) || null;
}

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
  documents?: Documento[] | null;
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick, documents }) => {
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  const radius = task.nodeRadius || 18;
  const showDaysOpenLabel = typeof task.daysOpen === 'number' && task.daysOpen >= 0 && !task.isSummaryNode;

  const extractableDocument = hasExtractableDocument(task);
  const hasDocument = extractableDocument !== null;

  // Determine signature status for Serie 11 (Oficio) documents
  const matchedDoc = hasDocument && documents?.length
    ? findMatchedDocument(extractableDocument!, documents)
    : null;
  const isOficio = matchedDoc?.Serie?.IdSerie === '11';
  const hasSigned = isOficio && matchedDoc?.Assinaturas && matchedDoc.Assinaturas.length > 0;
  const isUnsignedOficio = isOficio && (!matchedDoc?.Assinaturas || matchedDoc.Assinaturas.length === 0);

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
          {task.globalSequence}
        </text>
      )}

      {/* Signature-aware markers for Serie 11 (Oficio) documents */}
      {isUnsignedOficio && (
        <g transform={`translate(${markerX}, ${markerY})`} style={{ pointerEvents: 'none' }}>
          {/* Orange/amber warning triangle for unsigned Oficio */}
          <polygon
            points={`0,${-markerSize} ${markerSize},${markerSize} ${-markerSize},${markerSize}`}
            fill="#f59e0b"
            stroke="#92400e"
            strokeWidth="1"
          />
          <text
            y={markerSize * 0.55}
            textAnchor="middle"
            fontSize={markerSize * 1.1}
            fontWeight="bold"
            fill="#92400e"
          >
            !
          </text>
        </g>
      )}

      {hasSigned && (
        <g transform={`translate(${markerX}, ${markerY})`} style={{ pointerEvents: 'none' }}>
          {/* Green circle with pen icon for signed Oficio */}
          <circle r={markerSize} fill="#16a34a" stroke="#15803d" strokeWidth="1" />
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

      {/* Default amber circle for non-Serie-11 documents */}
      {hasDocument && !isOficio && (
        <circle
          r={radius / 4}
          cx={markerX}
          cy={markerY}
          fill="#f59e0b"
          stroke="#000"
          strokeWidth="1"
          style={{ pointerEvents: 'none' }}
        />
      )}

      <title>{
        task.isSummaryNode ?
        `${task.groupedTasksCount} ações diversas em ${task.Unidade.Sigla}\nInício em: ${formatDisplayDate(task.parsedDate)}${hasDocument ? '\n🔍 Possui documento para resumo' : ''}` :
        `Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${formatDisplayDate(task.parsedDate)}\nDias Aberto: ${task.daysOpen ?? 'N/A'}${isUnsignedOficio ? '\n⚠️ Ofício sem assinatura' : hasSigned ? '\n✅ Ofício assinado' : hasDocument ? `\n🔍 Documento detectado: ${extractableDocument}` : ''}`
      }</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
