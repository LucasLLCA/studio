'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function DecisaoNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <Handle type="target" position={Position.Top} className="!bg-amber-600 !w-3 !h-3" style={{ top: -6 }} />
      <div
        className={`absolute inset-0 border-2 border-amber-400 bg-amber-50 shadow-sm ${
          selected ? 'ring-2 ring-primary' : ''
        }`}
        style={{ transform: 'rotate(45deg)', borderRadius: 8 }}
      />
      <div className="relative z-10 text-center px-2" style={{ maxWidth: 90 }}>
        <div className="text-xs font-semibold text-foreground leading-tight truncate">
          {d.nome as string}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-600 !w-3 !h-3" style={{ bottom: -6 }} />
      <Handle type="source" position={Position.Right} id="right" className="!bg-amber-600 !w-3 !h-3" style={{ right: -6 }} />
      <Handle type="source" position={Position.Left} id="left" className="!bg-amber-600 !w-3 !h-3" style={{ left: -6 }} />
    </div>
  );
}

export default memo(DecisaoNode);
