"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, ChevronRight, ChevronDown, Users, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { getMyGrupos, getGrupoWithProcessos, createGrupo, saveProcessoToGrupo, deleteGrupo, removeProcessoFromGrupo } from '@/lib/api/grupos-api-client';
import { getMyTeams } from '@/lib/api/teams-api-client';
import { getKanbanBoard, salvarProcessoNoKanban } from '@/lib/api/tags-api-client';
import { formatProcessNumber } from '@/lib/utils';
import type { GrupoProcesso } from '@/types/teams';

type SelectedGroup =
  | { type: 'personal'; tagId: string; tagNome: string }
  | { type: 'team'; tagId: string; tagNome: string; equipeId: string; equipeNome: string };

type ProcessoItem = {
  id: string;
  numero_processo: string;
  numero_processo_formatado: string | null;
};

type GrupoComProcessos = {
  type: 'personal' | 'team';
  tagId: string;
  tagNome: string;
  tagCor: string | null;
  equipeId?: string;
  equipeNome?: string;
  processos: ProcessoItem[];
};

type EquipeComColunas = {
  equipeId: string;
  equipeNome: string;
  colunas: GrupoComProcessos[];
};

interface SaveProcessoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroProcesso: string;
  numeroProcessoFormatado?: string;
  onSaveSuccess?: () => void;
}

export function SaveProcessoModal({
  open,
  onOpenChange,
  numeroProcesso,
  numeroProcessoFormatado,
  onSaveSuccess,
}: SaveProcessoModalProps) {
  const { toast } = useToast();
  const { usuario } = usePersistedAuth();


  // Grupos pessoais (criados pelo usuário)
  const [grupos, setGrupos] = useState<GrupoComProcessos[]>([]);
  // Equipes com suas colunas kanban
  const [equipes, setEquipes] = useState<EquipeComColunas[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [removingProcessoId, setRemovingProcessoId] = useState<string | null>(null);
  const [confirmDeleteGrupo, setConfirmDeleteGrupo] = useState<{ tagId: string; tagNome: string; totalProcessos: number } | null>(null);
  const [confirmRemoveProcesso, setConfirmRemoveProcesso] = useState<{ tagId: string; processoId: string; label: string } | null>(null);

  // Chaves de itens expandidos (prefixo: "g-{tagId}" para grupos, "e-{equipeId}" para equipes)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Seções colapsáveis
  const [gruposOpen, setGruposOpen] = useState(true);
  const [equipesOpen, setEquipesOpen] = useState(true);

  // Grupo selecionado como destino do save
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  useEffect(() => {
    if (open && usuario) loadData();
    if (!open) {
      setSelectedGroup(null);
      setNewTagName('');
      setIsCreatingTag(false);
      setGruposOpen(true);
      setEquipesOpen(true);
      setExpandedKeys(new Set());
      setGrupos([]);
      setEquipes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, usuario]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const loadData = async () => {
    if (!usuario) return;
    setIsLoading(true);
    try {
      const [gruposResult, teamsResult] = await Promise.all([
        getMyGrupos(usuario),
        getMyTeams(usuario),
      ]);

      const fetchedGrupos = !('error' in gruposResult) ? gruposResult : [];
      const fetchedTeams = !('error' in teamsResult) ? teamsResult : [];

      const [grupoDetailResults, kanbanResults] = await Promise.all([
        Promise.all(fetchedGrupos.map((g: GrupoProcesso) => getGrupoWithProcessos(g.id, usuario!))),
        Promise.all(fetchedTeams.map((team: Team) => getKanbanBoard(team.id, usuario!))),
      ]);

      // Grupos pessoais
      const personalGrupos: GrupoComProcessos[] = fetchedGrupos.map((g: GrupoProcesso, i: number) => {
        const result = grupoDetailResults[i];
        const processos: ProcessoItem[] = !('error' in result)
          ? result.processos.map((p: any) => ({
              id: p.id,
              numero_processo: p.numero_processo,
              numero_processo_formatado: p.numero_processo_formatado ?? null,
            }))
          : [];
        return {
          type: 'personal' as const,
          tagId: g.id,
          tagNome: g.nome,
          tagCor: g.cor ?? null,
          processos,
        };
      });

      // Equipes com suas colunas kanban
      const equipesArray: EquipeComColunas[] = fetchedTeams
        .map((team: Team, i: number) => {
          const result = kanbanResults[i];
          if ('error' in result) return null;
          const colunas: GrupoComProcessos[] = result.colunas
            .map((col: any) => ({
              type: 'team' as const,
              tagId: col.tag_id,
              tagNome: col.tag_nome,
              tagCor: col.tag_cor ?? null,
              equipeId: team.id,
              equipeNome: team.nome,
              processos: (col.processos || []).map((p: any) => ({
                id: p.id,
                numero_processo: p.numero_processo,
                numero_processo_formatado: p.numero_processo_formatado ?? null,
              })),
            }));
          return { equipeId: team.id, equipeNome: team.nome, colunas };
        })
        .filter(Boolean) as EquipeComColunas[];

      setGrupos(personalGrupos);
      setEquipes(equipesArray);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!usuario || !newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const result = await createGrupo(usuario, newTagName.trim());
      if ('error' in result) {
        toast({ title: "Erro ao criar grupo", description: result.error, variant: "destructive" });
        return;
      }
      const novoGrupo: GrupoComProcessos = {
        type: 'personal',
        tagId: result.id,
        tagNome: result.nome,
        tagCor: result.cor ?? null,
        processos: [],
      };
      setGrupos(prev => [novoGrupo, ...prev]);
      setSelectedGroup({ type: 'personal', tagId: result.id, tagNome: result.nome });
      setNewTagName('');
      setGruposOpen(true);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleDeleteTagConfirmed = async () => {
    if (!usuario || !confirmDeleteGrupo) return;
    const { tagId, tagNome } = confirmDeleteGrupo;
    setConfirmDeleteGrupo(null);
    setDeletingTagId(tagId);
    try {
      const result = await deleteGrupo(tagId, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao excluir grupo", description: result.error, variant: "destructive" });
        return;
      }
      if (selectedGroup?.type === 'personal' && selectedGroup.tagId === tagId) {
        setSelectedGroup(null);
      }
      toast({ title: "Grupo excluído", description: `"${tagNome}" foi removido.` });
      await loadData();
    } finally {
      setDeletingTagId(null);
    }
  };

  const handleRemoveProcesso = async (tagId: string, processoId: string, numeroProcessoLabel: string) => {
    if (!usuario) return;
    setRemovingProcessoId(processoId);
    try {
      const result = await removeProcessoFromGrupo(tagId, processoId, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao remover processo", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Processo removido", description: `"${numeroProcessoLabel}" foi removido do grupo.` });
      await loadData();
    } finally {
      setRemovingProcessoId(null);
    }
  };

  const handleSave = async () => {
    if (!usuario || !selectedGroup) return;
    setIsSaving(true);
    try {
      if (selectedGroup.type === 'team') {
        const result = await salvarProcessoNoKanban(
          selectedGroup.equipeId,
          selectedGroup.tagId,
          numeroProcesso,
          numeroProcessoFormatado,
          usuario,
        );
        if ('error' in result) {
          const description = result.status === 409
            ? `Este processo já está salvo no grupo "${selectedGroup.tagNome}".`
            : result.error;
          toast({ title: "Erro ao salvar", description, variant: "destructive" });
          return;
        }
      } else {
        const saveResult = await saveProcessoToGrupo(
          selectedGroup.tagId,
          usuario,
          numeroProcesso,
          numeroProcessoFormatado || formatProcessNumber(numeroProcesso),
        );
        if ('error' in saveResult) {
          const description = saveResult.status === 409
            ? `Este processo já está salvo no grupo "${selectedGroup.tagNome}".`
            : saveResult.error;
          toast({ title: "Erro ao salvar", description, variant: "destructive" });
          return;
        }
      }

      toast({
        title: "Processo salvo com sucesso!",
        description: `Salvo no grupo "${selectedGroup.tagNome}"`,
      });
      onSaveSuccess?.();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Verifica se o processo já está salvo no grupo selecionado
  const isAlreadySaved = (() => {
    if (!selectedGroup) return false;
    if (selectedGroup.type === 'personal') {
      const grupo = grupos.find(g => g.tagId === selectedGroup.tagId);
      return grupo?.processos.some(p => p.numero_processo === numeroProcesso) ?? false;
    } else {
      const equipe = equipes.find(e => e.equipeId === selectedGroup.equipeId);
      const col = equipe?.colunas.find(c => c.tagId === selectedGroup.tagId);
      return col?.processos.some(p => p.numero_processo === numeroProcesso) ?? false;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Processo</DialogTitle>
          <DialogDescription>
            Selecione um grupo para salvar este processo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Processo: <span className="font-bold">{formatProcessNumber(numeroProcesso)}</span></Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecione um grupo ou crie um novo grupo para salvar este processo.
              </p>
            </div>

            {/* Criar novo grupo pessoal */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do novo grupo..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newTagName.trim()) handleCreateTag(); }}
              />
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim() || isCreatingTag}>
                {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            <ScrollArea className="h-[320px] border rounded-md p-2 space-y-1">

              {/* ── MEUS GRUPOS ─────────────────────────────────────── */}
              <button
                type="button"
                onClick={() => setGruposOpen(p => !p)}
                className="flex items-center justify-between w-full px-1 py-1.5 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Meus Grupos
                  </span>
                  <Badge variant="secondary" className="text-xs">{grupos.length}</Badge>
                </div>
                {gruposOpen
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>

              {gruposOpen && (
                <div className="mb-2 space-y-0.5">
                  {grupos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo criado.</p>
                  ) : (
                    grupos.map(grupo => {
                      const expandKey = `g-${grupo.tagId}`;
                      const isExpanded = expandedKeys.has(expandKey);
                      const isSelected = selectedGroup?.type === 'personal' && selectedGroup.tagId === grupo.tagId;

                      return (
                        <div key={grupo.tagId}>
                          {/* Cabeçalho do grupo pessoal */}
                          <div className={`flex items-center rounded-md border transition-colors group/grupo ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50 border-transparent'
                          }`}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGroup({ type: 'personal', tagId: grupo.tagId, tagNome: grupo.tagNome });
                                toggleExpand(expandKey);
                              }}
                              className="flex-1 text-left p-2 flex items-center justify-between min-w-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {grupo.tagCor && (
                                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: grupo.tagCor }} />
                                )}
                                <span className="text-sm font-medium truncate">{grupo.tagNome}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                <span className="text-xs text-muted-foreground">{grupo.processos.length} processo(s)</span>
                                {isExpanded
                                  ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                }
                              </div>
                            </button>
                            {/* Botão excluir grupo — só aparece quando o grupo está vazio */}
                            {grupo.processos.length === 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteGrupo({ tagId: grupo.tagId, tagNome: grupo.tagNome, totalProcessos: 0 });
                                }}
                                disabled={deletingTagId === grupo.tagId}
                                className="flex-shrink-0 px-2 py-2 opacity-0 group-hover/grupo:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-50"
                                title="Excluir grupo"
                              >
                                {deletingTagId === grupo.tagId
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />
                                }
                              </button>
                            )}
                          </div>

                          {/* Processos do grupo expandido */}
                          {isExpanded && (
                            <div className="ml-4 border-l border-border pl-2 mt-0.5 mb-1 space-y-0.5">
                              {grupo.processos.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">Nenhum processo neste grupo.</p>
                              ) : (
                                grupo.processos.map(p => {
                                  const label = p.numero_processo_formatado || formatProcessNumber(p.numero_processo);
                                  return (
                                    <div key={p.id} className="flex items-center gap-2 px-1 py-0.5 rounded group/processo hover:bg-gray-50">
                                      <span className="text-xs text-muted-foreground flex-1 truncate">
                                        {label}
                                      </span>
                                      <Badge className="text-xs bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 flex-shrink-0">
                                        Já salvo
                                      </Badge>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmRemoveProcesso({ tagId: grupo.tagId, processoId: p.id, label })}
                                        disabled={removingProcessoId === p.id}
                                        className="flex-shrink-0 opacity-0 group-hover/processo:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-50"
                                        title="Remover do grupo"
                                      >
                                        {removingProcessoId === p.id
                                          ? <Loader2 className="h-3 w-3 animate-spin" />
                                          : <Trash2 className="h-3 w-3" />
                                        }
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="border-t my-1" />

              {/* ── MINHAS EQUIPES ───────────────────────────────────── */}
              <button
                type="button"
                onClick={() => setEquipesOpen(p => !p)}
                className="flex items-center justify-between w-full px-1 py-1.5 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Minhas Equipes
                  </span>
                  <Badge variant="secondary" className="text-xs">{equipes.length}</Badge>
                </div>
                {equipesOpen
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>

              {equipesOpen && (
                <div className="space-y-0.5">
                  {equipes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhuma equipe encontrada.</p>
                  ) : (
                    equipes.map(equipe => {
                      const equipeKey = `e-${equipe.equipeId}`;
                      const isEquipeExpanded = expandedKeys.has(equipeKey);

                      return (
                        <div key={equipe.equipeId}>
                          {/* Cabeçalho da equipe */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(equipeKey)}
                            className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-sm font-medium text-left truncate">{equipe.equipeNome}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              <span className="text-xs text-muted-foreground">{equipe.colunas.length} grupo(s)</span>
                              {isEquipeExpanded
                                ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              }
                            </div>
                          </button>

                          {/* Colunas (grupos) da equipe */}
                          {isEquipeExpanded && (
                            <div className="ml-4 border-l border-border pl-2 mt-0.5 mb-1 space-y-0.5">
                              {equipe.colunas.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">Nenhum grupo nesta equipe.</p>
                              ) : (
                                equipe.colunas.map(col => {
                                  const isColSelected = selectedGroup?.type === 'team' &&
                                    selectedGroup.tagId === col.tagId &&
                                    selectedGroup.equipeId === equipe.equipeId;
                                  return (
                                    <button
                                      key={col.tagId}
                                      type="button"
                                      onClick={() => setSelectedGroup({
                                        type: 'team',
                                        tagId: col.tagId,
                                        tagNome: col.tagNome,
                                        equipeId: equipe.equipeId,
                                        equipeNome: equipe.equipeNome,
                                      })}
                                      className={`w-full text-left px-2 py-1 rounded border transition-colors text-sm ${
                                        isColSelected
                                          ? 'bg-primary/10 border-primary'
                                          : 'border-transparent hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {col.tagCor && (
                                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.tagCor }} />
                                        )}
                                        <span className="truncate flex-1">{col.tagNome}</span>
                                        {col.processos.some(p => p.numero_processo === numeroProcesso) && (
                                          <Badge className="text-xs bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 flex-shrink-0">
                                            Já salvo
                                          </Badge>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </ScrollArea>
          </div>
        )}

        {/* Confirmação de exclusão de grupo */}
        {confirmDeleteGrupo && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm font-medium text-destructive">Excluir grupo "{confirmDeleteGrupo.tagNome}"?</p>
            {confirmDeleteGrupo.totalProcessos > 0 && (
              <p className="text-xs text-muted-foreground">
                Este grupo tem <strong>{confirmDeleteGrupo.totalProcessos} processo(s)</strong> salvos. Ao excluir, eles serão removidos do grupo também.
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDeleteTagConfirmed}>Confirmar exclusão</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDeleteGrupo(null)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Confirmação de remoção de processo do grupo */}
        {confirmRemoveProcesso && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm font-medium text-destructive">Remover processo do grupo?</p>
            <p className="text-xs text-muted-foreground">
              O processo <strong>{confirmRemoveProcesso.label}</strong> será removido do grupo. O processo não será excluído do sistema.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={removingProcessoId === confirmRemoveProcesso.processoId}
                onClick={async () => {
                  const { tagId, processoId, label } = confirmRemoveProcesso;
                  setConfirmRemoveProcesso(null);
                  await handleRemoveProcesso(tagId, processoId, label);
                }}
              >
                {removingProcessoId ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Confirmar remoção
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmRemoveProcesso(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!selectedGroup || isSaving || isAlreadySaved}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
