
"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
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

interface TaskNodeProps {
  task: ProcessedAndamento;
  onTaskClick: (task: ProcessedAndamento) => void;
}

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onTaskClick }) => {
  const handleNodeClick = () => {
    onTaskClick(task);
  };

  const radius = task.nodeRadius || 18; 
  const showDaysOpenLabel = typeof task.daysOpen === 'number' && task.daysOpen >= 0 && !task.isSummaryNode; // Don't show days open for summary nodes for now
  
  // Verificar se este nó possui documento extraível para resumo
  // Usar EXATAMENTE a mesma lógica do TaskDetailsModal
  const extractableDocument = hasExtractableDocument(task);
  const hasDocument = extractableDocument !== null;
  
  // Debug: log apenas para nós com documento
  if (hasDocument) {
    console.log(`🔍 Nó ${task.globalSequence} tem documento ${extractableDocument} - Descrição: "${task.Descricao.substring(0, 100)}..."`);
  }

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
          fontSize={radius * 0.5} // Smaller font for count
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
      
      {/* Indicador visual para nós com documento */}
      {hasDocument && (
        <circle
          r={radius / 4}
          cx={radius * 0.7}
          cy={-radius * 0.7}
          fill="#f59e0b"
          stroke="#000"
          strokeWidth="1"
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      <title>{
        task.isSummaryNode ? 
        `${task.groupedTasksCount} ações diversas em ${task.Unidade.Sigla}\nInício em: ${formatDisplayDate(task.parsedDate)}${hasDocument ? '\n🔍 Possui documento para resumo' : ''}` :
        `Tarefa: ${task.Tarefa}\nUnidade: ${task.Unidade.Sigla}\nData: ${formatDisplayDate(task.parsedDate)}\nDias Aberto: ${task.daysOpen ?? 'N/A'}${hasDocument ? `\n🔍 Documento detectado: ${extractableDocument}` : ''}`
      }</title>
    </g>
  );
};

TaskNode.displayName = 'TaskNode';
