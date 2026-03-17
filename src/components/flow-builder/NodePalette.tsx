'use client';

import React from 'react';
import { Play, Square, GitBranch, GitMerge, Diamond, Layers } from 'lucide-react';

interface PaletteItem {
  tipo: string;
  label: string;
  icon: React.ReactNode;
}

const FLOW_NODES: PaletteItem[] = [
  { tipo: 'inicio', label: 'Início', icon: <Play className="h-4 w-4 text-green-600" /> },
  { tipo: 'etapa', label: 'Etapa', icon: <Layers className="h-4 w-4 text-indigo-600" /> },
  { tipo: 'decisao', label: 'Decisão', icon: <Diamond className="h-4 w-4 text-amber-600" /> },
  { tipo: 'fork', label: 'Fork', icon: <GitBranch className="h-4 w-4 text-gray-600" /> },
  { tipo: 'join', label: 'Join', icon: <GitMerge className="h-4 w-4 text-gray-600" /> },
  { tipo: 'fim', label: 'Fim', icon: <Square className="h-4 w-4 text-red-600" /> },
];

function DraggableItem({ item }: { item: PaletteItem }) {
  const onDragStart = (e: React.DragEvent) => {
    const data = JSON.stringify({
      tipo: item.tipo,
      nome: item.label,
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
          Controle de Fluxo
        </h3>
        <div className="space-y-1">
          {FLOW_NODES.map((item, i) => (
            <DraggableItem key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
