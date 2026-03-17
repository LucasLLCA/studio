'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function InicioFimNode({ data, selected, type }: NodeProps) {
  const d = data as Record<string, unknown>;
  const isInicio = (d.tipo as string) === 'inicio' || type === 'inicio';
  const bgClass = isInicio ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500';
  const handleClass = isInicio ? '!bg-green-600' : '!bg-red-600';

  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 shadow-sm ${bgClass} ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      style={{ width: 80, height: 80 }}
    >
      {!isInicio && (
        <Handle type="target" position={Position.Top} className={`${handleClass} !w-3 !h-3`} />
      )}
      <span className="text-xs font-bold text-foreground">{d.nome as string}</span>
      {isInicio && (
        <Handle type="source" position={Position.Bottom} className={`${handleClass} !w-3 !h-3`} />
      )}
    </div>
  );
}

export default memo(InicioFimNode);
