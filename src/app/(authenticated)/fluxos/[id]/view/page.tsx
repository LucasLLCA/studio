"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { useFluxoDetalhe, useFluxoProcessos } from '@/lib/react-query/queries/useFluxos';
import FlowEditor from '@/components/flow-builder/FlowEditor';
import FlowProcessesList from '@/components/flow-builder/FlowProcessesList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Loader2 } from 'lucide-react';
import type { Node } from '@xyflow/react';

export default function FluxoViewPage() {
  return (
    <Suspense>
      <ReactFlowProvider>
        <FluxoViewContent />
      </ReactFlowProvider>
    </Suspense>
  );
}

function FluxoViewContent() {
  const params = useParams();
  const fluxoId = params.id as string;
  const router = useRouter();
  const { isAuthenticated, usuario } = usePersistedAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/');
    }
  }, [mounted, isAuthenticated, router]);

  const { data: fluxo, isLoading, error } = useFluxoDetalhe(fluxoId, usuario || '');
  const { data: processos = [] } = useFluxoProcessos(fluxoId, usuario || '');

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
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push('/fluxos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">{fluxo.nome}</h1>
        <Badge variant="outline">{fluxo.status}</Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => router.push(`/fluxos/${fluxoId}`)}>
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <FlowEditor
          fluxo={fluxo}
          onNodeSelect={() => {}}
          readOnly
        />

        <div className="w-72 border-l border-border bg-card overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-semibold">Processos Vinculados</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {processos.length} processo(s)
            </p>
          </div>
          <FlowProcessesList
            processos={processos}
            nodes={rfNodes}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
