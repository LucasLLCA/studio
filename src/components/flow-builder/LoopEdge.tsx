'use client';

import React from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export default function LoopEdge({
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
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: selected ? '#6366f1' : '#a5b4fc',
        strokeWidth: 2,
        strokeDasharray: '6 3',
      }}
    />
  );
}
