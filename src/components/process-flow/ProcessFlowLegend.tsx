
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
    <div className="flex items-center space-x-2">
      <div
        className="w-4 h-4 rounded-full border border-card-foreground/50"
        style={style}
      ></div>
      <span className="text-sm text-muted-foreground">{label}</span>
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
    <div className="mt-4 p-4 border-t border-border bg-card rounded-b-md shadow-sm">
      <h3 className="text-md font-semibold text-foreground mb-3">Legenda de Cores dos Nós:</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
        {legendItems.map((item) => (
          <LegendItem key={item.label} color={item.color} label={item.label} isHslVar={item.isHslVar} />
        ))}
      </div>
    </div>
  );
}
