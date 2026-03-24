'use client';

import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  reconnectEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnReconnect,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SeiTaskNode from './SeiTaskNode';
import EtapaNode from './EtapaNode';
import DecisaoNode from './DecisaoNode';
import InicioFimNode from './InicioFimNode';
import ForkJoinNode from './ForkJoinNode';
import ConditionalEdge from './ConditionalEdge';
import LoopEdge from './LoopEdge';
import DefaultEdge from './DefaultEdge';

import type { FluxoDetalhe, FluxoSaveCanvasPayload } from '@/types/fluxos';

const nodeTypes: NodeTypes = {
  sei_task: SeiTaskNode,
  etapa: EtapaNode,
  decisao: DecisaoNode,
  inicio: InicioFimNode,
  fim: InicioFimNode,
  fork: ForkJoinNode,
  join: ForkJoinNode,
};

const edgeTypes: EdgeTypes = {
  padrao: DefaultEdge,
  condicional: ConditionalEdge,
  loop: LoopEdge,
};

// ── DB → React Flow ──────────────────────────────────────────

function dbToNodes(fluxo: FluxoDetalhe): Node[] {
  return fluxo.nodes.map((n) => ({
    id: n.node_id,
    type: n.tipo,
    position: { x: n.posicao_x, y: n.posicao_y },
    data: {
      nome: n.nome,
      tipo: n.tipo,
      descricao: n.descricao,
      sei_task_key: n.sei_task_key,
      responsavel: n.responsavel,
      duracao_estimada_horas: n.duracao_estimada_horas,
      prioridade: n.prioridade,
      documentos_necessarios: n.documentos_necessarios,
      checklist: n.checklist,
      regras_prazo: n.regras_prazo,
      metadata_extra: n.metadata_extra,
    },
    ...(n.largura && n.altura ? { width: n.largura, height: n.altura } : {}),
  }));
}

function dbToEdges(fluxo: FluxoDetalhe): Edge[] {
  const edgeMap = new Map<string, Edge>();
  
  fluxo.edges.forEach((e) => {
    const key = `${e.source_node_id}-${e.target_node_id}-${e.edge_id}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        id: e.edge_id,
        source: e.source_node_id,
        target: e.target_node_id,
        type: e.tipo === 'padrao' ? 'padrao' : e.tipo,
        label: e.label || undefined,
        animated: e.animated,
        data: {
          condicao: e.condicao,
          ordem: e.ordem,
        },
      });
    }
  });
  
  return Array.from(edgeMap.values());
}

// ── React Flow → Save Payload ────────────────────────────────

function buildPayload(
  nodes: Node[],
  edges: Edge[],
  viewport: { x: number; y: number; zoom: number } | null,
  versao: number,
): FluxoSaveCanvasPayload {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as Record<string, unknown>;
      return {
        node_id: n.id,
        tipo: n.type || 'etapa',
        nome: (d.nome as string) || 'Sem nome',
        descricao: (d.descricao as string) || null,
        sei_task_key: (d.sei_task_key as string) || null,
        responsavel: (d.responsavel as string) || null,
        duracao_estimada_horas: (d.duracao_estimada_horas as number) || null,
        prioridade: (d.prioridade as string) || null,
        documentos_necessarios: (d.documentos_necessarios as string[]) || null,
        checklist: (d.checklist as Array<{ item: string; obrigatorio: boolean }>) || null,
        regras_prazo: (d.regras_prazo as Record<string, unknown>) || null,
        metadata_extra: (d.metadata_extra as Record<string, unknown>) || null,
        posicao_x: n.position.x,
        posicao_y: n.position.y,
        largura: n.measured?.width ?? n.width ?? null,
        altura: n.measured?.height ?? n.height ?? null,
      };
    }),
    edges: edges.map((e) => ({
      edge_id: e.id,
      source_node_id: e.source,
      target_node_id: e.target,
      tipo: (!e.type || e.type === 'default') ? 'padrao' : e.type,
      label: (e.label as string) || null,
      condicao: ((e.data as Record<string, unknown>)?.condicao as Record<string, unknown>) || null,
      ordem: ((e.data as Record<string, unknown>)?.ordem as number) || null,
      animated: e.animated ?? false,
    })),
    viewport,
    versao,
  };
}

// ── Component ────────────────────────────────────────────────

interface FlowEditorProps {
  fluxo: FluxoDetalhe;
  onNodeSelect: (node: Node | null) => void;
  onDirty?: () => void;
  readOnly?: boolean;
}

export default function FlowEditor({
  fluxo,
  onNodeSelect,
  onDirty,
  readOnly = false,
}: FlowEditorProps) {
  const initialNodes = useMemo(() => dbToNodes(fluxo), [fluxo]);
  const initialEdges = useMemo(() => dbToEdges(fluxo), [fluxo]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const viewportRef = useRef<{ x: number; y: number; zoom: number } | null>(
    fluxo.viewport || null,
  );

  // Sync when fluxo changes (after save)
  React.useEffect(() => {
    setNodes(dbToNodes(fluxo));
    setEdges(dbToEdges(fluxo));
  }, [fluxo]);

  const { screenToFlowPosition } = useReactFlow();

  const markDirty = useCallback(() => {
    if (!readOnly && onDirty) onDirty();
  }, [readOnly, onDirty]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      markDirty();
    },
    [markDirty],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      markDirty();
    },
    [markDirty],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        // Verificar se já existe uma edge entre esses nós
        const exists = eds.some(
          (e) => e.source === connection.source && e.target === connection.target
        );
        if (exists) return eds;
        
        return addEdge({ ...connection, type: 'padrao' }, eds);
      });
      markDirty();
    },
    [markDirty],
  );

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
      markDirty();
    },
    [markDirty],
  );

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      markDirty();
    },
    [markDirty],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const parsed = JSON.parse(raw) as { tipo: string; nome: string; sei_task_key?: string };
      const reactFlowBounds = (e.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: e.clientX - reactFlowBounds.left,
        y: e.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: parsed.tipo,
        position,
        data: {
          nome: parsed.nome,
          tipo: parsed.tipo,
          sei_task_key: parsed.sei_task_key || null,
          descricao: null,
          responsavel: null,
          duracao_estimada_horas: null,
          prioridade: null,
          documentos_necessarios: null,
          checklist: null,
          regras_prazo: null,
          metadata_extra: null,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      markDirty();
    },
    [markDirty],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node);
    },
    [onNodeSelect],
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Method to update node data from properties panel
  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
    );
    markDirty();
  }, [markDirty]);

  // Adicionar nó ao clicar num item da palette (posiciona no centro visível do canvas)
  const addNodeFromPalette = useCallback((tipo: string, nome: string, seiTaskKey?: string) => {
    if (readOnly) return;
    // Pega o centro da tela e converte para coordenadas do flow
    const canvasEl = document.querySelector('.react-flow') as HTMLElement | null;
    const rect = canvasEl?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    // Pequena variação para não sobrepor nós existentes
    const offset = nodes.length * 20;
    const position = screenToFlowPosition({ x: cx + offset, y: cy + offset });

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: tipo,
      position,
      data: {
        nome,
        tipo,
        sei_task_key: seiTaskKey || null,
        descricao: null,
        responsavel: null,
        duracao_estimada_horas: null,
        prioridade: null,
        documentos_necessarios: null,
        checklist: null,
        regras_prazo: null,
        metadata_extra: null,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    markDirty();
  }, [readOnly, nodes.length, screenToFlowPosition, markDirty]);

  // Expose methods via ref-like pattern using a context or callback
  React.useEffect(() => {
    (window as unknown as Record<string, unknown>).__flowEditorNodes = nodes;
    (window as unknown as Record<string, unknown>).__flowEditorEdges = edges;
    (window as unknown as Record<string, unknown>).__flowEditorViewport = viewportRef.current;
    (window as unknown as Record<string, unknown>).__flowEditorUpdateNodeData = updateNodeData;
    (window as unknown as Record<string, unknown>).__flowEditorAddNode = addNodeFromPalette;
    (window as unknown as Record<string, unknown>).__flowEditorDeleteNode = (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    };
    (window as unknown as Record<string, unknown>).__flowEditorDeleteEdge = (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      if (onDirty) onDirty();
    };
    (window as unknown as Record<string, unknown>).__flowEditorBuildPayload = () =>
      buildPayload(nodes, edges, viewportRef.current, fluxo.versao);
  }, [nodes, edges, fluxo.versao, updateNodeData, addNodeFromPalette]);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onReconnect={readOnly ? undefined : onReconnect}
        onEdgeDoubleClick={readOnly ? undefined : onEdgeDoubleClick}
        onDragOver={readOnly ? undefined : onDragOver}
        onDrop={readOnly ? undefined : onDrop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={true}
        defaultViewport={fluxo.viewport || { x: 0, y: 0, zoom: 1 }}
        onMoveEnd={(_, viewport) => {
          viewportRef.current = viewport;
        }}
        fitView={!fluxo.viewport}
        deleteKeyCode={readOnly ? null : 'Delete'}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          className="!bg-card !border-border"
        />
      </ReactFlow>
    </div>
  );
}
