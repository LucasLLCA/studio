
"use client";

import React from 'react';

interface LegendItemProps {
  color: string;
  label: string;
  isHslVar?: boolean; // To handle HSL variables like --muted or --destructive
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label, isHslVar }) => {
  const style = isHslVar ? { backgroundColor: `hsl(var(${color}))` } : { backgroundColor: color };
  return (
    <div className="flex items-center space-x-3">
      <div
        className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm flex-shrink-0"
        style={style}
      ></div>
      <span className="text-sm text-foreground font-medium">{label}</span>
    </div>
  );
};

const legendItems: Array<Omit<LegendItemProps, 'isHslVar'> & {isHslVar?: boolean}> = [
  { color: 'hsl(120, 60%, 45%)', label: 'Conclusão na Unidade' },
  { color: 'hsl(120, 60%, 70%)', label: 'Conclusão Automática' },
  { color: 'hsl(30, 35%, 40%)', label: 'Processo Remetido' },
  { color: 'hsl(210, 70%, 55%)', label: 'Processo Recebido' },
  { color: 'hsl(270, 50%, 60%)', label: 'Reabertura do Processo' },
  { color: 'hsl(30, 80%, 55%)', label: 'Geração do Processo' },
  { color: '--muted', label: 'Outras Ações', isHslVar: true },
  { color: '--destructive', label: 'Pendente na Unidade (Ponta)', isHslVar: true },
];

export function ProcessFlowLegend() {
  return (
    <div className="p-4 bg-card rounded-md shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {legendItems.map((item) => (
          <LegendItem key={item.label} color={item.color} label={item.label} isHslVar={item.isHslVar} />
        ))}
      </div>
    </div>
  );
}
