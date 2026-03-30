"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToggleSet } from '@/hooks/use-toggle-set';
import { ArrowLeft, Loader2, Settings, Users, Trash2, LogOut, Search, Menu } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KanbanFilterBar, KanbanFilterBarMobile } from '@/components/kanban/KanbanFilterBar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useParams, useRouter } from 'next/navigation';
import { getKanbanBoard } from '@/lib/api/tags-api-client';
import { createGrupo, deleteGrupo, removeProcessoFromGrupo, moveProcessoEntreGrupos } from '@/lib/api/grupos-api-client';
import {
  addTeamMember,
  removeTeamMember,
  deleteTeam,
} from '@/lib/api/teams-api-client';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { NewGroupDialog } from '@/components/kanban/NewGroupDialog';
import { ProcessoKanbanSheet } from '@/components/kanban/ProcessoKanbanSheet';
import type { KanbanBoard as KanbanBoardType, KanbanProcesso, TeamMember, TeamTag } from '@/types/teams';
import { UserPlus, X, Crown } from 'lucide-react';

export default function EquipeKanbanPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const equipeId = params.equipeId as string;
  const { isAuthenticated, usuario } = usePersistedAuth();

  const [board, setBoard] = useState<KanbanBoardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Selected processo for detail sheet
  const [selectedProcesso, setSelectedProcesso] = useState<{ processo: KanbanProcesso; tagNome: string } | null>(null);

  // Delete column confirmation
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);

  // Delete processo confirmation
  const [deleteProcessoData, setDeleteProcessoData] = useState<KanbanProcesso | null>(null);
  const [isDeletingProcesso, setIsDeletingProcesso] = useState(false);

  // Delete team confirmation
  const [isDeleteTeamOpen, setIsDeleteTeamOpen] = useState(false);
  const [isLeaveTeamOpen, setIsLeaveTeamOpen] = useState(false);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);

  // Filtros do board
  const [filterNumero, setFilterNumero] = useState('');
  const { set: filterTagIds, toggle: toggleFilterTag, clear: clearFilterTags } = useToggleSet<string>();
  const { set: filterTeamTagIds, toggle: toggleFilterTeamTag, clear: clearFilterTeamTags } = useToggleSet<string>();
  const [tagFilterMode, setTagFilterMode] = useState<'and' | 'or'>('and');

  // Tags de observação que estão de fato aplicadas em pelo menos um processo do board
  const usedTeamTags = useMemo(() => {
    if (!board) return [];
    const seen = new Map<string, TeamTag>();
    for (const col of board.colunas) {
      for (const p of col.processos) {
        for (const t of (p.team_tags ?? [])) {
          if (!seen.has(t.id)) seen.set(t.id, t);
        }
      }
    }
    return Array.from(seen.values());
  }, [board]);

  const colunasVisiveis = useMemo(() => {
    if (!board) return [];
    let colunas = board.colunas;

    // Filtro por grupo (coluna do kanban)
    if (filterTagIds.size > 0) {
      colunas = colunas.filter(c => filterTagIds.has(c.tag_id));
    }

    // Filtro por tag de observação — AND: todas as tags selecionadas; OR: qualquer uma
    if (filterTeamTagIds.size > 0) {
      colunas = colunas
        .map(c => ({
          ...c,
          processos: c.processos.filter(p => {
            const processoTagIds = new Set((p.team_tags ?? []).map(t => t.id));
            if (tagFilterMode === 'and') {
              return [...filterTeamTagIds].every(tagId => processoTagIds.has(tagId));
            }
            return [...filterTeamTagIds].some(tagId => processoTagIds.has(tagId));
          }),
        }))
        .filter(c => c.processos.length > 0);
    }

    // Filtro por número de processo
    if (filterNumero.trim()) {
      const termo = filterNumero.trim().toLowerCase();
      colunas = colunas
        .map(c => ({
          ...c,
          processos: c.processos.filter(p =>
            p.numero_processo.toLowerCase().includes(termo) ||
            (p.numero_processo_formatado ?? '').toLowerCase().includes(termo)
          ),
        }))
        .filter(c => c.processos.length > 0);
    }

    return colunas;
  }, [board, filterNumero, filterTagIds, filterTeamTagIds, tagFilterMode]);

  const filtroAtivo = filterNumero.trim() !== '' || filterTagIds.size > 0 || filterTeamTagIds.size > 0;

  // New group dialog
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);

  // Team settings sheet
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadBoard = useCallback(async () => {
    if (!usuario || !equipeId) return;
    setIsLoading(true);
    try {
      const result = await getKanbanBoard(equipeId, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao carregar kanban", description: result.error, variant: "destructive" });
        return;
      }
      setBoard(result);
    } finally {
      setIsLoading(false);
    }
  }, [usuario, equipeId, toast]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/');
      return;
    }
    if (mounted && usuario) {
      loadBoard();
    }
  }, [mounted, isAuthenticated, usuario, loadBoard, router]);

  const handleAddMember = async () => {
    if (!usuario || !newMemberEmail.trim() || !board) return;
    setIsAddingMember(true);
    try {
      const result = await addTeamMember(equipeId, usuario, newMemberEmail.trim());
      if ('error' in result) {
        toast({ title: "Erro ao adicionar membro", description: result.error, variant: "destructive" });
        return;
      }
      setBoard(prev => prev ? {
        ...prev,
        equipe: {
          ...prev.equipe,
          membros: [...prev.equipe.membros, result],
        },
      } : prev);
      setNewMemberEmail('');
      toast({ title: "Membro adicionado!" });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (membroUsuario: string) => {
    if (!usuario) return;
    const result = await removeTeamMember(equipeId, usuario, membroUsuario);
    if ('error' in result) {
      toast({ title: "Erro ao remover membro", description: result.error, variant: "destructive" });
      return;
    }
    setBoard(prev => prev ? {
      ...prev,
      equipe: {
        ...prev.equipe,
        membros: prev.equipe.membros.filter(m => m.usuario !== membroUsuario),
      },
    } : prev);
    toast({ title: "Membro removido" });
  };

  const handleDeleteColumn = async () => {
    if (!usuario || !deleteColumnId) return;
    const result = await deleteGrupo(deleteColumnId, usuario);
    if ('error' in result) {
      const isInUse = result.status === 409;
      toast({
        title: isInUse ? "Grupo em uso" : "Erro ao remover grupo",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setBoard(prev => prev ? {
        ...prev,
        colunas: prev.colunas.filter(c => c.tag_id !== deleteColumnId),
      } : prev);
      toast({ title: "Grupo excluído" });
    }
    setDeleteColumnId(null);
  };

  const handleMoveProcesso = async (
    processo: import('@/types/teams').KanbanProcesso,
    sourceTagId: string,
    targetTagId: string,
  ) => {
    if (!usuario || !board) return;

    // Atualização otimista: move o card imediatamente na UI
    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        colunas: prev.colunas.map(col => {
          if (col.tag_id === sourceTagId) {
            return { ...col, processos: col.processos.filter(p => p.id !== processo.id) };
          }
          if (col.tag_id === targetTagId) {
            return { ...col, processos: [...col.processos, { ...processo, tag_id: targetTagId }] };
          }
          return col;
        }),
      };
    });

    const result = await moveProcessoEntreGrupos(
      sourceTagId,
      targetTagId,
      processo.id,
      usuario,
      processo.numero_processo,
      processo.numero_processo_formatado ?? undefined,
      processo.nota ?? undefined,
    );

    if ('error' in result) {
      const isAlreadyThere = result.status === 409;
      toast({
        title: isAlreadyThere ? 'Processo já está neste grupo' : 'Erro ao mover processo',
        description: isAlreadyThere
          ? 'O processo já pertence a este grupo. Nenhuma alteração foi feita.'
          : result.error,
        variant: isAlreadyThere ? 'default' : 'destructive',
      });
      loadBoard();
      return;
    }

    // Atualiza o id do processo no estado com o novo id retornado pelo backend.
    // Isso é necessário para que movimentos futuros (ex.: mover de volta)
    // usem o id correto do ProcessoSalvo recém-criado.
    const newProcessoId = result.newProcessoId;
    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        colunas: prev.colunas.map(col => {
          if (col.tag_id !== targetTagId) return col;
          return {
            ...col,
            processos: col.processos.map(p =>
              p.numero_processo === processo.numero_processo
                ? { ...p, id: newProcessoId }
                : p,
            ),
          };
        }),
      };
    });
  };

  const handleDeleteProcesso = async () => {
    if (!usuario || !deleteProcessoData || !board) return;
    setIsDeletingProcesso(true);
    try {
      const result = await removeProcessoFromGrupo(deleteProcessoData.tag_id, deleteProcessoData.id, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao remover processo", description: result.error, variant: "destructive" });
        return;
      }
      setBoard(prev => prev ? {
        ...prev,
        colunas: prev.colunas.map(col =>
          col.tag_id === deleteProcessoData.tag_id
            ? { ...col, processos: col.processos.filter(p => p.id !== deleteProcessoData.id) }
            : col
        ),
      } : prev);
      toast({ title: "Processo removido do grupo" });
      setDeleteProcessoData(null);
    } finally {
      setIsDeletingProcesso(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!usuario) return;
    const result = await deleteTeam(equipeId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir equipe", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Equipe excluida" });
      router.push('/equipes');
    }
    setIsDeleteTeamOpen(false);
  };

  const handleLeaveTeam = async () => {
    if (!usuario) return;
    setIsLeavingTeam(true);
    try {
      const result = await removeTeamMember(equipeId, usuario, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao sair da equipe", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Você saiu da equipe" });
      setIsSettingsOpen(false);
      router.push('/equipes');
    } finally {
      setIsLeavingTeam(false);
      setIsLeaveTeamOpen(false);
    }
  };

  const handleCreateGroup = async (name: string, _color?: string) => {
    if (!usuario) return;
    const result = await createGrupo(usuario, name, undefined, equipeId);
    if ('error' in result) {
      toast({ title: "Erro ao criar grupo", description: result.error, variant: "destructive" });
      throw new Error(result.error);
    }
    toast({ title: "Grupo criado!" });
    loadBoard();
  };

  const isAdmin = board?.equipe.membros.some(
    m => m.usuario === usuario && m.papel === 'admin'
  ) ?? false;

  const isOwner = board?.equipe.proprietario_usuario === usuario;

  if (!mounted || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-500">
        <p>Erro ao carregar o quadro da equipe.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/equipes')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/equipes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {board.equipe.nome}
            </h1>
            {board.equipe.descricao && (
              <p className="text-xs text-muted-foreground">{board.equipe.descricao}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Membros button — always visible */}
          <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Membros</span>
          </Button>

          {/* Owner: delete team — desktop only */}
          {isOwner && (
            <Button variant="outline" size="sm" className="hidden md:inline-flex text-destructive hover:text-destructive" onClick={() => setIsDeleteTeamOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir equipe
            </Button>
          )}

          {/* Mobile drawer for filters */}
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
                    colunas={board.colunas}
                    filterTagIds={filterTagIds}
                    onToggleTag={toggleFilterTag}
                    teamTags={usedTeamTags}
                    filterTeamTagIds={filterTeamTagIds}
                    onToggleTeamTag={toggleFilterTeamTag}
                    tagFilterMode={tagFilterMode}
                    onToggleFilterMode={() => setTagFilterMode(prev => prev === 'and' ? 'or' : 'and')}
                    onClearFilters={() => { setFilterNumero(''); clearFilterTags(); clearFilterTeamTags(); }}
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
      </div>

      {/* Desktop filter bar */}
      <KanbanFilterBar
        filterNumero={filterNumero}
        onFilterNumeroChange={setFilterNumero}
        colunas={board.colunas}
        filterTagIds={filterTagIds}
        onToggleTag={toggleFilterTag}
        teamTags={usedTeamTags}
        filterTeamTagIds={filterTeamTagIds}
        onToggleTeamTag={toggleFilterTeamTag}
        tagFilterMode={tagFilterMode}
        onToggleFilterMode={() => setTagFilterMode(prev => prev === 'and' ? 'or' : 'and')}
        onClearFilters={() => { setFilterNumero(''); clearFilterTags(); clearFilterTeamTags(); }}
        isFilterActive={filtroAtivo}
      />

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {filtroAtivo && colunasVisiveis.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px] h-full text-muted-foreground">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado para os filtros aplicados.</p>
              <button
                onClick={() => { setFilterNumero(''); clearFilterTags(); clearFilterTeamTags(); }}
                className="text-xs text-primary hover:underline mt-2 block mx-auto"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        ) : (
          <KanbanBoard
            colunas={colunasVisiveis}
            teamTags={board.team_tags}
            onProcessoClick={(processo, tagNome) => setSelectedProcesso({ processo, tagNome })}
            onDeleteColumn={isAdmin ? (id) => setDeleteColumnId(id) : undefined}
            onDeleteProcesso={(processo) => setDeleteProcessoData(processo)}
            onAddGroup={filtroAtivo ? undefined : () => setIsNewGroupOpen(true)}
            onMoveProcesso={handleMoveProcesso}
          />
        )}
      </div>

      {/* Processo Detail Sheet */}
      {selectedProcesso && (
        <ProcessoKanbanSheet
          isOpen={!!selectedProcesso}
          onOpenChange={(open) => { if (!open) setSelectedProcesso(null); }}
          processo={selectedProcesso.processo}
          equipeId={equipeId}
          onTagsChanged={loadBoard}
        />
      )}

      {/* Team Settings Sheet — responsive */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <div className="p-4 sm:p-6 border-b">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {board.equipe.nome}
              </SheetTitle>
              <SheetDescription>
                {board.equipe.descricao || 'Gerenciar membros da equipe'}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Members list */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Membros ({board.equipe.membros.length})</h3>
              <div className="space-y-2">
                {board.equipe.membros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {m.usuario.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm truncate block">{m.usuario}</span>
                        <Badge variant={m.papel === 'admin' ? 'default' : 'secondary'} className="text-2xs mt-0.5">
                          {m.papel === 'admin' ? <><Crown className="h-2.5 w-2.5 mr-0.5" />Proprietário</> : 'Membro'}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && m.usuario !== usuario && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleRemoveMember(m.usuario)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add member */}
            {isAdmin && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-2">Adicionar membro</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email do usuario"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember(); }}
                      className="h-10"
                    />
                    <Button onClick={handleAddMember} disabled={!newMemberEmail.trim() || isAddingMember} className="h-10 shrink-0">
                      {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom actions */}
          <div className="p-4 sm:p-6 border-t space-y-2">
            {!isOwner && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive h-10"
                onClick={() => { setIsSettingsOpen(false); setIsLeaveTeamOpen(true); }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair da equipe
              </Button>
            )}
            {isOwner && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive h-10"
                onClick={() => { setIsSettingsOpen(false); setIsDeleteTeamOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir equipe
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Column Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteColumnId}
        onOpenChange={(open) => { if (!open) setDeleteColumnId(null); }}
        title="Excluir grupo?"
        description="O grupo e todos os processos associados serao removidos deste quadro."
        onConfirm={handleDeleteColumn}
        confirmLabel="Excluir"
      />

      {/* Delete Processo Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteProcessoData}
        onOpenChange={(open) => { if (!open) setDeleteProcessoData(null); }}
        title="Remover processo do grupo?"
        description={`O processo ${deleteProcessoData?.numero_processo_formatado || deleteProcessoData?.numero_processo || ''} será removido deste grupo. O processo não será excluído do sistema.`}
        onConfirm={handleDeleteProcesso}
        isLoading={isDeletingProcesso}
      />

      {/* Delete Team Confirmation */}
      <DeleteConfirmDialog
        open={isDeleteTeamOpen}
        onOpenChange={setIsDeleteTeamOpen}
        title="Excluir equipe?"
        description="Esta acao nao pode ser desfeita. A equipe e todos os seus dados serao removidos."
        onConfirm={handleDeleteTeam}
        confirmLabel="Excluir"
      />

      {/* Leave Team Confirmation */}
      <DeleteConfirmDialog
        open={isLeaveTeamOpen}
        onOpenChange={setIsLeaveTeamOpen}
        title="Sair da equipe?"
        description="Você perderá acesso ao quadro e aos grupos compartilhados desta equipe."
        onConfirm={handleLeaveTeam}
        isLoading={isLeavingTeam}
        confirmLabel="Sair da equipe"
      />

      {/* New Group Dialog */}
      <NewGroupDialog
        open={isNewGroupOpen}
        onOpenChange={setIsNewGroupOpen}
        onSubmit={handleCreateGroup}
        title="Novo grupo de processos"
      />
    </div>
  );
}
