"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MessageSquare, Send, Trash2, X, Tag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { getObservacoes, createObservacao, deleteObservacao } from '@/lib/api/observacoes-api-client';
import { getMyTeams } from '@/lib/api/teams-api-client';
import {
  getTeamTags,
  getProcessoTeamTags,
  createTeamTag,
  tagProcesso,
} from '@/lib/api/team-tags-api-client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Observacao, Team, TeamTag } from '@/types/teams';

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
  teamId: string;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tag state
  const [teams, setTeams] = useState<Team[]>([]);
  const [appliedTags, setAppliedTags] = useState<AppliedTag[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamTagsList, setTeamTagsList] = useState<TeamTag[]>([]);
  const [isLoadingTeamTags, setIsLoadingTeamTags] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const loadObservacoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getObservacoes(numeroProcesso, equipeId, equipeId ? usuario ?? undefined : undefined);
      if (!('error' in result)) {
        setObservacoes(result);
        setTimeout(scrollToBottom, 100);
      }
    } finally {
      setIsLoading(false);
    }
  }, [numeroProcesso, equipeId, usuario, scrollToBottom]);

  const loadTeamsAndAppliedTags = useCallback(async () => {
    if (!usuario) return;
    setIsLoadingTeams(true);
    try {
      const teamsResult = await getMyTeams(usuario);
      if ('error' in teamsResult) return;
      setTeams(teamsResult);

      // Fetch applied tags across all teams
      const allApplied: AppliedTag[] = [];
      await Promise.all(
        teamsResult.map(async (team) => {
          const tagsResult = await getProcessoTeamTags(team.id, numeroProcesso, usuario);
          if (!('error' in tagsResult)) {
            for (const tag of tagsResult) {
              allApplied.push({ tag, teamName: team.nome, teamId: team.id });
            }
          }
        })
      );
      setAppliedTags(allApplied);
    } finally {
      setIsLoadingTeams(false);
    }
  }, [usuario, numeroProcesso]);

  useEffect(() => {
    if (isOpen) {
      loadObservacoes();
      loadTeamsAndAppliedTags();
    }
  }, [isOpen, loadObservacoes, loadTeamsAndAppliedTags]);

  // When a team is selected in the popover, fetch its tags
  const handleSelectTeam = async (team: Team) => {
    if (!usuario) return;
    setSelectedTeam(team);
    setIsLoadingTeamTags(true);
    setTagFilter('');
    try {
      const result = await getTeamTags(team.id, usuario);
      setTeamTagsList('error' in result ? [] : result);
    } finally {
      setIsLoadingTeamTags(false);
    }
  };

  const handleAddTag = async (tag: TeamTag) => {
    if (!usuario || !selectedTeam) return;
    const result = await tagProcesso(selectedTeam.id, tag.id, usuario, numeroProcesso);
    if ('error' in result) {
      toast({ title: "Erro ao adicionar tag", description: result.error, variant: "destructive" });
      return;
    }
    setAppliedTags(prev => [...prev, { tag, teamName: selectedTeam.nome, teamId: selectedTeam.id }]);
    setIsTagPopoverOpen(false);
    setSelectedTeam(null);
    setTagFilter('');
  };

  const handleRemoveTag = async (applied: AppliedTag) => {
    if (!usuario) return;
    // Optimistic remove
    setAppliedTags(prev => prev.filter(a => !(a.tag.id === applied.tag.id && a.teamId === applied.teamId)));
    // Re-fetch to confirm
    const refreshed = await getProcessoTeamTags(applied.teamId, numeroProcesso, usuario);
    if (!('error' in refreshed)) {
      setAppliedTags(prev => {
        const otherTeams = prev.filter(a => a.teamId !== applied.teamId);
        const thisTeam = refreshed.map(t => ({ tag: t, teamName: applied.teamName, teamId: applied.teamId }));
        return [...otherTeams, ...thisTeam];
      });
    }
  };

  const handleCreateAndAddTag = async () => {
    if (!usuario || !selectedTeam || !tagFilter.trim()) return;
    setIsCreatingTag(true);
    try {
      const result = await createTeamTag(selectedTeam.id, usuario, tagFilter.trim());
      if ('error' in result) {
        toast({ title: "Erro ao criar tag", description: result.error, variant: "destructive" });
        return;
      }
      setTeamTagsList(prev => [...prev, result]);
      await handleAddTag(result);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSend = async () => {
    if (!usuario || !conteudo.trim() || isSending) return;
    setIsSending(true);
    try {
      const result = await createObservacao(numeroProcesso, usuario, conteudo.trim(), equipeId);
      if ('error' in result) {
        toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => [...prev, result]);
      setConteudo('');
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (observacaoId: string) => {
    if (!usuario) return;
    const result = await deleteObservacao(numeroProcesso, observacaoId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
      return;
    }
    setObservacoes(prev => prev.filter(o => o.id !== observacaoId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter available tags (exclude already applied for selected team)
  const appliedIdsForSelectedTeam = new Set(
    appliedTags.filter(a => a.teamId === selectedTeam?.id).map(a => a.tag.id)
  );
  const availableTags = teamTagsList.filter(
    t => !appliedIdsForSelectedTeam.has(t.id) && t.nome.toLowerCase().includes(tagFilter.toLowerCase())
  );

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
              <MessageSquare className="h-5 w-5" /> Observacoes
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

        {/* Tags inline row */}
        <div className="flex-shrink-0 flex flex-wrap items-center gap-1.5 pb-3 border-b">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {appliedTags.map((applied) => (
            <Badge
              key={`${applied.teamId}-${applied.tag.id}`}
              variant="secondary"
              className="text-xs flex items-center gap-1 pr-1"
              style={applied.tag.cor ? { backgroundColor: applied.tag.cor, color: '#fff' } : undefined}
              title={applied.teamName}
            >
              {applied.tag.nome}
              <button
                className="ml-0.5 hover:opacity-70"
                onClick={() => handleRemoveTag(applied)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {isLoadingTeams ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          ) : teams.length > 0 ? (
            <Popover
                open={isTagPopoverOpen}
                onOpenChange={(open) => {
                  setIsTagPopoverOpen(open);
                  if (!open) {
                    setSelectedTeam(null);
                    setTagFilter('');
                    setTeamTagsList([]);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                    <Plus className="h-3 w-3 mr-1" /> Tag
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  {!selectedTeam ? (
                    /* Step 1: Pick a team */
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 px-1">Selecione a equipe</p>
                      <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent"
                            onClick={() => handleSelectTeam(team)}
                          >
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
                        onClick={() => { setSelectedTeam(null); setTagFilter(''); setTeamTagsList([]); }}
                      >
                        &larr; {selectedTeam.nome}
                      </button>
                      <Input
                        placeholder="Filtrar ou criar tag..."
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tagFilter.trim() && availableTags.length === 0) {
                            handleCreateAndAddTag();
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
                        <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                          {availableTags.map((tag) => (
                            <button
                              key={tag.id}
                              className="w-full text-left px-2 py-1 rounded text-sm hover:bg-accent flex items-center gap-2"
                              onClick={() => handleAddTag(tag)}
                            >
                              {tag.cor && (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                              )}
                              {tag.nome}
                            </button>
                          ))}
                          {tagFilter.trim() && availableTags.length === 0 && (
                            <button
                              className="w-full text-left px-2 py-1 rounded text-sm hover:bg-accent text-primary"
                              onClick={handleCreateAndAddTag}
                              disabled={isCreatingTag}
                            >
                              {isCreatingTag ? (
                                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                              ) : (
                                <Plus className="h-3 w-3 inline mr-1" />
                              )}
                              Criar &quot;{tagFilter.trim()}&quot;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
          ) : null}
        </div>

        {/* Input box */}
        <div className="flex-shrink-0 border-b pb-3 pt-3 dark:bg-background">
          <div className="flex gap-2 items-stretch">
            <textarea
              ref={textareaRef}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreva uma observacao..."
              rows={2}
              className="flex-1 resize-none rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!conteudo.trim() || isSending}
              className="w-10 p-0 flex-shrink-0"
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

        {/* Scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : observacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Nenhuma observacao ainda.</p>
              <p className="text-xs mt-1">Seja o primeiro a comentar sobre este processo.</p>
            </div>
          ) : (
            observacoes.map((obs) => (
              <div key={obs.id} className="group flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {getInitials(obs.usuario)}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {obs.usuario}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(obs.criado_em), { addSuffix: true, locale: ptBR })}
                    </span>
                    {usuario === obs.usuario && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => handleDelete(obs.id)}
                        aria-label="Excluir observacao"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                    {obs.conteudo}
                  </p>
                </div>
              </div>
            ))
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
