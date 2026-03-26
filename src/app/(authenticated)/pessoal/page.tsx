"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Search, X as XIcon, Info, User, Plus, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getMyGrupos, getGrupoWithProcessos, createGrupo, deleteGrupo, removeProcessoFromGrupo, moveProcessoEntreGrupos } from '@/lib/api/grupos-api-client';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import type { KanbanColumn, KanbanProcesso } from '@/types/teams';

export default function EspacoPessoalPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, usuario } = usePersistedAuth();

  const [colunas, setColunas] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterNumero, setFilterNumero] = useState('');
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());

  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [deleteProcessoData, setDeleteProcessoData] = useState<{ processo: KanbanProcesso; grupoId: string } | null>(null);

  const loadBoard = useCallback(async () => {
    if (!usuario) return;
    try {
      const grupos = await getMyGrupos(usuario);
      if ('error' in grupos) { setError((grupos as { error: string }).error); return; }

      // Load processos for each grupo
      const colunasData: KanbanColumn[] = [];
      for (const grupo of grupos) {
        const detail = await getGrupoWithProcessos(grupo.id, usuario);
        if ('error' in detail) continue;
        colunasData.push({
          tag_id: detail.id,
          tag_nome: detail.nome,
          tag_cor: detail.cor || null,
          criado_por: detail.usuario,
          processos: (detail.processos || []).map(p => ({ ...p, team_tags: [] })),
        });
      }
      setColunas(colunasData);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [usuario]);

  useEffect(() => { if (usuario) loadBoard(); }, [usuario, loadBoard]);

  const handleCreateGroup = useCallback(async () => {
    if (!usuario || !newGroupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      const result = await createGrupo(usuario, newGroupName.trim(), newGroupColor);
      if ('error' in result) {
        toast({ title: 'Erro', description: (result as { error: string }).error, variant: 'destructive' });
      } else {
        toast({ title: 'Grupo criado!' });
        setNewGroupName('');
        setIsNewGroupOpen(false);
        loadBoard();
      }
    } finally {
      setIsCreatingGroup(false);
    }
  }, [usuario, newGroupName, newGroupColor, toast, loadBoard]);

  const handleDeleteColumn = useCallback(async () => {
    if (!deleteColumnId || !usuario) return;
    const result = await deleteGrupo(deleteColumnId, usuario);
    if ('error' in result) {
      toast({ title: 'Erro', description: (result as { error: string }).error, variant: 'destructive' });
    } else {
      toast({ title: 'Grupo excluído' });
      loadBoard();
    }
    setDeleteColumnId(null);
  }, [deleteColumnId, usuario, toast, loadBoard]);

  const handleDeleteProcesso = useCallback(async () => {
    if (!deleteProcessoData || !usuario) return;
    const result = await removeProcessoFromGrupo(deleteProcessoData.grupoId, deleteProcessoData.processo.id, usuario);
    if ('error' in result) {
      toast({ title: 'Erro', description: (result as { error: string }).error, variant: 'destructive' });
    } else {
      toast({ title: 'Processo removido' });
      loadBoard();
    }
    setDeleteProcessoData(null);
  }, [deleteProcessoData, usuario, toast, loadBoard]);

  const handleMoveProcesso = useCallback(async (processo: KanbanProcesso, sourceGrupoId: string, targetGrupoId: string) => {
    if (!usuario) return;
    const processoId = processo.id;
    const result = await moveProcessoEntreGrupos(sourceGrupoId, targetGrupoId, processoId, usuario, processo.numero_processo, processo.numero_processo_formatado || undefined, processo.nota || undefined);
    if ('error' in result) {
      toast({ title: 'Erro ao mover', description: (result as { error: string }).error, variant: 'destructive' });
      loadBoard();
    } else {
      // Optimistic update
      setColunas(prev => {
        const next = prev.map(c => ({ ...c, processos: [...c.processos] }));
        const srcCol = next.find(c => c.tag_id === sourceGrupoId);
        const tgtCol = next.find(c => c.tag_id === targetGrupoId);
        if (srcCol && tgtCol) {
          const idx = srcCol.processos.findIndex(p => p.id === processoId);
          if (idx >= 0) {
            const [moved] = srcCol.processos.splice(idx, 1);
            moved.id = result.newProcessoId;
            tgtCol.processos.push(moved);
          }
        }
        return next;
      });
    }
  }, [usuario, colunas, toast, loadBoard]);

  const filtroAtivo = filterNumero.trim().length > 0 || filterTagIds.size > 0;

  const colunasVisiveis = useMemo(() => {
    let result = colunas;
    if (filterTagIds.size > 0) {
      result = result.filter(c => filterTagIds.has(c.tag_id));
    }
    if (filterNumero.trim()) {
      const q = filterNumero.replace(/\D/g, '');
      result = result.map(c => ({
        ...c,
        processos: c.processos.filter(p => p.numero_processo.replace(/\D/g, '').includes(q)),
      })).filter(c => c.processos.length > 0);
    }
    return result;
  }, [colunas, filterTagIds, filterNumero]);

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] gap-3">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={loadBoard}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Espaço Pessoal
          </h1>
          <p className="text-xs text-muted-foreground">Seus grupos de processos</p>
        </div>

        {/* Mobile drawer */}
        <div className="md:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-3xl">
              <div className="mx-auto w-full max-w-md">
                <DrawerHeader className="text-center pb-2">
                  <DrawerTitle>Filtros</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-primary">Buscar</p>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input placeholder="Número Processo..." value={filterNumero} onChange={(e) => setFilterNumero(e.target.value)} className="pl-8 h-10 rounded-xl" />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-primary">Grupos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {colunas.map(coluna => (
                        <button key={coluna.tag_id} onClick={() => setFilterTagIds(prev => { const next = new Set(prev); if (next.has(coluna.tag_id)) next.delete(coluna.tag_id); else next.add(coluna.tag_id); return next; })} className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', filterTagIds.has(coluna.tag_id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border')}>
                          {coluna.tag_nome}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full rounded-xl h-12">Fechar</Button>
                  </DrawerClose>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Desktop filter bar */}
      <div className="hidden md:block flex-shrink-0 border-b px-4 sm:px-6 py-2 space-y-2 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Número Processo..." value={filterNumero} onChange={(e) => setFilterNumero(e.target.value)} className="pl-8 h-8 text-sm" />
            {filterNumero && (
              <button onClick={() => setFilterNumero('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {filtroAtivo && (
            <button onClick={() => { setFilterNumero(''); setFilterTagIds(new Set()); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0">
              Limpar filtros
            </button>
          )}
        </div>

        <Separator />

        {/* Grupos — horizontal scroll */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">Grupos</span>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Clique em um grupo para filtrar os processos.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <ScrollArea className="flex-1">
            <div className="flex items-center gap-1.5 pb-1">
              {colunas.map(coluna => (
                <button key={coluna.tag_id} onClick={() => setFilterTagIds(prev => { const next = new Set(prev); if (next.has(coluna.tag_id)) next.delete(coluna.tag_id); else next.add(coluna.tag_id); return next; })} className={cn('text-xs px-2.5 py-0.5 rounded-full border transition-colors shrink-0', filterTagIds.has(coluna.tag_id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground')}>
                  {coluna.tag_nome}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {filtroAtivo && colunasVisiveis.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px] h-full text-muted-foreground">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado.</p>
              <button onClick={() => { setFilterNumero(''); setFilterTagIds(new Set()); }} className="text-xs text-primary hover:underline mt-2 block mx-auto">
                Limpar filtros
              </button>
            </div>
          </div>
        ) : (
          <KanbanBoard
            colunas={colunasVisiveis}
            teamTags={[]}
            onProcessoClick={(processo) => {
              router.push(`/processo/${processo.numero_processo}/visualizar`);
            }}
            onDeleteColumn={(id) => setDeleteColumnId(id)}
            onDeleteProcesso={(processo) => {
              const grupoId = colunas.find(c => c.processos.some(p => p.id === processo.id))?.tag_id;
              if (grupoId) setDeleteProcessoData({ processo, grupoId });
            }}
            onAddGroup={filtroAtivo ? undefined : () => setIsNewGroupOpen(true)}
            onMoveProcesso={handleMoveProcesso}
          />
        )}
      </div>

      {/* New Group Dialog */}
      <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo grupo de processos</DialogTitle>
            <DialogDescription>Crie um grupo para organizar seus processos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Ex: Em análise" className="mt-1" onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); }} />
            </div>
            <div>
              <Label>Cor</Label>
              <input type="color" value={newGroupColor} onChange={(e) => setNewGroupColor(e.target.value)} className="mt-1 h-8 w-full rounded border cursor-pointer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewGroupOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreatingGroup}>
              {isCreatingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation */}
      <AlertDialog open={!!deleteColumnId} onOpenChange={(open) => { if (!open) setDeleteColumnId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>O grupo e todos os processos associados serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColumn} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Processo Confirmation */}
      <AlertDialog open={!!deleteProcessoData} onOpenChange={(open) => { if (!open) setDeleteProcessoData(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover processo?</AlertDialogTitle>
            <AlertDialogDescription>O processo será removido deste grupo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProcesso} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
