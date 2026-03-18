"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  useFluxoDetalhe,
  useSaveFluxoCanvas,
  useUpdateFluxo,
  useFluxoProcessos,
  useAssignProcesso,
  useRemoveFluxoProcesso,
} from '@/lib/react-query/queries/useFluxos';
import FlowEditor from '@/components/flow-builder/FlowEditor';
import FlowToolbar from '@/components/flow-builder/FlowToolbar';
import NodePalette from '@/components/flow-builder/NodePalette';
import NodePropertiesPanel from '@/components/flow-builder/NodePropertiesPanel';
import ProcessAssignmentDialog from '@/components/flow-builder/ProcessAssignmentDialog';
import FlowProcessesList from '@/components/flow-builder/FlowProcessesList';
import { Loader2 } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { FluxoSaveCanvasPayload } from '@/types/fluxos';

export default function FluxoEditorPage() {
  return (
    <Suspense>
      <ReactFlowProvider>
        <FluxoEditorContent />
      </ReactFlowProvider>
    </Suspense>
  );
}

function FluxoEditorContent() {
  const params = useParams();
  const fluxoId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, usuario } = usePersistedAuth();
  const [mounted, setMounted] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/');
    }
  }, [mounted, isAuthenticated, router]);

  const { data: fluxo, isLoading, error, refetch: refetchFluxo } = useFluxoDetalhe(fluxoId, usuario || '');
  const { data: processos = [] } = useFluxoProcessos(fluxoId, usuario || '');
  const canvasMutation = useSaveFluxoCanvas(fluxoId, usuario || '');
  const updateMutation = useUpdateFluxo(usuario || '');
  const assignMutation = useAssignProcesso(fluxoId, usuario || '');
  const removeMutation = useRemoveFluxoProcesso(fluxoId, usuario || '');

  const handleSave = useCallback(() => {
    const buildPayload = (window as unknown as Record<string, unknown>).__flowEditorBuildPayload as (() => FluxoSaveCanvasPayload) | undefined;
    if (buildPayload) {
      canvasMutation.saveNow(buildPayload());
      setHasUnsaved(false);
    }
  }, [canvasMutation]);

  const handleDirty = useCallback(() => {
    setHasUnsaved(true);
  }, []);

  const handleNameChange = useCallback(
    (name: string) => {
      updateMutation.mutate({ fluxoId, updates: { nome: name } });
    },
    [fluxoId, updateMutation],
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      updateMutation.mutate({ fluxoId, updates: { status } });
    },
    [fluxoId, updateMutation],
  );

  const handleNodeUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
    const fn = (window as unknown as Record<string, unknown>).__flowEditorUpdateNodeData as
      | ((id: string, data: Record<string, unknown>) => void)
      | undefined;
    if (fn) fn(nodeId, data);
    // Update selectedNode locally for the panel
    setSelectedNode((prev) => (prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev));
  }, []);

  const handleAssign = useCallback(
    async (data: { numero_processo: string; numero_processo_formatado?: string; node_atual_id?: string; notas?: string }) => {
      try {
        await assignMutation.mutateAsync(data);
        toast({ title: 'Processo vinculado com sucesso!' });
        setAssignDialogOpen(false);
      } catch (err) {
        toast({ title: 'Erro ao vincular', description: (err as Error).message, variant: 'destructive' });
      }
    },
    [assignMutation, toast],
  );

  const handleRemoveProcesso = useCallback(
    async (processoId: string) => {
      try {
        await removeMutation.mutateAsync(processoId);
        toast({ title: 'Vinculação removida' });
      } catch (err) {
        toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' });
      }
    },
    [removeMutation, toast],
  );

  useEffect(() => {
    if (canvasMutation.isSuccess) {
      setHasUnsaved(false);
    }
  }, [canvasMutation.isSuccess]);

  useEffect(() => {
    if (canvasMutation.isError) {
      const errMsg = canvasMutation.error?.message || '';
      if (errMsg.includes('409') || errMsg.includes('Conflito')) {
        toast({
          title: 'Conflito de versão',
          description: 'Recarregando a versão mais recente...',
          variant: 'destructive',
        });
        refetchFluxo();
      } else {
        toast({ title: 'Erro ao salvar', description: errMsg, variant: 'destructive' });
      }
    }
  }, [canvasMutation.isError, canvasMutation.error, toast]);

  if (!mounted || !isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !fluxo) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <p className="text-destructive">Erro ao carregar fluxo: {error?.message || 'Não encontrado'}</p>
      </div>
    );
  }

  const rfNodes = ((window as unknown as Record<string, unknown>).__flowEditorNodes as Node[]) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      <FlowToolbar
        fluxoId={fluxoId}
        nome={fluxo.nome}
        status={fluxo.status}
        isSaving={canvasMutation.isPending}
        hasUnsavedChanges={hasUnsaved}
        onNameChange={handleNameChange}
        onStatusChange={handleStatusChange}
        onSave={handleSave}
        onAssignProcess={() => setAssignDialogOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <NodePalette />

        <FlowEditor
          fluxo={fluxo}
          onNodeSelect={setSelectedNode}
          onDirty={handleDirty}
        />

        {selectedNode ? (
          <NodePropertiesPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        ) : (
          <div className="w-72 border-l border-border bg-card overflow-y-auto flex-shrink-0">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-semibold">Processos Vinculados</h3>
            </div>
            <FlowProcessesList
              processos={processos}
              nodes={rfNodes}
              onRemove={handleRemoveProcesso}
            />
          </div>
        )}
      </div>

      <ProcessAssignmentDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssign={handleAssign}
        nodes={rfNodes}
        isLoading={assignMutation.isPending}
      />
    </div>
  );
}
