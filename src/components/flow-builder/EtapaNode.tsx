'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function EtapaNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const nome = d.nome as string;
  const descricao = d.descricao as string | undefined;
  const responsavel = d.responsavel as string | undefined;
  const unidades = (d.unidades_etapa as Array<{ sigla: string; incluir_filhas?: boolean }>) || [];

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 border-indigo-300 bg-indigo-50 shadow-sm min-w-[160px] ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3" />
      <div className="text-sm font-semibold text-foreground truncate">{nome}</div>
      {descricao && (
        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{descricao}</div>
      )}
      {unidades.length > 0 && (
        <div className="text-[10px] text-indigo-600 mt-1 truncate">
          {unidades.map(u => u.sigla + (u.incluir_filhas ? '/*' : '')).join(', ')}
        </div>
      )}
      {responsavel && (
        <div className="text-xs text-muted-foreground mt-1 truncate">{responsavel}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3" />
    </div>
  );
}

export default memo(EtapaNode);
