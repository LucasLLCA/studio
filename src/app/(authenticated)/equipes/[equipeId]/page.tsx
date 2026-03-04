"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Loader2, Settings, Users, Trash2, Plus, LogOut, Search, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getKanbanBoard } from '@/lib/api/team-tags-api-client';
import { createTag, removeProcessoFromTag } from '@/lib/api/tags-api-client';
import {
  addTeamMember,
  removeTeamMember,
  deleteTeam,
} from '@/lib/api/teams-api-client';
import { revokeShare, shareTag } from '@/lib/api/sharing-api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
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
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());

  const colunasVisiveis = useMemo(() => {
    if (!board) return [];
    let colunas = board.colunas;

    if (filterTagIds.size > 0) {
      colunas = colunas.filter(c => filterTagIds.has(c.tag_id));
    }

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
  }, [board, filterNumero, filterTagIds]);

  const filtroAtivo = filterNumero.trim() !== '' || filterTagIds.size > 0;

  // New group dialog
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

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
      router.push('/login');
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
    const result = await revokeShare(deleteColumnId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao remover grupo", description: result.error, variant: "destructive" });
    } else {
      setBoard(prev => prev ? {
        ...prev,
        colunas: prev.colunas.filter(c => c.compartilhamento_id !== deleteColumnId),
      } : prev);
      toast({ title: "Grupo removido do quadro" });
    }
    setDeleteColumnId(null);
  };

  const handleDeleteProcesso = async () => {
    if (!usuario || !deleteProcessoData || !board) return;
    setIsDeletingProcesso(true);
    try {
      // O processo está numa tag pessoal compartilhada com a equipe.
      // O endpoint requer o usuario dono da tag (compartilhado_por da coluna).
      const coluna = board.colunas.find(c => c.tag_id === deleteProcessoData.tag_id);
      const donoTag = coluna?.compartilhado_por ?? usuario;
      const result = await removeProcessoFromTag(deleteProcessoData.tag_id, deleteProcessoData.id, donoTag);
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

  const handleCreateGroup = async () => {
    if (!usuario || !newGroupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      // 1. Create the tag (grupo)
      const tagResult = await createTag(usuario, newGroupName.trim());
      if ('error' in tagResult) {
        toast({ title: "Erro ao criar grupo", description: tagResult.error, variant: "destructive" });
        return;
      }
      // 2. Share it with the team
      const shareResult = await shareTag(usuario, tagResult.id, { equipe_destino_id: equipeId });
      if ('error' in shareResult) {
        toast({ title: "Grupo criado, mas erro ao compartilhar", description: shareResult.error, variant: "destructive" });
        return;
      }
      setIsNewGroupOpen(false);
      setNewGroupName('');
      toast({ title: "Grupo criado!" });
      loadBoard();
    } finally {
      setIsCreatingGroup(false);
    }
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
          <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-1" /> Membros
          </Button>
          {!isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setIsLeaveTeamOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-1" /> Sair da equipe
            </Button>
          )}
          {isOwner && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setIsDeleteTeamOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir equipe
            </Button>
          )}
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex-shrink-0 border-b px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 bg-muted/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Número Processo..."
            value={filterNumero}
            onChange={(e) => setFilterNumero(e.target.value)}
            className="pl-8 h-8 text-sm w-52"
          />
          {filterNumero && (
            <button
              onClick={() => setFilterNumero('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {board.colunas.map(coluna => (
            <button
              key={coluna.tag_id}
              onClick={() => setFilterTagIds(prev => {
                const next = new Set(prev);
                if (next.has(coluna.tag_id)) next.delete(coluna.tag_id);
                else next.add(coluna.tag_id);
                return next;
              })}
              className={cn(
                'text-xs px-2.5 py-0.5 rounded-full border transition-colors',
                filterTagIds.has(coluna.tag_id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
            >
              {coluna.tag_nome}
            </button>
          ))}

          {filtroAtivo && (
            <button
              onClick={() => { setFilterNumero(''); setFilterTagIds(new Set()); }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {filtroAtivo && colunasVisiveis.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado para os filtros aplicados.</p>
              <button
                onClick={() => { setFilterNumero(''); setFilterTagIds(new Set()); }}
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

      {/* Team Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{board.equipe.nome}</SheetTitle>
            <SheetDescription>
              {board.equipe.descricao || 'Gerenciar membros da equipe'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Membros ({board.equipe.membros.length})</h3>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {board.equipe.membros.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-md border">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.usuario}</span>
                        <Badge variant={m.papel === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {m.papel === 'admin' ? <><Crown className="h-3 w-3 mr-1" />Proprietario</> : 'Membro'}
                        </Badge>
                      </div>
                      {isAdmin && m.usuario !== usuario && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemoveMember(m.usuario)}
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

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
                    />
                    <Button
                      size="sm"
                      onClick={handleAddMember}
                      disabled={!newMemberEmail.trim() || isAddingMember}
                    >
                      {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {!isOwner && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setIsLeaveTeamOpen(true)}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair da equipe
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Column Confirmation */}
      <AlertDialog open={!!deleteColumnId} onOpenChange={(open) => { if (!open) setDeleteColumnId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover grupo do quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              O compartilhamento sera revogado e o grupo nao aparecera mais neste quadro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColumn}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Processo Confirmation */}
      <AlertDialog open={!!deleteProcessoData} onOpenChange={(open) => { if (!open) setDeleteProcessoData(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover processo do grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              O processo{' '}
              <strong>
                {deleteProcessoData?.numero_processo_formatado || deleteProcessoData?.numero_processo}
              </strong>{' '}
              será removido deste grupo. O processo não será excluído do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingProcesso}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProcesso}
              disabled={isDeletingProcesso}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingProcesso ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Team Confirmation */}
      <AlertDialog open={isDeleteTeamOpen} onOpenChange={setIsDeleteTeamOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A equipe e todos os seus dados serao removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Team Confirmation */}
      <AlertDialog open={isLeaveTeamOpen} onOpenChange={setIsLeaveTeamOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Você perderá acesso ao quadro e aos grupos compartilhados desta equipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeavingTeam}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveTeam}
              disabled={isLeavingTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeavingTeam ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sair da equipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Group Dialog */}
      <Dialog open={isNewGroupOpen} onOpenChange={(open) => { if (!open) { setIsNewGroupOpen(false); setNewGroupName(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo grupo de processos</DialogTitle>
            <DialogDescription>
              Crie um grupo para organizar processos neste quadro.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="group-name">Nome</Label>
            <Input
              id="group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nome do grupo"
              onKeyDown={(e) => { if (e.key === 'Enter' && newGroupName.trim()) handleCreateGroup(); }}
            />
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" onClick={() => { setIsNewGroupOpen(false); setNewGroupName(''); }} disabled={isCreatingGroup}>
                Cancelar
              </Button>
              <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || isCreatingGroup}>
                {isCreatingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
