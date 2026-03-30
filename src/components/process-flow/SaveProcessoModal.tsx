"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, ChevronRight, ChevronDown, Users, Tag, X } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { getMyGrupos, createGrupo, saveProcessoToGrupo, checkProcessoSalvo } from '@/lib/api/grupos-api-client';
import { getMyTeams } from '@/lib/api/teams-api-client';
import { getKanbanBoard, salvarProcessoNoKanban, getTags, tagProcesso, createTag as createTeamTag } from '@/lib/api/tags-api-client';
import { formatProcessNumber, cn } from '@/lib/utils';
import { TAG_COLORS } from '@/lib/constants';
import { EditableTagBadge } from '@/components/ui/editable-tag-badge';
import type { GrupoProcesso, TeamTag, Team } from '@/types/teams';

// ─── Types ───────────────────────────────────────────────────────────────

type SelectedGroup =
  | { type: 'personal'; tagId: string; tagNome: string }
  | { type: 'team'; tagId: string; tagNome: string; equipeId: string; equipeNome: string };

/** Flat representation of a grupo — only needs to know if our processo is already saved */
type GrupoItem = {
  type: 'personal' | 'team';
  tagId: string;
  tagNome: string;
  tagCor: string | null;
  equipeId?: string;
  equipeNome?: string;
  alreadySaved: boolean;
};

type EquipeSection = {
  equipeId: string;
  equipeNome: string;
  grupos: GrupoItem[];
};

// ─── Component ───────────────────────────────────────────────────────────

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

  // Grupos pessoais
  const [grupos, setGrupos] = useState<GrupoItem[]>([]);
  // Equipes com suas colunas kanban
  const [equipes, setEquipes] = useState<EquipeSection[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Seções colapsáveis
  const [gruposOpen, setGruposOpen] = useState(true);
  const [equipesOpen, setEquipesOpen] = useState(true);
  const [expandedEquipes, setExpandedEquipes] = useState<Set<string>>(new Set());

  // Grupo selecionado como destino do save
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  const [newGrupoName, setNewGrupoName] = useState('');
  const [isCreatingGrupo, setIsCreatingGrupo] = useState(false);

  // Tags (rótulos) — scoped to the selected group context
  const [availableTags, setAvailableTags] = useState<TeamTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [tagSearchFilter, setTagSearchFilter] = useState('');
  const [newTagColor, setNewTagColor] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // ─── Reset on close ──────────────────────────────────────────────────

  useEffect(() => {
    if (open && usuario) loadData();
    if (!open) {
      setSelectedGroup(null);
      setNewGrupoName('');
      setIsCreatingGrupo(false);
      setGruposOpen(true);
      setEquipesOpen(true);
      setExpandedEquipes(new Set());
      setGrupos([]);
      setEquipes([]);
      setAvailableTags([]);
      setSelectedTagIds(new Set());
      setTagSearchFilter('');
      setNewTagColor('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, usuario]);

  // ─── Load tags when group selection changes ──────────────────────────

  const loadTagsForContext = useCallback(async (group: SelectedGroup | null) => {
    if (!usuario || !group) {
      setAvailableTags([]);
      setSelectedTagIds(new Set());
      return;
    }
    setIsLoadingTags(true);
    setSelectedTagIds(new Set());
    setTagSearchFilter('');
    setNewTagColor('');
    try {
      const equipeId = group.type === 'team' ? group.equipeId : undefined;
      const result = await getTags(usuario, equipeId);
      if (!('error' in result)) {
        setAvailableTags(result);
      } else {
        setAvailableTags([]);
      }
    } finally {
      setIsLoadingTags(false);
    }
  }, [usuario]);

  useEffect(() => {
    loadTagsForContext(selectedGroup);
  }, [selectedGroup, loadTagsForContext]);

  // ─── Data loading ────────────────────────────────────────────────────

  const loadData = async () => {
    if (!usuario) return;
    setIsLoading(true);
    try {
      const [gruposResult, teamsResult] = await Promise.all([
        getMyGrupos(usuario),
        getMyTeams(usuario),
      ]);

      const fetchedGrupos: GrupoProcesso[] = !('error' in gruposResult) ? gruposResult : [];
      const fetchedTeams: Team[] = !('error' in teamsResult) ? teamsResult : [];

      // Fetch kanban boards to check if the processo is already saved
      const kanbanResults = await Promise.all(
        fetchedTeams.map((team) => getKanbanBoard(team.id, usuario!)),
      );

      // Check which personal grupos already contain this processo
      const salvoResult = await checkProcessoSalvo(usuario!, numeroProcesso);
      const salvoTagIds = new Set<string>();
      if (!('error' in salvoResult)) {
        for (const t of salvoResult.tags || []) {
          salvoTagIds.add(t.tag_id);
        }
      }

      const personalGrupos: GrupoItem[] = fetchedGrupos.map((g) => ({
        type: 'personal' as const,
        tagId: g.id,
        tagNome: g.nome,
        tagCor: g.cor ?? null,
        alreadySaved: salvoTagIds.has(g.id),
      }));

      // Team groups
      const equipesArray: EquipeSection[] = fetchedTeams
        .map((team, i) => {
          const result = kanbanResults[i];
          if ('error' in result) return null;
          const grupoItems: GrupoItem[] = result.colunas.map((col: any) => ({
            type: 'team' as const,
            tagId: col.tag_id,
            tagNome: col.tag_nome,
            tagCor: col.tag_cor ?? null,
            equipeId: team.id,
            equipeNome: team.nome,
            alreadySaved: (col.processos || []).some((p: any) => p.numero_processo === numeroProcesso),
          }));
          return { equipeId: team.id, equipeNome: team.nome, grupos: grupoItems };
        })
        .filter(Boolean) as EquipeSection[];

      setGrupos(personalGrupos);
      setEquipes(equipesArray);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleCreateGrupo = async () => {
    if (!usuario || !newGrupoName.trim()) return;
    setIsCreatingGrupo(true);
    try {
      const result = await createGrupo(usuario, newGrupoName.trim());
      if ('error' in result) {
        toast({ title: "Erro ao criar grupo", description: result.error, variant: "destructive" });
        return;
      }
      const novoGrupo: GrupoItem = {
        type: 'personal',
        tagId: result.id,
        tagNome: result.nome,
        tagCor: result.cor ?? null,
        alreadySaved: false,
      };
      setGrupos(prev => [novoGrupo, ...prev]);
      setSelectedGroup({ type: 'personal', tagId: result.id, tagNome: result.nome });
      setNewGrupoName('');
      setGruposOpen(true);
    } finally {
      setIsCreatingGrupo(false);
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!usuario || !tagSearchFilter.trim()) return;
    setIsCreatingTag(true);
    try {
      const equipeId = selectedGroup?.type === 'team' ? selectedGroup.equipeId : undefined;
      const result = await createTeamTag(usuario, tagSearchFilter.trim(), newTagColor || undefined, equipeId);
      if ('error' in result) {
        toast({ title: "Erro ao criar tag", description: result.error, variant: "destructive" });
        return;
      }
      setAvailableTags(prev => [...prev, result]);
      setSelectedTagIds(prev => new Set(prev).add(result.id));
      setTagSearchFilter('');
      setNewTagColor('');
    } finally {
      setIsCreatingTag(false);
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

      // Apply selected tags
      if (selectedTagIds.size > 0) {
        await Promise.all(
          [...selectedTagIds].map(tagId => tagProcesso(tagId, usuario, numeroProcesso)),
        );
      }

      const tagCount = selectedTagIds.size;
      toast({
        title: "Processo salvo com sucesso!",
        description: `Salvo no grupo "${selectedGroup.tagNome}"${tagCount > 0 ? ` com ${tagCount} tag(s)` : ''}`,
      });
      onSaveSuccess?.();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Derived state ───────────────────────────────────────────────────

  const isAlreadySaved = (() => {
    if (!selectedGroup) return false;
    if (selectedGroup.type === 'personal') {
      return grupos.find(g => g.tagId === selectedGroup.tagId)?.alreadySaved ?? false;
    }
    const equipe = equipes.find(e => e.equipeId === selectedGroup.equipeId);
    return equipe?.grupos.find(g => g.tagId === selectedGroup.tagId)?.alreadySaved ?? false;
  })();

  const filteredAvailableTags = availableTags.filter(
    t => !selectedTagIds.has(t.id) &&
      (!tagSearchFilter.trim() || t.nome.toLowerCase().includes(tagSearchFilter.trim().toLowerCase())),
  );

  const showCreateTag = tagSearchFilter.trim() &&
    !availableTags.some(t => t.nome.toLowerCase() === tagSearchFilter.trim().toLowerCase());

  const tagContextLabel = selectedGroup?.type === 'team'
    ? `equipe "${(selectedGroup as any).equipeNome}"`
    : 'espaço pessoal';

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Processo</DialogTitle>
          <DialogDescription>
            Selecione um grupo para salvar o processo {formatProcessNumber(numeroProcesso)}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Criar novo grupo pessoal */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do novo grupo..."
                value={newGrupoName}
                onChange={(e) => setNewGrupoName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newGrupoName.trim()) handleCreateGrupo(); }}
                className="h-9"
              />
              <Button size="sm" onClick={handleCreateGrupo} disabled={!newGrupoName.trim() || isCreatingGrupo}>
                {isCreatingGrupo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            <ScrollArea className="h-[280px] border rounded-md p-2">

              {/* ── MEUS GRUPOS ──────────────────────────────────── */}
              <button
                type="button"
                onClick={() => setGruposOpen(p => !p)}
                className="flex items-center justify-between w-full px-1 py-1.5 rounded hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meus Grupos</span>
                  <Badge variant="secondary" className="text-xs">{grupos.length}</Badge>
                </div>
                {gruposOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {gruposOpen && (
                <div className="mb-2 space-y-0.5">
                  {grupos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo criado.</p>
                  ) : (
                    grupos.map(grupo => {
                      const isSelected = selectedGroup?.type === 'personal' && selectedGroup.tagId === grupo.tagId;
                      return (
                        <button
                          key={grupo.tagId}
                          type="button"
                          onClick={() => setSelectedGroup({ type: 'personal', tagId: grupo.tagId, tagNome: grupo.tagNome })}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded border transition-colors text-sm flex items-center gap-2',
                            isSelected ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-accent',
                          )}
                        >
                          {grupo.tagCor && (
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: grupo.tagCor }} />
                          )}
                          <span className="truncate flex-1 font-medium">{grupo.tagNome}</span>
                          {grupo.alreadySaved && (
                            <Badge className="text-2xs bg-success-light text-success border border-success/20 hover:bg-success-light flex-shrink-0 px-1.5 py-0">
                              Já salvo
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <div className="border-t my-1" />

              {/* ── MINHAS EQUIPES ────────────────────────────────── */}
              <button
                type="button"
                onClick={() => setEquipesOpen(p => !p)}
                className="flex items-center justify-between w-full px-1 py-1.5 rounded hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Minhas Equipes</span>
                  <Badge variant="secondary" className="text-xs">{equipes.length}</Badge>
                </div>
                {equipesOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {equipesOpen && (
                <div className="space-y-0.5">
                  {equipes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhuma equipe encontrada.</p>
                  ) : (
                    equipes.map(equipe => {
                      const isExpanded = expandedEquipes.has(equipe.equipeId);
                      return (
                        <div key={equipe.equipeId}>
                          <button
                            type="button"
                            onClick={() => setExpandedEquipes(prev => {
                              const next = new Set(prev);
                              if (next.has(equipe.equipeId)) next.delete(equipe.equipeId);
                              else next.add(equipe.equipeId);
                              return next;
                            })}
                            className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-accent transition-colors"
                          >
                            <span className="text-sm font-medium text-left truncate">{equipe.equipeNome}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              <span className="text-xs text-muted-foreground">{equipe.grupos.length}</span>
                              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="ml-4 border-l border-border pl-2 mt-0.5 mb-1 space-y-0.5">
                              {equipe.grupos.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">Nenhum grupo.</p>
                              ) : (
                                equipe.grupos.map(col => {
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
                                      className={cn(
                                        'w-full text-left px-2 py-1 rounded border transition-colors text-sm flex items-center gap-2',
                                        isColSelected ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-accent',
                                      )}
                                    >
                                      {col.tagCor && (
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: col.tagCor }} />
                                      )}
                                      <span className="truncate flex-1">{col.tagNome}</span>
                                      {col.alreadySaved && (
                                        <Badge className="text-2xs bg-success-light text-success border border-success/20 hover:bg-success-light flex-shrink-0 px-1.5 py-0">
                                          Já salvo
                                        </Badge>
                                      )}
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

            {/* ── TAGS (only after group selected) ──────────────── */}
            {selectedGroup && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tags ({tagContextLabel})
                  </span>
                  {isLoadingTags && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {[...selectedTagIds].map(tagId => {
                    const tag = availableTags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <EditableTagBadge
                        key={tag.id}
                        tag={tag}
                        usuario={usuario || ''}
                        size="sm"
                        onUpdated={(updated) => {
                          setAvailableTags(prev => prev.map(t => t.id === updated.id ? updated : t));
                        }}
                        onDeleted={(id) => {
                          setAvailableTags(prev => prev.filter(t => t.id !== id));
                          setSelectedTagIds(prev => { const next = new Set(prev); next.delete(id); return next; });
                        }}
                        suffix={
                          <button className="ml-0.5 hover:opacity-70" onClick={(e) => { e.stopPropagation(); setSelectedTagIds(prev => { const next = new Set(prev); next.delete(tagId); return next; }); }}>
                            <X className="h-3 w-3" />
                          </button>
                        }
                      />
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2" disabled={isLoadingTags}>
                        <Plus className="h-3 w-3 mr-1" /> Tag
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-2" align="start">
                      <Input
                        placeholder="Filtrar ou criar tag..."
                        value={tagSearchFilter}
                        onChange={(e) => { setTagSearchFilter(e.target.value); setNewTagColor(''); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tagSearchFilter.trim()) {
                            if (filteredAvailableTags.length > 0) {
                              setSelectedTagIds(prev => new Set(prev).add(filteredAvailableTags[0].id));
                              setTagSearchFilter('');
                            } else if (showCreateTag) {
                              handleCreateAndAddTag();
                            }
                          }
                        }}
                        className="h-8 text-sm mb-1"
                        autoFocus
                      />
                      <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                        {filteredAvailableTags.map(tag => (
                          <button
                            key={tag.id}
                            className="w-full text-left px-2 py-1 rounded text-sm hover:bg-accent flex items-center gap-2"
                            onClick={() => { setSelectedTagIds(prev => new Set(prev).add(tag.id)); setTagSearchFilter(''); }}
                          >
                            {tag.cor ? (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted border" />
                            )}
                            {tag.nome}
                          </button>
                        ))}
                        {showCreateTag && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-2xs text-muted-foreground px-1">Cor (opcional):</p>
                            <div className="flex flex-wrap gap-1 px-1">
                              {TAG_COLORS.map(cor => (
                                <button
                                  key={cor}
                                  type="button"
                                  className={cn(
                                    'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                                    newTagColor === cor ? 'border-foreground scale-110' : 'border-transparent',
                                  )}
                                  style={{ backgroundColor: cor }}
                                  onClick={() => setNewTagColor(prev => prev === cor ? '' : cor)}
                                />
                              ))}
                              <button
                                type="button"
                                title="Sem cor"
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 bg-muted flex items-center justify-center transition-transform hover:scale-110',
                                  !newTagColor ? 'border-foreground scale-110' : 'border-transparent',
                                )}
                                onClick={() => setNewTagColor('')}
                              >
                                <X className="h-2.5 w-2.5 text-muted-foreground" />
                              </button>
                            </div>
                            <button
                              className="w-full text-left px-2 py-1 rounded text-sm hover:bg-accent text-primary flex items-center gap-1.5"
                              disabled={isCreatingTag}
                              onClick={handleCreateAndAddTag}
                            >
                              {isCreatingTag ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  {newTagColor && (
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: newTagColor }} />
                                  )}
                                  <Plus className="h-3 w-3" />
                                </>
                              )}
                              Criar &quot;{tagSearchFilter.trim()}&quot;
                            </button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
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
