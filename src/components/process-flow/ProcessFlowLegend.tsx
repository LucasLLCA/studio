"use client";

import React from 'react';

const NodeItem: React.FC<{label: string, visual: React.ReactNode}> = ({ label, visual }) => {
  return (
    <div className="flex items-center space-x-3">
      {visual}
      <span className="text-sm text-foreground font-medium">{label}</span>
    </div>
  );
};

export function ProcessFlowLegend() {
  return (
    <div className="p-4 bg-card rounded-md shadow-sm">
      <div className="grid grid-cols-1 gap-3">
        <NodeItem 
          label="Geração do Processo"
          visual={
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(30, 80%, 55%)' }}></div>
          }
        />
        <NodeItem 
          label="Outras Ações"
          visual={
            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
          }
        />
        <NodeItem 
          label="Outras Ações com Resumo"
          visual={
            <div className="relative flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border border-black"></div>
            </div>
          }
        />
      </div>
    </div>
  );
}