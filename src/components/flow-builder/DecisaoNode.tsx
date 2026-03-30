'use client';

import React, { memo, useState } from 'react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';

const PRIO_RING: Record<string, string> = {
  baixa:   'ring-2 ring-green-500',
  media:   'ring-2 ring-amber-500',
  alta:    'ring-2 ring-orange-500',
  critica: 'ring-2 ring-red-500',
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

function DecisaoNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const prioridade = (d.prioridade as string) || '';
  const responsavel = d.responsavel as string | undefined;
  const descricao = d.descricao as string | undefined;
  const checklist = (d.checklist as Array<{ item: string; obrigatorio: boolean }>) || [];
  const documentos = (d.documentos_necessarios as string[]) || [];
  const meta = (d.metadata_extra as Record<string, unknown>) || {};
  const unidadeSigla = meta.unidade_sei_sigla as string | undefined;

  const [showInfo, setShowInfo] = useState(false);

  React.useEffect(() => {
    if (!selected) setShowInfo(false);
  }, [selected]);

  const docsCount = documentos.filter(Boolean).length;
  const hasInfo = !!(descricao || responsavel || prioridade || checklist.length || docsCount || unidadeSigla);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <NodeToolbar position={Position.Top} isVisible={!!unidadeSigla} offset={30} className="pointer-events-none">
        <span className="whitespace-nowrap text-2xs font-semibold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-700 shadow-sm">
          {unidadeSigla}
        </span>
      </NodeToolbar>
      {hasInfo && (
        <>
          <button
            className="absolute top-2 right-2 z-20 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-2xs font-bold flex items-center justify-center hover:bg-amber-300 leading-none select-none shadow"
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
              <p className="font-semibold text-foreground truncate">{d.nome as string}</p>
              {prioridade && (
                <span className={`inline-flex text-2xs font-semibold px-1.5 py-0.5 rounded border ${PRIO_BADGE[prioridade]}`}>
                  {PRIO_LABEL[prioridade]}
                </span>
              )}
              {unidadeSigla && <p className="text-muted-foreground">Caixa: <span className="font-medium">{unidadeSigla}</span></p>}
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

      <Handle type="target" position={Position.Top} className="!bg-amber-600 !w-3 !h-3" style={{ top: -6 }} />
      <div
        className={`absolute inset-0 border-2 border-amber-400 bg-amber-50 shadow-sm ${
          selected ? 'ring-2 ring-primary' : (prioridade && PRIO_RING[prioridade] ? PRIO_RING[prioridade] : '')
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
