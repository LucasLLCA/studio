'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const TASK_COLORS: Record<string, string> = {
  'analise': 'bg-blue-100 border-blue-400',
  'despacho': 'bg-yellow-100 border-yellow-400',
  'assinatura': 'bg-green-100 border-green-400',
  'publicacao': 'bg-purple-100 border-purple-400',
  'notificacao': 'bg-orange-100 border-orange-400',
  'default': 'bg-slate-100 border-slate-400',
};

function SeiTaskNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const taskKey = (d.sei_task_key as string) || '';
  const nome = d.nome as string;
  const responsavel = d.responsavel as string | undefined;
  const colorClass = TASK_COLORS[taskKey] || TASK_COLORS.default;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-sm min-w-[180px] ${colorClass} ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3 !h-3" />
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
        {taskKey || 'SEI Task'}
      </div>
      <div className="text-sm font-semibold text-foreground truncate">{nome}</div>
      {responsavel && (
        <div className="text-xs text-muted-foreground mt-1 truncate">{responsavel}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-3 !h-3" />
    </div>
  );
}

export default memo(SeiTaskNode);
