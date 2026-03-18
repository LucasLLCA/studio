'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function ForkJoinNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const isFork = (d.tipo as string) === 'fork';

  return (
    <div
      className={`flex items-center justify-center rounded border-2 border-gray-500 bg-gray-200 shadow-sm ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      style={{ width: 160, height: 24 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-600 !w-3 !h-3" />
      <span className="text-[10px] font-medium text-gray-700 uppercase">
        {isFork ? 'Fork' : 'Join'}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !w-3 !h-3" />
      {isFork && (
        <>
          <Handle type="source" position={Position.Bottom} id="left" className="!bg-gray-600 !w-3 !h-3" style={{ left: '25%' }} />
          <Handle type="source" position={Position.Bottom} id="right" className="!bg-gray-600 !w-3 !h-3" style={{ left: '75%' }} />
        </>
      )}
      {!isFork && (
        <>
          <Handle type="target" position={Position.Top} id="left" className="!bg-gray-600 !w-3 !h-3" style={{ left: '25%' }} />
          <Handle type="target" position={Position.Top} id="right" className="!bg-gray-600 !w-3 !h-3" style={{ left: '75%' }} />
        </>
      )}
    </div>
  );
}

export default memo(ForkJoinNode);
