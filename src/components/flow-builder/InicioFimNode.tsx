'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function InicioFimNode({ data, selected, type }: NodeProps) {
  const d = data as Record<string, unknown>;
  const isInicio = (d.tipo as string) === 'inicio' || type === 'inicio';
  const bgClass = isInicio ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500';
  const handleClass = isInicio ? '!bg-green-600' : '!bg-red-600';

  const unidadesInicio = (d.unidades_inicio as Array<{ id_unidade: number; sigla: string }>) || [];
  const publicoAlvo = (d.publico_alvo as string) || 'publico';
  const isAnyUnit = !unidadesInicio.length;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-full border-2 shadow-sm ${bgClass} ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      style={{ width: 100, height: 100 }}
    >
      {!isInicio && (
        <Handle type="target" position={Position.Top} className={`${handleClass} !w-3 !h-3`} />
      )}
      <span className="text-xs font-bold text-foreground">{d.nome as string}</span>
      {isInicio && (
        <>
          <span className="text-[9px] text-muted-foreground mt-0.5 text-center leading-tight px-2 truncate max-w-[90px]">
            {isAnyUnit ? 'Qualquer caixa' : `${unidadesInicio.length} caixa(s)`}
          </span>
          <span className={`text-[8px] mt-0.5 font-medium ${publicoAlvo === 'servidores' ? 'text-amber-600' : 'text-green-700'}`}>
            {publicoAlvo === 'servidores' ? 'Servidores' : 'Público'}
          </span>
        </>
      )}
      {isInicio && (
        <Handle type="source" position={Position.Bottom} className={`${handleClass} !w-3 !h-3`} />
      )}
    </div>
  );
}

export default memo(InicioFimNode);
