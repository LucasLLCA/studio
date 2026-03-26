'use client';

import React, { memo, useState } from 'react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';

const PRIO_BORDER: Record<string, string> = {
  baixa:   'border-l-green-500',
  media:   'border-l-amber-500',
  alta:    'border-l-orange-500',
  critica: 'border-l-red-500',
};

const PRIO_LABEL: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

const PRIO_BADGE: Record<string, string> = {
  baixa:   'text-green-700 bg-green-50 border-green-300',
  media:   'text-amber-700 bg-amber-50 border-amber-300',
  alta:    'text-orange-700 bg-orange-50 border-orange-300',
  critica: 'text-red-700 bg-red-50 border-red-300',
};

function InicioFimNode({ data, selected, type }: NodeProps) {
  const d = data as Record<string, unknown>;
  const isInicio = (d.tipo as string) === 'inicio' || type === 'inicio';
  const nome = d.nome as string;
  const responsavel = d.responsavel as string | undefined;
  const descricao = d.descricao as string | undefined;
  const prioridade = (d.prioridade as string) || '';
  const checklist = (d.checklist as Array<{ item: string; obrigatorio: boolean }>) || [];
  const documentos = (d.documentos_necessarios as string[]) || [];
  const meta = (d.metadata_extra as Record<string, unknown>) || {};
  const unidadeSigla = meta.unidade_sei_sigla as string | undefined;
  const unidadeDescricao = meta.unidade_sei_descricao as string | undefined;

  const [showInfo, setShowInfo] = useState(false);

  React.useEffect(() => {
    if (!selected) setShowInfo(false);
  }, [selected]);

  const docsCount = documentos.filter(Boolean).length;
  const hasInfo = !!(descricao || responsavel || prioridade || checklist.length || docsCount || unidadeSigla);

  const borderColor = isInicio ? 'border-green-400' : 'border-red-400';
  const bgColor = isInicio ? 'bg-green-50' : 'bg-red-50';
  const handleClass = isInicio ? '!bg-green-600' : '!bg-red-600';
  const toolbarBg = isInicio ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700';
  const infoBtnClass = isInicio ? 'bg-green-200 text-green-700 hover:bg-green-300' : 'bg-red-200 text-red-700 hover:bg-red-300';
  const defaultLeftBorder = isInicio ? 'border-l-green-400' : 'border-l-red-400';

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border-2 ${borderColor} ${bgColor} shadow-sm min-w-[160px] border-l-4 ${
        prioridade && PRIO_BORDER[prioridade] ? PRIO_BORDER[prioridade] : defaultLeftBorder
      } ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      <NodeToolbar position={Position.Top} isVisible={!!unidadeSigla} className="pointer-events-none">
        <span className={`whitespace-nowrap text-[10px] font-semibold px-1.5 py-0.5 rounded border shadow-sm ${toolbarBg}`}>
          {unidadeSigla}
        </span>
      </NodeToolbar>

      {!isInicio && <Handle type="target" position={Position.Top} className={`${handleClass} !w-3 !h-3`} />}

      {hasInfo && (
        <>
          <button
            className={`absolute top-1 right-1 z-10 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center leading-none select-none ${infoBtnClass}`}
            onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
            title="Ver informações"
          >
            i
          </button>

          {showInfo && (
            <div
              className="absolute top-full left-0 z-50 mt-1 w-52 bg-white border border-border rounded-lg shadow-xl p-2.5 space-y-1.5 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-semibold text-foreground truncate">{nome}</p>
              {prioridade && (
                <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIO_BADGE[prioridade]}`}>
                  {PRIO_LABEL[prioridade]}
                </span>
              )}
              {unidadeSigla && (
                <p className="text-muted-foreground">Caixa: <span className="font-medium">{unidadeSigla}</span>{unidadeDescricao && ` — ${unidadeDescricao}`}</p>
              )}
              {responsavel && <p className="text-muted-foreground">Responsável: {responsavel}</p>}
              {descricao && <p className="text-muted-foreground line-clamp-4">{descricao}</p>}
              {docsCount > 0 && <p className="text-muted-foreground">{docsCount} documento{docsCount > 1 ? 's' : ''}</p>}
              {checklist.length > 0 && (
                <p className="text-muted-foreground">
                  Checklist: {checklist.filter((c) => c.obrigatorio).length} obrigatório{checklist.filter((c) => c.obrigatorio).length !== 1 ? 's' : ''} / {checklist.length} total
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="text-sm font-semibold text-foreground truncate pr-5">{nome}</div>
      {descricao && (
        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{descricao}</div>
      )}
      {responsavel && (
        <div className="text-xs text-muted-foreground mt-1 truncate">{responsavel}</div>
      )}

      {isInicio && <Handle type="source" position={Position.Bottom} className={`${handleClass} !w-3 !h-3`} />}
    </div>
  );
}

export default memo(InicioFimNode);
