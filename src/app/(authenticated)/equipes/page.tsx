"use client";

import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, Crown, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import {
  getMyTeams,
  getTeamDetail,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from '@/lib/api/teams-api-client';
import type { Team, TeamDetail, TeamMember } from '@/types/teams';

export default function EquipesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, usuario } = usePersistedAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Detail sheet
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Add member
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Delete confirmation
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (mounted && usuario) {
      loadTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthenticated, usuario]);

  const loadTeams = async () => {
    if (!usuario) return;
    setIsLoading(true);
    try {
      const result = await getMyTeams(usuario);
      if ('error' in result) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
        setTeams([]);
      } else {
        setTeams(result);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!usuario || !createName.trim()) return;
    setIsCreating(true);
    try {
      const result = await createTeam(usuario, createName.trim(), createDesc.trim() || undefined);
      if ('error' in result) {
        toast({ title: "Erro ao criar equipe", description: result.error, variant: "destructive" });
        return;
      }
      setTeams(prev => [result, ...prev]);
      setIsCreateOpen(false);
      setCreateName('');
      setCreateDesc('');
      toast({ title: "Equipe criada!" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenDetail = async (teamId: string) => {
    if (!usuario) return;
    setIsLoadingDetail(true);
    setIsDetailOpen(true);
    try {
      const result = await getTeamDetail(teamId, usuario);
      if ('error' in result) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
        setIsDetailOpen(false);
        return;
      }
      setSelectedTeam(result);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleAddMember = async () => {
    if (!usuario || !selectedTeam || !newMemberEmail.trim()) return;
    setIsAddingMember(true);
    try {
      const result = await addTeamMember(selectedTeam.id, usuario, newMemberEmail.trim());
      if ('error' in result) {
        toast({ title: "Erro ao adicionar membro", description: result.error, variant: "destructive" });
        return;
      }
      setSelectedTeam(prev => prev ? {
        ...prev,
        membros: [...prev.membros, result],
      } : prev);
      setNewMemberEmail('');
      toast({ title: "Membro adicionado!" });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (membroUsuario: string) => {
    if (!usuario || !selectedTeam) return;
    const result = await removeTeamMember(selectedTeam.id, usuario, membroUsuario);
    if ('error' in result) {
      toast({ title: "Erro ao remover membro", description: result.error, variant: "destructive" });
      return;
    }
    setSelectedTeam(prev => prev ? {
      ...prev,
      membros: prev.membros.filter(m => m.usuario !== membroUsuario),
    } : prev);
    toast({ title: "Membro removido" });
  };

  const handleDeleteTeam = async () => {
    if (!usuario || !deleteTeamId) return;
    const result = await deleteTeam(deleteTeamId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir equipe", description: result.error, variant: "destructive" });
    } else {
      setTeams(prev => prev.filter(t => t.id !== deleteTeamId));
      setIsDetailOpen(false);
      setSelectedTeam(null);
      toast({ title: "Equipe excluída" });
    }
    setDeleteTeamId(null);
  };

  const isOwner = (team: Team | TeamDetail) => team.proprietario_usuario === usuario;
  const isAdmin = (team: TeamDetail) =>
    team.membros.some(m => m.usuario === usuario && m.papel === 'admin');

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Users className="h-6 w-6" /> Equipes
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie suas equipes para compartilhar processos
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar Equipe
          </Button>
        </div>

        {/* Teams grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Users className="h-12 w-12 mb-3 text-gray-300" />
            <p>Nenhuma equipe ainda.</p>
            <Button variant="outline" className="mt-3" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Criar sua primeira equipe
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleOpenDetail(team.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {team.nome}
                    {isOwner(team) && (
                      <Badge variant="secondary" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                      </Badge>
                    )}
                  </CardTitle>
                  {team.descricao && (
                    <CardDescription className="text-xs line-clamp-2">{team.descricao}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    {team.total_membros} {team.total_membros === 1 ? 'membro' : 'membros'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Equipe</DialogTitle>
            <DialogDescription>
              Crie uma equipe para compartilhar processos com colegas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name">Nome</Label>
              <Input
                id="team-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome da equipe"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              />
            </div>
            <div>
              <Label htmlFor="team-desc">Descricao (opcional)</Label>
              <Input
                id="team-desc"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Descricao breve"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedTeam?.nome || 'Equipe'}</SheetTitle>
            <SheetDescription>
              {selectedTeam?.descricao || 'Detalhes da equipe'}
            </SheetDescription>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedTeam ? (
            <div className="mt-4 space-y-4">
              {/* Members */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Membros ({selectedTeam.membros.length})</h3>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {selectedTeam.membros.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-md border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{m.usuario}</span>
                          <Badge variant={m.papel === 'admin' ? 'default' : 'secondary'} className="text-xs">
                            {m.papel === 'admin' ? 'Proprietario' : 'Membro'}
                          </Badge>
                        </div>
                        {isAdmin(selectedTeam) && m.usuario !== usuario && (
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

              {/* Add member */}
              {isAdmin(selectedTeam) && (
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

              {/* Delete team */}
              {isOwner(selectedTeam) && (
                <>
                  <Separator />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setDeleteTeamId(selectedTeam.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir equipe
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTeamId} onOpenChange={(open) => { if (!open) setDeleteTeamId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A equipe e todos os seus dados serao removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
