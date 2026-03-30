'use client';

import React, { memo, useState } from 'react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';

const TASK_COLORS: Record<string, string> = {
  'analise': 'bg-blue-100 border-blue-400',
  'despacho': 'bg-yellow-100 border-yellow-400',
  'assinatura': 'bg-green-100 border-green-400',
  'publicacao': 'bg-purple-100 border-purple-400',
  'notificacao': 'bg-orange-100 border-orange-400',
  'default': 'bg-muted/50 border-muted-foreground/60',
};

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

function SeiTaskNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const taskKey = (d.sei_task_key as string) || '';
  const nome = d.nome as string;
  const responsavel = d.responsavel as string | undefined;
  const prioridade = (d.prioridade as string) || '';
  const descricao = d.descricao as string | undefined;
  const checklist = (d.checklist as Array<{ item: string; obrigatorio: boolean }>) || [];
  const documentos = (d.documentos_necessarios as string[]) || [];
  const meta = (d.metadata_extra as Record<string, unknown>) || {};
  const unidadeSigla = meta.unidade_sei_sigla as string | undefined;
  const colorClass = TASK_COLORS[taskKey] || TASK_COLORS.default;

  const [showInfo, setShowInfo] = useState(false);

  React.useEffect(() => {
    if (!selected) setShowInfo(false);
  }, [selected]);

  const docsCount = documentos.filter(Boolean).length;
  const hasInfo = !!(descricao || responsavel || prioridade || checklist.length || docsCount || unidadeSigla);

  return (
    <div
      className={`relative px-4 py-3 rounded-lg border-2 shadow-sm min-w-[180px] border-l-4 ${colorClass} ${
        prioridade && PRIO_BORDER[prioridade] ? PRIO_BORDER[prioridade] : ''
      } ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      <NodeToolbar position={Position.Top} isVisible={!!unidadeSigla} className="pointer-events-none">
        <span className="whitespace-nowrap text-2xs font-semibold px-1.5 py-0.5 rounded bg-muted/50 border border-border text-foreground shadow-sm">
          {unidadeSigla}
        </span>
      </NodeToolbar>

      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />

      {hasInfo && (
        <>
          <button
            className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-muted text-foreground text-2xs font-bold flex items-center justify-center hover:bg-muted-foreground/30 leading-none select-none"
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
                <span className={`inline-flex text-2xs font-semibold px-1.5 py-0.5 rounded border ${PRIO_BADGE[prioridade]}`}>
                  {PRIO_LABEL[prioridade]}
                </span>
              )}
              {unidadeSigla && (
                <p className="text-muted-foreground">Caixa: <span className="font-medium">{unidadeSigla}</span></p>
              )}
              {responsavel && (
                <p className="text-muted-foreground">Responsável: {responsavel}</p>
              )}
              {descricao && (
                <p className="text-muted-foreground line-clamp-4">{descricao}</p>
              )}
              {docsCount > 0 && (
                <p className="text-muted-foreground">{docsCount} documento{docsCount > 1 ? 's' : ''}</p>
              )}
              {checklist.length > 0 && (
                <p className="text-muted-foreground">
                  Checklist: {checklist.filter((c) => c.obrigatorio).length} obrigatório{checklist.filter((c) => c.obrigatorio).length !== 1 ? 's' : ''} / {checklist.length} total
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="text-2xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
        {taskKey || 'SEI Task'}
      </div>
      <div className="text-sm font-semibold text-foreground truncate pr-5">{nome}</div>
      {responsavel && (
        <div className="text-xs text-muted-foreground mt-1 truncate">{responsavel}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-3 !h-3" />
    </div>
  );
}

export default memo(SeiTaskNode);
