"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToggleSet } from '@/hooks/use-toggle-set';
import { Loader2, Search, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { KanbanFilterBar, KanbanFilterBarMobile } from '@/components/kanban/KanbanFilterBar';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { getMyGrupos, getGrupoWithProcessos, createGrupo, deleteGrupo, removeProcessoFromGrupo, moveProcessoEntreGrupos } from '@/lib/api/grupos-api-client';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { NewGroupDialog } from '@/components/kanban/NewGroupDialog';
import type { KanbanColumn, KanbanProcesso } from '@/types/teams';

export default function EspacoPessoalPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, usuario } = usePersistedAuth();

  const [colunas, setColunas] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterNumero, setFilterNumero] = useState('');
  const { set: filterTagIds, toggle: toggleFilterTag, clear: clearFilterTags } = useToggleSet<string>();

  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);

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

  const handleCreateGroup = useCallback(async (name: string, color?: string) => {
    if (!usuario) return;
    const result = await createGrupo(usuario, name, color);
    if ('error' in result) {
      toast({ title: 'Erro', description: (result as { error: string }).error, variant: 'destructive' });
      throw new Error((result as { error: string }).error);
    }
    toast({ title: 'Grupo criado!' });
    loadBoard();
  }, [usuario, toast, loadBoard]);

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
                <KanbanFilterBarMobile
                  filterNumero={filterNumero}
                  onFilterNumeroChange={setFilterNumero}
                  colunas={colunas}
                  filterTagIds={filterTagIds}
                  onToggleTag={toggleFilterTag}
                  onClearFilters={() => { setFilterNumero(''); clearFilterTags(); }}
                  isFilterActive={filtroAtivo}
                />
                <div className="p-4">
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full rounded-xl h-11">Fechar</Button>
                  </DrawerClose>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Desktop filter bar */}
      <KanbanFilterBar
        filterNumero={filterNumero}
        onFilterNumeroChange={setFilterNumero}
        colunas={colunas}
        filterTagIds={filterTagIds}
        onToggleTag={toggleFilterTag}
        onClearFilters={() => { setFilterNumero(''); clearFilterTags(); }}
        isFilterActive={filtroAtivo}
      />

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {filtroAtivo && colunasVisiveis.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px] h-full text-muted-foreground">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado.</p>
              <button onClick={() => { setFilterNumero(''); clearFilterTags(); }} className="text-xs text-primary hover:underline mt-2 block mx-auto">
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
      <NewGroupDialog
        open={isNewGroupOpen}
        onOpenChange={setIsNewGroupOpen}
        onSubmit={handleCreateGroup}
        showColorPicker
        title="Novo grupo de processos"
      />

      {/* Delete Column Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteColumnId}
        onOpenChange={(open) => { if (!open) setDeleteColumnId(null); }}
        title="Excluir grupo?"
        description="O grupo e todos os processos associados serão removidos."
        onConfirm={handleDeleteColumn}
        confirmLabel="Excluir"
      />

      {/* Delete Processo Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteProcessoData}
        onOpenChange={(open) => { if (!open) setDeleteProcessoData(null); }}
        title="Remover processo?"
        description="O processo será removido deste grupo."
        onConfirm={handleDeleteProcesso}
      />
    </div>
  );
}
