'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

export default function DefaultEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#6366f1' : '#94a3b8',
          strokeWidth: selected ? 2.5 : 2,
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none nodrag nopan flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-600 text-[10px] font-medium shadow-sm whitespace-nowrap"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          >
            duplo clique para remover
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
