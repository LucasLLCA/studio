"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, GitBranch, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { useFluxos, useCreateFluxo, useDeleteFluxo } from '@/lib/react-query/queries/useFluxos';
import type { Fluxo } from '@/types/fluxos';

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-yellow-100 text-yellow-800',
  publicado: 'bg-green-100 text-green-800',
  arquivado: 'bg-gray-100 text-gray-600',
};

export default function FluxosPage() {
  return (
    <Suspense>
      <FluxosContent />
    </Suspense>
  );
}

function FluxosContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, usuario } = usePersistedAuth();
  const { hasModulo, isLoading: permissionsLoading } = usePermissions();
  const [mounted, setMounted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [activeTab, setActiveTab] = useState('meus');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !permissionsLoading && (!isAuthenticated || !hasModulo('fluxos'))) {
      router.push('/home');
    }
  }, [mounted, isAuthenticated, permissionsLoading, hasModulo, router]);

  const { data: fluxos = [], isLoading } = useFluxos(
    usuario || '',
    activeTab === 'equipe' ? undefined : undefined, // TODO: equipe selector
    activeTab === 'org' ? 'default' : undefined,
    statusFilter || undefined,
  );

  const createMutation = useCreateFluxo(usuario || '');
  const deleteMutation = useDeleteFluxo(usuario || '');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const result = await createMutation.mutateAsync({ nome: newName.trim(), descricao: newDesc || undefined });
      toast({ title: 'Fluxo criado com sucesso!' });
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      router.push(`/fluxos/${result.id}`);
    } catch (err) {
      toast({ title: 'Erro ao criar fluxo', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Fluxo excluído' });
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: (err as Error).message, variant: 'destructive' });
    }
  };

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Fluxos de Processos</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Fluxo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="meus">Meus Fluxos</TabsTrigger>
            <TabsTrigger value="equipe">Da Equipe</TabsTrigger>
            <TabsTrigger value="org">Organizacionais</TabsTrigger>
          </TabsList>

          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : fluxos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum fluxo encontrado</p>
              <Button variant="link" onClick={() => setCreateOpen(true)}>
                Criar seu primeiro fluxo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fluxos.map((fluxo: Fluxo) => (
                <div
                  key={fluxo.id}
                  className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/fluxos/${fluxo.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate flex-1">{fluxo.nome}</h3>
                    <Badge className={`ml-2 text-2xs ${STATUS_COLORS[fluxo.status] || ''}`}>
                      {fluxo.status}
                    </Badge>
                  </div>
                  {fluxo.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{fluxo.descricao}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{fluxo.node_count} etapas</span>
                    <span>{fluxo.edge_count} conexões</span>
                    <span>{fluxo.processo_count} processos</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-2xs text-muted-foreground">
                      {new Date(fluxo.atualizado_em).toLocaleDateString('pt-BR')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-6 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(fluxo.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Fluxo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Fluxo de Contratação"
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descreva o objetivo deste fluxo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Fluxo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
