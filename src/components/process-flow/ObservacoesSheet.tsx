"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MessageSquare, Send, Trash2, X, Tag, Plus, Lock, Users, Globe, Reply, Eye, Info, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MentionDropdown } from '@/components/ui/mention-dropdown';
import { useMencoesEditor } from '@/hooks/use-mencoes-editor';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { getObservacoes, createObservacao, updateObservacao, deleteObservacao, getMencoesNaoLidas, marcarMencaoVista } from '@/lib/api/observacoes-api-client';
import { getMyTeams, getTeamDetail } from '@/lib/api/teams-api-client';
import { getTeamGrupos } from '@/lib/api/grupos-api-client';
import {
  getTags,
  getProcessoTags,
  createTag,
  updateTag,
  deleteTag,
  tagProcesso,
  untagProcessoPorNumero,
} from '@/lib/api/tags-api-client';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Observacao, ObservacaoEscopo, Team, TeamTag, TeamMember } from '@/types/teams';

import { TAG_COLORS } from '@/lib/constants';
import { EditableTagBadge } from '@/components/ui/editable-tag-badge';

interface ObservacoesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  numeroProcesso: string;
  equipeId?: string;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface AppliedTag {
  tag: TeamTag;
  teamName: string;
  teamId: string | null; // null = personal tag
}

export function ObservacoesSheet({
  isOpen,
  onOpenChange,
  numeroProcesso,
  equipeId,
}: ObservacoesSheetProps) {
  const { toast } = useToast();
  const { usuario } = usePersistedAuth();
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conteudo, setConteudo] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Escopo
  const [escopo, setEscopo] = useState<ObservacaoEscopo>('pessoal');
  const [escopoEquipeId, setEscopoEquipeId] = useState<string | undefined>(equipeId);
  const [filterEscopo, setFilterEscopo] = useState<'todos' | ObservacaoEscopo>('todos');

  // Tag state
  const [teams, setTeams] = useState<Team[]>([]);
  const [appliedTags, setAppliedTags] = useState<AppliedTag[]>([]);
  const [allTagsByTeam, setAllTagsByTeam] = useState<Map<string | null, { teamName: string; tags: TeamTag[] }>>(new Map());
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamTagsList, setTeamTagsList] = useState<TeamTag[]>([]);
  const [isLoadingTeamTags, setIsLoadingTeamTags] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagColor, setNewTagColor] = useState<string>('');
  const [selectedTeamHasGrupos, setSelectedTeamHasGrupos] = useState<boolean>(true);
  const [editingTag, setEditingTag] = useState<TeamTag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  // @mencao state
  const [membrosEquipe, setMembrosEquipe] = useState<TeamMember[]>([]);
  const mencoeEditor = useMencoesEditor(membrosEquipe, usuario);

  // Badge de mencoes nao lidas
  const [mencoesBadge, setMencoesBadge] = useState(0);

  // Respostas inline
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyConteudo, setReplyConteudo] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const mencoeReply = useMencoesEditor(membrosEquipe, usuario);

  // Edição de observações
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConteudo, setEditConteudo] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const loadObservacoes = useCallback(async () => {
    if (!usuario) return;
    setIsLoading(true);
    try {
      const result = await getObservacoes(numeroProcesso, equipeId, usuario);
      if (!('error' in result)) {
        setObservacoes(result);
        setTimeout(scrollToBottom, 100);
        // Marcar automaticamente como vistas as mencoes do usuario
        for (const obs of result) {
          const temMencaoNaoVista = obs.mencoes?.some(
            m => m.usuario_mencionado === usuario && !m.visto_em
          );
          if (temMencaoNaoVista) {
            marcarMencaoVista(numeroProcesso, obs.id, usuario);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [numeroProcesso, equipeId, usuario, scrollToBottom]);

  const loadMembrosEBadge = useCallback(async () => {
    if (!usuario) return;
    const badgePromise = getMencoesNaoLidas(numeroProcesso, usuario);
    const teamIdToLoad = equipeId || escopoEquipeId;
    const membrosPromise = teamIdToLoad ? getTeamDetail(teamIdToLoad, usuario) : Promise.resolve(null);
    const [badgeResult, teamResult] = await Promise.all([badgePromise, membrosPromise]);
    if (!('error' in badgeResult)) {
      setMencoesBadge(badgeResult.count);
    }
    if (teamResult && !('error' in teamResult)) {
      setMembrosEquipe(teamResult.membros);
    }
  }, [numeroProcesso, equipeId, escopoEquipeId, usuario]);

  const loadTeamsAndAppliedTags = useCallback(async () => {
    if (!usuario) return;
    setIsLoadingTeams(true);
    try {
      const [teamsResult, personalTagsResult, personalAllTagsResult] = await Promise.all([
        getMyTeams(usuario),
        getProcessoTags(numeroProcesso, usuario), // personal applied tags
        getTags(usuario),                          // all personal tags (for cross-team matching)
      ]);

      const fetchedTeams = 'error' in teamsResult ? [] : teamsResult;
      setTeams(fetchedTeams);

      const allApplied: AppliedTag[] = [];
      const allTagsMap = new Map<string | null, { teamName: string; tags: TeamTag[] }>();

      // Personal applied tags
      if (!('error' in personalTagsResult)) {
        for (const tag of personalTagsResult) {
          allApplied.push({ tag, teamName: 'Pessoal', teamId: null });
        }
      }

      // All personal tags (for cross-team matching)
      if (!('error' in personalAllTagsResult)) {
        allTagsMap.set(null, { teamName: 'Pessoal', tags: personalAllTagsResult });
      }

      // Team applied tags + all team tags (for cross-team matching)
      await Promise.all(
        fetchedTeams.map(async (team) => {
          const [appliedResult, allTeamTagsResult] = await Promise.all([
            getProcessoTags(numeroProcesso, usuario, team.id),
            getTags(usuario, team.id),
          ]);
          if (!('error' in appliedResult)) {
            for (const tag of appliedResult) {
              allApplied.push({ tag, teamName: team.nome, teamId: team.id });
            }
          }
          if (!('error' in allTeamTagsResult)) {
            allTagsMap.set(team.id, { teamName: team.nome, tags: allTeamTagsResult });
          }
        })
      );

      setAppliedTags(allApplied);
      setAllTagsByTeam(allTagsMap);
    } finally {
      setIsLoadingTeams(false);
    }
  }, [usuario, numeroProcesso]);

  useEffect(() => {
    if (isOpen) {
      loadObservacoes();
      loadTeamsAndAppliedTags();
      loadMembrosEBadge();
    }
  }, [isOpen, loadObservacoes, loadTeamsAndAppliedTags, loadMembrosEBadge]);

  // Recarrega membros quando escopoEquipeId muda
  useEffect(() => {
    loadMembrosEBadge();
  }, [escopoEquipeId, loadMembrosEBadge]);

  // Track whether popover is in personal or team mode
  const [isPersonalMode, setIsPersonalMode] = useState(false);

  const handleSelectPersonal = async () => {
    if (!usuario) return;
    setIsPersonalMode(true);
    setSelectedTeam(null);
    setIsLoadingTeamTags(true);
    setTagFilter('');
    setNewTagColor('');
    try {
      const result = await getTags(usuario); // no equipeId = personal
      setTeamTagsList('error' in result ? [] : result);
    } finally {
      setIsLoadingTeamTags(false);
    }
  };

  // When a team is selected in the popover, fetch its tags and check if it has grupos with processes
  const handleSelectTeam = async (team: Team) => {
    if (!usuario) return;
    setIsPersonalMode(false);
    setSelectedTeam(team);
    setIsLoadingTeamTags(true);
    setTagFilter('');
    setNewTagColor('');
    try {
      const [tagsResult, gruposResult] = await Promise.all([
        getTags(usuario, team.id),
        getTeamGrupos(usuario, team.id),
      ]);
      setTeamTagsList('error' in tagsResult ? [] : tagsResult);
      const hasGruposComProcesso = !('error' in gruposResult) && gruposResult.some(g => g.total_processos > 0);
      setSelectedTeamHasGrupos(hasGruposComProcesso);
    } finally {
      setIsLoadingTeamTags(false);
    }
  };

  const handleAddTag = async (tag: TeamTag) => {
    if (!usuario || (!selectedTeam && !isPersonalMode)) return;
    const result = await tagProcesso(tag.id, usuario, numeroProcesso);
    if ('error' in result) {
      toast({ title: "Erro ao adicionar tag", description: result.error, variant: "destructive" });
      return;
    }
    const teamName = isPersonalMode ? 'Pessoal' : selectedTeam!.nome;
    const teamId = isPersonalMode ? null : selectedTeam!.id;
    setAppliedTags(prev => [...prev, { tag, teamName, teamId }]);
    setIsTagPopoverOpen(false);
    setSelectedTeam(null);
    setIsPersonalMode(false);
    setTagFilter('');
  };

  const handleRemoveTag = async (applied: AppliedTag) => {
    if (!usuario) return;
    // Optimistic remove
    setAppliedTags(prev => prev.filter(a => !(a.tag.id === applied.tag.id && a.teamId === applied.teamId)));
    // Call backend to actually remove the association
    const result = await untagProcessoPorNumero(applied.tag.id, numeroProcesso, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao remover tag", description: result.error, variant: "destructive" });
      // Revert on error
      setAppliedTags(prev => [...prev, applied]);
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!usuario || (!selectedTeam && !isPersonalMode) || !tagFilter.trim()) return;
    setIsCreatingTag(true);
    try {
      const equipeId_param = isPersonalMode ? undefined : selectedTeam!.id;
      const result = await createTag(usuario, tagFilter.trim(), newTagColor || undefined, equipeId_param);
      if ('error' in result) {
        const isDuplicate = result.status === 409;
        toast({
          title: isDuplicate ? "Tag duplicada" : "Erro ao criar tag",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      setNewTagColor('');
      setTeamTagsList(prev => [...prev, result]);
      await handleAddTag(result);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleEditTag = async () => {
    if (!usuario || !editingTag) return;
    const updates: { nome?: string; cor?: string } = {};
    if (editTagName.trim() && editTagName !== editingTag.nome) updates.nome = editTagName.trim();
    if (editTagColor !== (editingTag.cor ?? '')) updates.cor = editTagColor;
    if (Object.keys(updates).length === 0) { setEditingTag(null); return; }

    const result = await updateTag(editingTag.id, usuario, updates);
    if ('error' in result) {
      toast({ title: "Erro ao editar tag", description: result.error, variant: "destructive" });
      return;
    }
    setTeamTagsList(prev => prev.map(t => t.id === editingTag.id ? { ...t, ...updates } : t));
    setAppliedTags(prev => prev.map(a => a.tag.id === editingTag.id ? { ...a, tag: { ...a.tag, ...updates } } : a));
    setEditingTag(null);
  };

  const handleDeleteTag = async (tag: TeamTag) => {
    if (!usuario) return;
    const result = await deleteTag(tag.id, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir tag", description: result.error, variant: "destructive" });
      return;
    }
    setTeamTagsList(prev => prev.filter(t => t.id !== tag.id));
    setAppliedTags(prev => prev.filter(a => a.tag.id !== tag.id));
    toast({ title: "Tag excluída" });
  };

  const handleApplyCrossTeamTag = async (tag: TeamTag, actualTeamId: string | null, actualTeamName: string) => {
    if (!usuario) return;
    const result = await tagProcesso(tag.id, usuario, numeroProcesso);
    if ('error' in result) {
      toast({ title: "Erro ao adicionar tag", description: result.error, variant: "destructive" });
      return;
    }
    setAppliedTags(prev => [...prev, { tag, teamName: actualTeamName, teamId: actualTeamId }]);
    setIsTagPopoverOpen(false);
    setSelectedTeam(null);
    setIsPersonalMode(false);
    setTagFilter('');
  };


  const handleSend = async () => {
    if (!usuario || !conteudo.trim() || isSending) return;
    setIsSending(true);
    const equipeParaEnvio = escopo === 'equipe' ? (equipeId ?? escopoEquipeId) : undefined;
    try {
      const mencoes = mencoeEditor.extrairMencoes(conteudo);
      const result = await createObservacao(
        numeroProcesso, usuario, conteudo.trim(), escopo, equipeParaEnvio,
        mencoes,
      );
      if ('error' in result) {
        toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => [...prev, result]);
      setConteudo('');
      mencoeEditor.handleCloseMentionDropdown();
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReply = async (parentId: string) => {
    if (!usuario || !replyConteudo.trim() || isSendingReply) return;
    setIsSendingReply(true);
    const equipeParaEnvio = escopo === 'equipe' ? (equipeId ?? escopoEquipeId) : undefined;
    try {
      const mencoes = mencoeReply.extrairMencoes(replyConteudo);
      const result = await createObservacao(
        numeroProcesso, usuario, replyConteudo.trim(),
        escopo, equipeParaEnvio,
        mencoes, parentId,
      );
      if ('error' in result) {
        toast({ title: "Erro ao responder", description: result.error, variant: "destructive" });
        return;
      }
      // Atualiza a obs pai com a nova resposta
      setObservacoes(prev => prev.map(o => {
        if (o.id === parentId) {
          return { ...o, respostas: [...(o.respostas ?? []), result] };
        }
        return o;
      }));
      setReplyConteudo('');
      setReplyingToId(null);
      mencoeReply.handleCloseMentionDropdown();
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDelete = async (observacaoId: string, parentId?: string) => {
    if (!usuario) return;
    const result = await deleteObservacao(numeroProcesso, observacaoId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
      return;
    }
    if (parentId) {
      // É uma resposta — remove da lista de respostas da pai
      setObservacoes(prev => prev.map(o => {
        if (o.id === parentId) {
          return { ...o, respostas: (o.respostas ?? []).filter(r => r.id !== observacaoId) };
        }
        return o;
      }));
    } else {
      setObservacoes(prev => prev.filter(o => o.id !== observacaoId));
    }
  };

  const handleUpdate = async () => {
    if (!usuario || !editConteudo.trim() || !editingId || isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await updateObservacao(numeroProcesso, editingId, usuario, editConteudo);
      if ('error' in result) {
        toast({ title: "Erro ao atualizar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => prev.map(o => o.id === editingId ? result : o));
      setEditingId(null);
      setEditConteudo('');
      toast({ title: "Observação atualizada", duration: 2000 });
    } finally {
      setIsUpdating(false);
    }
  };

  // Renderiza conteudo HTML com classes de estilo para listas e formatação
  const renderizarConteudo = (html: string) => {
    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted/50 [&_pre]:p-2 [&_pre]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  // Config visual de escopo
  const scopeConfig: Record<ObservacaoEscopo, { label: string; Icon: React.ElementType; className: string }> = {
    pessoal: { label: 'Pessoal', Icon: Lock, className: 'bg-muted/50 text-muted-foreground border-muted' },
    equipe:  { label: 'Equipe',  Icon: Users, className: 'bg-blue-50 text-blue-600 border-blue-100' },
    global:  { label: 'Global',  Icon: Globe, className: 'bg-green-50 text-green-600 border-green-100' },
  };

  const scopeOptions: { value: ObservacaoEscopo; label: string; Icon: React.ElementType }[] = [
    { value: 'pessoal', label: 'Pessoal', Icon: Lock },
    { value: 'equipe',  label: 'Equipe',  Icon: Users },
    { value: 'global',  label: 'Global',  Icon: Globe },
  ];

  const observacoesFiltradas = filterEscopo === 'todos'
    ? observacoes
    : observacoes.filter(o => (o.escopo ?? 'pessoal') === filterEscopo);

  const isSendDisabled = !conteudo.trim() || isSending
    || (escopo === 'equipe' && !equipeId && !escopoEquipeId);

  // Filter available tags (exclude already applied for selected scope)
  const currentScopeId = isPersonalMode ? null : selectedTeam?.id ?? null;
  const appliedIdsForSelectedTeam = new Set(
    appliedTags.filter(a => a.teamId === currentScopeId).map(a => a.tag.id)
  );
  const availableTags = teamTagsList.filter(
    t => !appliedIdsForSelectedTeam.has(t.id) && t.nome.toLowerCase().includes(tagFilter.toLowerCase())
  );

  // Verifica se há uma tag com o mesmo nome em outro escopo (cross-team match)
  const crossTeamMatch = (() => {
    if (!tagFilter.trim() || availableTags.length > 0) return null;
    const existsInCurrentScope = teamTagsList.some(
      t => t.nome.toLowerCase() === tagFilter.trim().toLowerCase()
    );
    if (existsInCurrentScope) return null; // handled by existing "apply" logic
    for (const [teamId, { teamName, tags }] of allTagsByTeam.entries()) {
      if (teamId === currentScopeId) continue; // same scope, skip
      const match = tags.find(t => t.nome.toLowerCase() === tagFilter.trim().toLowerCase());
      if (match) {
        // Só mostrar se a tag ainda não está aplicada neste processo com este escopo
        const jaAplicada = appliedTags.some(a => a.tag.id === match.id && a.teamId === teamId);
        if (!jaAplicada) return { tag: match, teamId, teamName };
      }
    }
    return null;
  })();

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        showOverlay={false}
        showCloseButton={false}
        className="w-full sm:w-[480px] sm:max-w-[480px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Observacoes
              {mencoesBadge > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {mencoesBadge}
                </span>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 flex-shrink-0"
              aria-label="Fechar observacoes"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">Observacoes do processo</SheetDescription>
          <Separator />
        </SheetHeader>

        {/* Tags agrupadas por escopo */}
        <div className="flex-shrink-0 pb-3 border-b space-y-2">
          {/* Cabeçalho da seção */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </span>
            {isLoadingTeams ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
              </span>
            ) : null}
          </div>

          {/* Grupos de tags por escopo */}
          {(() => {
            // Agrupar tags aplicadas por teamId
            const grupos = new Map<string | null, AppliedTag[]>();
            for (const applied of appliedTags) {
              const key = applied.teamId;
              if (!grupos.has(key)) grupos.set(key, []);
              grupos.get(key)!.push(applied);
            }

            if (grupos.size === 0 && !isLoadingTeams) {
              return (
                <p className="text-xs text-muted-foreground pl-0.5">Nenhuma tag aplicada.</p>
              );
            }

            return Array.from(grupos.entries()).map(([teamId, tags]) => (
              <div key={teamId ?? 'pessoal'} className="space-y-1">
                {/* Rótulo do grupo */}
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  {teamId === null ? (
                    <><Lock className="h-2.5 w-2.5" /> {tags[0].teamName}</>
                  ) : (
                    <><Users className="h-2.5 w-2.5" /> {tags[0].teamName}</>
                  )}
                </p>
                {/* Badges das tags */}
                <div className="flex flex-wrap gap-1">
                  {tags.map((applied) => (
                    <EditableTagBadge
                      key={`${applied.teamId}-${applied.tag.id}`}
                      tag={applied.tag}
                      usuario={usuario || ''}
                      size="sm"
                      onUpdated={(updated) => {
                        setAppliedTags(prev => prev.map(a => a.tag.id === updated.id ? { ...a, tag: updated } : a));
                        setTeamTagsList(prev => prev.map(t => t.id === updated.id ? updated : t));
                      }}
                      onDeleted={(id) => {
                        setAppliedTags(prev => prev.filter(a => a.tag.id !== id));
                        setTeamTagsList(prev => prev.filter(t => t.id !== id));
                      }}
                      suffix={
                        <button className="ml-0.5 hover:opacity-70" onClick={(e) => { e.stopPropagation(); handleRemoveTag(applied); }}>
                          <X className="h-3 w-3" />
                        </button>
                      }
                    />
                  ))}
                </div>
              </div>
            ));
          })()}

          {/* Botão para adicionar tag */}
          <Popover
            open={isTagPopoverOpen}
            onOpenChange={(open) => {
              setIsTagPopoverOpen(open);
              if (!open) {
                setSelectedTeam(null);
                setIsPersonalMode(false);
                setTagFilter('');
                setTeamTagsList([]);
                setNewTagColor('');
                setSelectedTeamHasGrupos(true);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" disabled={isLoadingTeams}>
                <Plus className="h-3 w-3 mr-1" /> Tag
              </Button>
            </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                {!selectedTeam && !isPersonalMode ? (
                  /* Step 1: Pick personal or a team */
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 px-1">Selecione o escopo</p>
                    <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                      <button
                        className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent flex items-center gap-2"
                        onClick={handleSelectPersonal}
                      >
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        Pessoal
                      </button>
                      {teams.map((team) => (
                        <button
                          key={team.id}
                          className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent flex items-center gap-2"
                          onClick={() => handleSelectTeam(team)}
                        >
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {team.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Step 2: Pick or create a tag */
                  <div>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground mb-1.5 px-1 flex items-center gap-1"
                      onClick={() => { setSelectedTeam(null); setIsPersonalMode(false); setTagFilter(''); setTeamTagsList([]); setNewTagColor(''); setSelectedTeamHasGrupos(true); }}
                    >
                      &larr; {isPersonalMode ? 'Pessoal' : selectedTeam!.nome}
                    </button>
                    <Input
                      placeholder="Filtrar ou criar tag..."
                      value={tagFilter}
                      onChange={(e) => { setTagFilter(e.target.value); setNewTagColor(''); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagFilter.trim() && availableTags.length === 0) {
                          const existing = teamTagsList.find(t => t.nome.toLowerCase() === tagFilter.trim().toLowerCase());
                          if (existing) handleAddTag(existing);
                          else if (crossTeamMatch) handleApplyCrossTeamTag(crossTeamMatch.tag, crossTeamMatch.teamId, crossTeamMatch.teamName);
                          else if (!isPersonalMode && !selectedTeamHasGrupos) { /* bloqueado */ }
                          else handleCreateAndAddTag();
                        }
                      }}
                      className="h-8 text-sm mb-1"
                      autoFocus
                    />
                    {isLoadingTeamTags ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                        {availableTags.map((tag) => (
                          <div key={tag.id} className="group flex items-center gap-1 rounded hover:bg-accent">
                            <button
                              className="flex-1 text-left px-2 py-1 text-sm flex items-center gap-2"
                              onClick={() => handleAddTag(tag)}
                            >
                              {tag.cor ? (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted border" />
                              )}
                              {tag.nome}
                            </button>
                            <button
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity"
                              title="Editar tag"
                              onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setEditTagName(tag.nome); setEditTagColor(tag.cor ?? ''); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                              title="Excluir tag"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {tagFilter.trim() && availableTags.length === 0 && (() => {
                          const existingTag = teamTagsList.find(
                            t => t.nome.toLowerCase() === tagFilter.trim().toLowerCase()
                          );
                          if (existingTag) {
                            const jaAplicada = appliedIdsForSelectedTeam.has(existingTag.id);
                            return (
                              <div className="space-y-1 pt-0.5">
                                {jaAplicada ? (
                                  <div className="flex items-center gap-1.5 px-2 py-2 bg-green-50 border border-green-100 rounded text-xs text-green-700">
                                    <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                                    <span>
                                      <span className="font-medium">&quot;{existingTag.nome}&quot;</span> já está aplicada a este processo.
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[10px] text-amber-600 px-2 py-1 bg-amber-50 rounded flex items-center gap-1">
                                      <Info className="h-3 w-3 shrink-0" /> Tag já existe — deseja aplicá-la?
                                    </p>
                                    <button
                                      className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent flex items-center gap-2"
                                      onClick={() => handleAddTag(existingTag)}
                                    >
                                      {existingTag.cor ? (
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: existingTag.cor }} />
                                      ) : (
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted border" />
                                      )}
                                      Aplicar &quot;{existingTag.nome}&quot;
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          }
                          // Cross-team match: tag with same name exists in another scope
                          if (crossTeamMatch) {
                            return (
                              <div className="space-y-1 pt-0.5">
                                <div className="flex items-center gap-1.5 px-2 py-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                                  <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                  <span>
                                    Tag de <span className="font-medium">{crossTeamMatch.teamName}</span> — deseja usá-la aqui?
                                  </span>
                                </div>
                                <button
                                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent flex items-center gap-2"
                                  onClick={() => handleApplyCrossTeamTag(crossTeamMatch.tag, crossTeamMatch.teamId, crossTeamMatch.teamName)}
                                >
                                  {crossTeamMatch.tag.cor ? (
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: crossTeamMatch.tag.cor }} />
                                  ) : (
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted border" />
                                  )}
                                  Usar &quot;{crossTeamMatch.tag.nome}&quot; de &quot;{crossTeamMatch.teamName}&quot;
                                </button>
                              </div>
                            );
                          }
                          // Equipe sem coluna com processo — bloquear criação
                          if (!isPersonalMode && !selectedTeamHasGrupos) {
                            return (
                              <div className="flex items-start gap-1.5 px-2 py-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-700">
                                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                                <span>
                                  Esta equipe não possui nenhuma coluna com processo salvo. Adicione pelo menos um processo a uma coluna da equipe antes de criar tags.
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-1.5 pt-1">
                              <p className="text-[10px] text-muted-foreground px-1">Cor da tag (opcional):</p>
                              <div className="flex flex-wrap gap-1 px-1">
                                {TAG_COLORS.map(cor => (
                                  <button
                                    key={cor}
                                    type="button"
                                    title={cor}
                                    className={cn(
                                      'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                                      newTagColor === cor ? 'border-foreground scale-110' : 'border-transparent'
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
                                    !newTagColor ? 'border-foreground scale-110' : 'border-transparent'
                                  )}
                                  onClick={() => setNewTagColor('')}
                                >
                                  <X className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                              </div>
                              <button
                                className="w-full text-left px-2 py-1 rounded text-sm hover:bg-accent text-primary flex items-center gap-1.5"
                                onClick={handleCreateAndAddTag}
                                disabled={isCreatingTag}
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
                                Criar &quot;{tagFilter.trim()}&quot;
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </PopoverContent>
          </Popover>

          {/* Edit tag dialog */}
          <Dialog open={!!editingTag} onOpenChange={(open) => { if (!open) setEditingTag(null); }}>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle className="text-base">Editar tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  placeholder="Nome da tag"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditTag(); }}
                />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Cor:</p>
                  <div className="flex flex-wrap gap-1">
                    {TAG_COLORS.map(cor => (
                      <button
                        key={cor}
                        type="button"
                        className={cn(
                          'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                          editTagColor === cor ? 'border-foreground scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: cor }}
                        onClick={() => setEditTagColor(prev => prev === cor ? '' : cor)}
                      />
                    ))}
                    <button
                      type="button"
                      title="Sem cor"
                      className={cn(
                        'w-5 h-5 rounded-full border-2 bg-muted flex items-center justify-center transition-transform hover:scale-110',
                        !editTagColor ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      onClick={() => setEditTagColor('')}
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
                <Button size="sm" onClick={handleEditTag}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Input box */}
        <div className="flex-shrink-0 border-b pb-3 pt-3 dark:bg-background space-y-2">
          {/* Seletor de escopo */}
          <div className="flex gap-1.5">
            {scopeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setEscopo(value)}
                className={cn(
                  'flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border transition-colors',
                  escopo === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Seletor de equipe quando escopo=equipe e sem equipeId fixo */}
          {escopo === 'equipe' && !equipeId && (
            <select
              value={escopoEquipeId ?? ''}
              onChange={(e) => setEscopoEquipeId(e.target.value || undefined)}
              className="w-full text-xs h-7 rounded border border-input px-2 bg-background"
            >
              <option value="">Selecione a equipe...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          )}

          <div className="relative flex gap-2 items-end">
            <div className="flex-1 relative">
              <RichTextEditor
                value={conteudo}
                onChange={setConteudo}
                onSubmit={handleSend}
                onMentionQuery={mencoeEditor.handleMentionQuery}
                members={membrosEquipe}
                placeholder="Escreva uma observação... use @ para mencionar"
              />
              <MentionDropdown
                show={mencoeEditor.showDropdown}
                members={mencoeEditor.membrosFiltrados()}
                onSelect={mencoeEditor.handleSelectMembro}
                onClose={mencoeEditor.handleCloseMentionDropdown}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Insere @ no editor como ação explícita
                setConteudo(conteudo + '@');
              }}
              disabled={isSending}
              className="h-9 w-9 p-0 flex-shrink-0"
              title="Marcar pessoa"
              aria-label="Marcar pessoa"
            >
              <span className="text-base">@</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSendDisabled}
              className="h-9 w-9 p-0 flex-shrink-0"
              aria-label="Enviar observacao"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Filtro de escopo */}
        <div className="flex-shrink-0 flex items-center gap-1.5 pt-3">
          <span className="text-xs text-muted-foreground font-medium mr-0.5">Filtrar por:</span>
          {(['todos', 'pessoal', 'equipe', 'global'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterEscopo(f)}
              className={cn(
                'text-xs px-2.5 py-0.5 rounded-full border capitalize transition-colors',
                filterEscopo === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {f === 'todos' ? 'Todos' : scopeConfig[f].label}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto mt-2 pr-1 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : observacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">
                {filterEscopo === 'todos' ? 'Nenhuma observacao ainda.' : `Nenhuma observacao ${scopeConfig[filterEscopo].label.toLowerCase()} ainda.`}
              </p>
              {filterEscopo === 'todos' && (
                <p className="text-xs mt-1">Seja o primeiro a comentar sobre este processo.</p>
              )}
            </div>
          ) : (
            observacoesFiltradas.map((obs) => {
              const escopoObs = (obs.escopo ?? 'pessoal') as ObservacaoEscopo;
              const { label: scopeLabel, Icon: ScopeIcon, className: scopeClassName } = scopeConfig[escopoObs];
              const souMencionado = obs.mencoes?.some(m => m.usuario_mencionado === usuario);
              const vistosPor = obs.mencoes?.filter(m => m.visto_em !== null) ?? [];
              const isReplying = replyingToId === obs.id;
              return (
                <div
                  key={obs.id}
                  className={cn(
                    'group flex gap-3 rounded-lg p-1.5 -mx-1.5 transition-colors',
                    souMencionado && 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/40'
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {getInitials(obs.usuario)}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {obs.usuario}
                      </span>
                      <span
                        className="text-xs text-muted-foreground flex-shrink-0 cursor-default"
                        title={format(new Date(obs.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      >
                        {formatDistanceToNow(new Date(obs.criado_em), { addSuffix: true, locale: ptBR })}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0',
                        scopeClassName
                      )}>
                        <ScopeIcon className="h-2.5 w-2.5" />
                        {scopeLabel}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {/* Botao responder */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => {
                            setReplyingToId(isReplying ? null : obs.id);
                            setReplyConteudo('');
                          }}
                          title="Responder"
                        >
                          <Reply className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        {usuario === obs.usuario && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => {
                                setEditingId(editingId === obs.id ? null : obs.id);
                                setEditConteudo(obs.conteudo);
                              }}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => handleDelete(obs.id)}
                              aria-label="Excluir observacao"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edição inline ou conteúdo */}
                    {editingId === obs.id ? (
                      <div className="mt-2 space-y-2 p-2 border border-primary/30 rounded bg-primary/5">
                        <RichTextEditor
                          value={editConteudo}
                          onChange={setEditConteudo}
                          placeholder="Editar observação..."
                          editorClassName="min-h-[80px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setEditingId(null);
                              setEditConteudo('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={handleUpdate}
                            disabled={!editConteudo.trim() || isUpdating}
                          >
                            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/90 mt-0.5">
                        {renderizarConteudo(obs.conteudo)}
                      </div>
                    )}

                    {/* Tag "Visto por X" */}
                    {vistosPor.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vistosPor.map(m => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5"
                            title={m.visto_em ? format(new Date(m.visto_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                          >
                            <Eye className="h-2.5 w-2.5" />
                            Visto por {m.usuario_mencionado.split('@')[0]}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Respostas indentadas */}
                    {(obs.respostas ?? []).length > 0 && (
                      <div className="mt-2 space-y-2 pl-3 border-l-2 border-muted">
                        {(obs.respostas ?? []).map(resp => (
                          <div key={resp.id} className="group/resp flex gap-2">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                              {getInitials(resp.usuario)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-medium truncate">{resp.usuario}</span>
                                <span
                                  className="text-[10px] text-muted-foreground cursor-default"
                                  title={format(new Date(resp.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                >
                                  {formatDistanceToNow(new Date(resp.criado_em), { addSuffix: true, locale: ptBR })}
                                </span>
                                {usuario === resp.usuario && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 opacity-0 group-hover/resp:opacity-100 transition-opacity ml-auto"
                                    onClick={() => handleDelete(resp.id, obs.id)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5 text-destructive" />
                                  </Button>
                                )}
                              </div>
                              <div className="text-xs text-foreground/90">
                                {renderizarConteudo(resp.conteudo)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Caixa de resposta inline */}
                    {isReplying && (
                      <div className="mt-2 pl-3 border-l-2 border-primary/30">
                        <div className="relative">
                          <RichTextEditor
                            value={replyConteudo}
                            onChange={setReplyConteudo}
                            onSubmit={() => handleSendReply(obs.id)}
                            onMentionQuery={mencoeReply.handleMentionQuery}
                            members={membrosEquipe}
                            placeholder="Responder... use @ para mencionar"
                            editorClassName="min-h-[60px]"
                          />
                          <MentionDropdown
                            show={mencoeReply.showDropdown}
                            members={mencoeReply.membrosFiltrados()}
                            onSelect={mencoeReply.handleSelectMembro}
                            onClose={mencoeReply.handleCloseMentionDropdown}
                          />
                        </div>
                        <div className="flex gap-1 mt-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => { setReplyingToId(null); setReplyConteudo(''); }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleSendReply(obs.id)}
                            disabled={!replyConteudo.trim() || isSendingReply}
                          >
                            {isSendingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Responder'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
