'use client';

import React from 'react';
import { Play, Square, GitBranch, GitMerge, Diamond, FileText, Layers } from 'lucide-react';

interface PaletteItem {
  tipo: string;
  label: string;
  icon: React.ReactNode;
}

const SEI_TASKS: PaletteItem[] = [
  { tipo: 'sei_task', label: 'Análise', icon: <FileText className="h-4 w-4" /> },
  { tipo: 'sei_task', label: 'Despacho', icon: <FileText className="h-4 w-4" /> },
  { tipo: 'sei_task', label: 'Assinatura', icon: <FileText className="h-4 w-4" /> },
  { tipo: 'sei_task', label: 'Publicação', icon: <FileText className="h-4 w-4" /> },
  { tipo: 'sei_task', label: 'Notificação', icon: <FileText className="h-4 w-4" /> },
];

const CONTROL_NODES: PaletteItem[] = [
  { tipo: 'inicio', label: 'Início', icon: <Play className="h-4 w-4 text-green-600" /> },
  { tipo: 'fim', label: 'Fim', icon: <Square className="h-4 w-4 text-red-600" /> },
  { tipo: 'decisao', label: 'Decisão', icon: <Diamond className="h-4 w-4 text-amber-600" /> },
  { tipo: 'fork', label: 'Fork', icon: <GitBranch className="h-4 w-4 text-gray-600" /> },
  { tipo: 'join', label: 'Join', icon: <GitMerge className="h-4 w-4 text-gray-600" /> },
];

const CUSTOM_NODES: PaletteItem[] = [
  { tipo: 'etapa', label: 'Etapa Personalizada', icon: <Layers className="h-4 w-4 text-indigo-600" /> },
];

function DraggableItem({ item }: { item: PaletteItem }) {
  const onDragStart = (e: React.DragEvent) => {
    const data = JSON.stringify({
      tipo: item.tipo,
      nome: item.label,
      sei_task_key: item.tipo === 'sei_task' ? item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : undefined,
    });
    e.dataTransfer.setData('application/reactflow', data);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card cursor-grab hover:bg-accent transition-colors text-sm"
      draggable
      onDragStart={onDragStart}
    >
      {item.icon}
      <span>{item.label}</span>
    </div>
  );
}

export default function NodePalette() {
  return (
    <div className="w-56 border-r border-border bg-card overflow-y-auto p-3 space-y-4 flex-shrink-0">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Tarefas SEI
        </h3>
        <div className="space-y-1">
          {SEI_TASKS.map((item, i) => (
            <DraggableItem key={`sei-${i}`} item={item} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Controle de Fluxo
        </h3>
        <div className="space-y-1">
          {CONTROL_NODES.map((item, i) => (
            <DraggableItem key={`ctrl-${i}`} item={item} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Personalizado
        </h3>
        <div className="space-y-1">
          {CUSTOM_NODES.map((item, i) => (
            <DraggableItem key={`custom-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
