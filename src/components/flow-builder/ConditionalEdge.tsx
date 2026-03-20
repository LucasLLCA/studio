'use client';

import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

export default function ConditionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
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
          stroke: selected ? '#d97706' : '#f59e0b',
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        {label && (
          <div
            className="absolute bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded border border-amber-300 pointer-events-none nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {label}
          </div>
        )}
        {selected && (
          <div
            className="absolute pointer-events-none nodrag nopan flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-600 text-[10px] font-medium shadow-sm whitespace-nowrap"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${label ? labelY + 22 : labelY}px)`,
            }}
          >
            duplo clique para remover
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
