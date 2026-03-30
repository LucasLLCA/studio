'use client';

import React, { memo, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CheckCircle2, Clock, Circle, AlertTriangle, Building2, FileText, PenTool, Send, Inbox } from 'lucide-react';
import type { FluxoComplianceResult, FluxoNodeCompliance, ComplianceStatus, FluxoEdge } from '@/types/fluxos';
import DefaultEdge from './DefaultEdge';
import ConditionalEdge from './ConditionalEdge';
import LoopEdge from './LoopEdge';

// ── Status color config ──

const STATUS_STYLES: Record<ComplianceStatus, { border: string; bg: string; text: string; handleBg: string }> = {
  concluido: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', handleBg: '!bg-green-500' },
  em_andamento: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', handleBg: '!bg-blue-500' },
  pendente: { border: 'border-border', bg: 'bg-muted/50', text: 'text-muted-foreground', handleBg: '!bg-muted-foreground/60' },
  violado: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700', handleBg: '!bg-red-500' },
};

const ESCAPED_STYLES = { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', handleBg: '!bg-amber-500' };

const STATUS_ICONS: Record<ComplianceStatus, React.ReactNode> = {
  concluido: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  em_andamento: <Clock className="h-3.5 w-3.5 text-blue-600" />,
  pendente: <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />,
  violado: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,
};

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  concluido: 'Concluído',
  em_andamento: 'Atual',
  pendente: 'Dependente',
  violado: 'Pulado',
};

// ── Action button helper ──

function getNodeActions(nc: FluxoNodeCompliance, edges: FluxoEdge[]): Array<{ key: string; label: string; icon: React.ReactNode }> {
  if (nc.status !== 'pendente' && nc.status !== 'em_andamento') return [];
  if (['inicio', 'fim', 'fork', 'join'].includes(nc.node.tipo)) return [];
  const actions: Array<{ key: string; label: string; icon: React.ReactNode }> = [];
  actions.push({ key: 'receber', label: 'Receber', icon: <Inbox className="h-3 w-3" /> });
  const docs = nc.node.documentos_necessarios;
  if (docs && docs.length > 0) {
    actions.push({ key: 'documento', label: 'Doc', icon: <FileText className="h-3 w-3" /> });
    actions.push({ key: 'assinar', label: 'Assinar', icon: <PenTool className="h-3 w-3" /> });
  }
  if (edges.some(e => e.source_node_id === nc.node.node_id)) {
    actions.push({ key: 'tramitar', label: 'Tramitar', icon: <Send className="h-3 w-3" /> });
  }
  return actions;
}

// ── Custom compliance node components ──

function ComplianceTaskNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as ComplianceStatus;
  const escaped = d._escaped as boolean | undefined;
  const unidade = d._unidade as string | undefined;
  const actions = d._actions as Array<{ key: string; label: string; icon: React.ReactNode }> | undefined;
  const nome = d.nome as string;
  const taskKey = d.sei_task_key as string | undefined;
  const styles = escaped ? ESCAPED_STYLES : STATUS_STYLES[status];

  return (
    <div className={`relative px-3 py-2 rounded-lg border-2 shadow-sm min-w-[160px] max-w-[220px] ${styles.border} ${styles.bg}`}>
      <Handle type="target" position={Position.Top} className={`${styles.handleBg} !w-2.5 !h-2.5`} />

      {/* Status icon + label */}
      <div className="flex items-center gap-1.5 mb-1">
        {escaped ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : STATUS_ICONS[status]}
        <span className={`text-2xs font-semibold ${escaped ? 'text-amber-700' : styles.text}`}>
          {escaped ? 'Fora do fluxo' : STATUS_LABELS[status]}
        </span>
      </div>

      {/* Task key */}
      {taskKey && (
        <div className="text-2xs uppercase tracking-wide text-muted-foreground font-medium mb-0.5">{taskKey}</div>
      )}

      {/* Name */}
      <div className="text-xs font-semibold text-foreground truncate">{nome}</div>

      {/* Unidade */}
      {unidade && (
        <div className="flex items-center gap-0.5 mt-1 text-2xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {unidade}
        </div>
      )}

      {/* Action buttons */}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {actions.map((action) => (
            <button
              key={action.key}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-2xs font-medium rounded border bg-white hover:bg-muted/50 text-foreground"
              onClick={(e) => e.stopPropagation()}
              title="Em breve"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className={`${styles.handleBg} !w-2.5 !h-2.5`} />
    </div>
  );
}

function ComplianceInicioFimNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as ComplianceStatus;
  const escaped = d._escaped as boolean | undefined;
  const isInicio = (d.tipo as string) === 'inicio';
  const nome = d.nome as string;
  const unidade = d._unidade as string | undefined;
  const styles = escaped ? ESCAPED_STYLES : STATUS_STYLES[status];
  const baseColor = escaped
    ? 'border-amber-500 bg-amber-50'
    : isInicio ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';

  return (
    <div className={`relative px-3 py-2 rounded-lg border-2 shadow-sm min-w-[160px] max-w-[220px] ${baseColor}`}>
      {!isInicio && <Handle type="target" position={Position.Top} className={`${styles.handleBg} !w-2.5 !h-2.5`} />}

      {/* Status icon + label */}
      <div className="flex items-center gap-1.5 mb-1">
        {escaped ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> : STATUS_ICONS[status]}
        <span className={`text-2xs font-semibold ${escaped ? 'text-amber-700' : styles.text}`}>
          {escaped ? 'Fora do fluxo' : STATUS_LABELS[status]}
        </span>
      </div>

      {/* Name */}
      <div className="text-xs font-semibold text-foreground truncate">{nome}</div>

      {/* Unidade */}
      {unidade && (
        <div className="flex items-center gap-0.5 mt-1 text-2xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {unidade}
        </div>
      )}

      {isInicio && <Handle type="source" position={Position.Bottom} className={`${styles.handleBg} !w-2.5 !h-2.5`} />}
    </div>
  );
}

function ComplianceDecisaoNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as ComplianceStatus;
  const nome = d.nome as string;
  const styles = STATUS_STYLES[status];

  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      <Handle type="target" position={Position.Top} className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ top: -4 }} />
      <div
        className={`absolute inset-0 border-2 ${styles.border} ${styles.bg} shadow-sm`}
        style={{ transform: 'rotate(45deg)', borderRadius: 6 }}
      />
      <div className="relative z-10 text-center px-2" style={{ maxWidth: 70 }}>
        <div className="text-2xs font-semibold text-foreground leading-tight truncate">{nome}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ bottom: -4 }} />
      <Handle type="source" position={Position.Right} id="right" className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ right: -4 }} />
      <Handle type="source" position={Position.Left} id="left" className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ left: -4 }} />
    </div>
  );
}

function ComplianceForkJoinNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const status = d._status as ComplianceStatus;
  const isFork = (d.tipo as string) === 'fork';
  const styles = STATUS_STYLES[status];

  return (
    <div className="relative" style={{ width: 140, height: 22 }}>
      <div className={`flex items-center justify-center rounded border-2 ${styles.border} ${styles.bg} shadow-sm w-full h-full`}>
        <Handle type="target" position={Position.Top} className={`${styles.handleBg} !w-2.5 !h-2.5`} />
        <span className="text-2xs font-medium text-muted-foreground uppercase">{isFork ? 'Fork' : 'Join'}</span>
        <Handle type="source" position={Position.Bottom} className={`${styles.handleBg} !w-2.5 !h-2.5`} />
        {isFork && (
          <>
            <Handle type="source" position={Position.Bottom} id="left" className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ left: '25%' }} />
            <Handle type="source" position={Position.Bottom} id="right" className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ left: '75%' }} />
          </>
        )}
        {!isFork && (
          <>
            <Handle type="target" position={Position.Top} id="left" className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ left: '25%' }} />
            <Handle type="target" position={Position.Top} id="right" className={`${styles.handleBg} !w-2.5 !h-2.5`} style={{ left: '75%' }} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Memoized node types ──

const MemoTaskNode = memo(ComplianceTaskNode);
const MemoInicioFimNode = memo(ComplianceInicioFimNode);
const MemoDecisaoNode = memo(ComplianceDecisaoNode);
const MemoForkJoinNode = memo(ComplianceForkJoinNode);

const complianceNodeTypes: NodeTypes = {
  sei_task: MemoTaskNode,
  etapa: MemoTaskNode,
  inicio: MemoInicioFimNode,
  fim: MemoInicioFimNode,
  decisao: MemoDecisaoNode,
  fork: MemoForkJoinNode,
  join: MemoForkJoinNode,
};

const complianceEdgeTypes: EdgeTypes = {
  padrao: DefaultEdge,
  condicional: ConditionalEdge,
  loop: LoopEdge,
};

// ── Convert compliance result to ReactFlow nodes/edges ──

function complianceToNodes(result: FluxoComplianceResult): Node[] {
  const compMap = new Map(result.nodes.map((nc) => [nc.node.node_id, nc]));

  return result.fluxo.nodes.map((n) => {
    const nc = compMap.get(n.node_id);
    const actions = nc ? getNodeActions(nc, result.fluxo.edges) : [];

    return {
      id: n.node_id,
      type: n.tipo,
      position: { x: n.posicao_x, y: n.posicao_y },
      data: {
        nome: n.nome,
        tipo: n.tipo,
        descricao: n.descricao,
        sei_task_key: n.sei_task_key,
        responsavel: n.responsavel,
        documentos_necessarios: n.documentos_necessarios,
        metadata_extra: n.metadata_extra,
        // Compliance overlay data
        _status: nc?.status ?? 'pendente',
        _escaped: nc?.escapedFlow ?? false,
        _unidade: nc?.unidade ?? null,
        _actions: actions.length > 0 ? actions : undefined,
      },
      draggable: false,
      connectable: false,
      ...(n.largura && n.altura ? { width: n.largura, height: n.altura } : {}),
    };
  });
}

function complianceToEdges(result: FluxoComplianceResult): Edge[] {
  const edgeMap = new Map<string, Edge>();
  result.fluxo.edges.forEach((e) => {
    const key = `${e.source_node_id}-${e.target_node_id}-${e.edge_id}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        id: e.edge_id,
        source: e.source_node_id,
        target: e.target_node_id,
        type: e.tipo === 'padrao' ? 'padrao' : e.tipo,
        label: e.label || undefined,
        animated: e.animated,
        data: { condicao: e.condicao, ordem: e.ordem },
      });
    }
  });
  return Array.from(edgeMap.values());
}

// ── Main component ──

interface FlowComplianceGraphProps {
  result: FluxoComplianceResult;
}

export function FlowComplianceGraph({ result }: FlowComplianceGraphProps) {
  const nodes = useMemo(() => complianceToNodes(result), [result]);
  const edges = useMemo(() => complianceToEdges(result), [result]);

  return (
    <div className="h-[420px] w-full border rounded-lg overflow-hidden bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={complianceNodeTypes}
        edgeTypes={complianceEdgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
