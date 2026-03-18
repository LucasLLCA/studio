"use client";

import React from 'react';
import { MARKER_COLORS } from '@/lib/process-flow-utils';

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
      <div className="space-y-4">
        {/* Node colors */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{"A\u00e7\u00f5es"}</p>
          <div className="grid grid-cols-1 gap-3">
            <NodeItem
              label={"Gera\u00e7\u00e3o / Reabertura"}
              visual={
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(30, 80%, 55%)' }}></div>
              }
            />
            <NodeItem
              label={"Conclus\u00e3o na Unidade"}
              visual={
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
              }
            />
            <NodeItem
              label={"Outras A\u00e7\u00f5es"}
              visual={
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
              }
            />
            <NodeItem
              label="Unidade em Aberto"
              visual={
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
              }
            />
          </div>
        </div>

        {/* Badges / markers */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Indicadores</p>
          <div className="grid grid-cols-1 gap-3">
            <NodeItem
              label={"A\u00e7\u00e3o com Documento Resumido"}
              visual={
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border" style={{ backgroundColor: MARKER_COLORS.document.fill, borderColor: MARKER_COLORS.document.stroke }}></div>
                </div>
              }
            />
            <NodeItem
              label="Documento Restrito"
              visual={
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: MARKER_COLORS.restricted.fill, border: `1.5px solid ${MARKER_COLORS.restricted.stroke}` }}>
                    <svg width="8" height="8" viewBox="0 0 20 20" fill="white">
                      <rect x="4" y="9" width="12" height="9" rx="1.5" />
                      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              }
            />
            <NodeItem
              label={"Of\u00edcio Assinado"}
              visual={
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: MARKER_COLORS.signedOficio.fill, border: `1.5px solid ${MARKER_COLORS.signedOficio.stroke}` }}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </div>
                </div>
              }
            />
            <NodeItem
              label={"Of\u00edcio sem Assinatura"}
              visual={
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center" style={{ color: MARKER_COLORS.unsignedOficio.text }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={MARKER_COLORS.unsignedOficio.fill} stroke={MARKER_COLORS.unsignedOficio.stroke} strokeWidth="2" strokeLinejoin="round">
                      <polygon points="12 2 22 22 2 22" />
                      <text x="12" y="19" textAnchor="middle" fill={MARKER_COLORS.unsignedOficio.text} stroke="none" fontSize="14" fontWeight="bold">!</text>
                    </svg>
                  </div>
                </div>
              }
            />
            <NodeItem
              label="Dias em Aberto"
              visual={
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
                  <span className="absolute -top-3.5 text-[10px] font-bold" style={{ color: 'hsl(var(--destructive))' }}>5d</span>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
