"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MessageSquare, Send, Trash2, X, Tag, Plus, Lock, Users, Globe, Reply, Eye } from 'lucide-react';
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
import { getObservacoes, createObservacao, deleteObservacao, getMencoesNaoLidas, marcarMencaoVista } from '@/lib/api/observacoes-api-client';
import { getMyTeams, getTeamDetail } from '@/lib/api/teams-api-client';
import {
  getTags,
  getProcessoTags,
  createTag,
  tagProcesso,
  untagProcessoPorNumero,
} from '@/lib/api/tags-api-client';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Observacao, ObservacaoEscopo, Team, TeamTag, TeamMember } from '@/types/teams';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Escopo
  const [escopo, setEscopo] = useState<ObservacaoEscopo>('pessoal');
  const [escopoEquipeId, setEscopoEquipeId] = useState<string | undefined>(equipeId);
  const [filterEscopo, setFilterEscopo] = useState<'todos' | ObservacaoEscopo>('todos');

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

  // @mencao state
  const [membrosEquipe, setMembrosEquipe] = useState<TeamMember[]>([]);
  const [mencaoAtiva, setMencaoAtiva] = useState<string | null>(null);
  const [showMencaoDropdown, setShowMencaoDropdown] = useState(false);

  // Badge de mencoes nao lidas
  const [mencoesBadge, setMencoesBadge] = useState(0);

  // Respostas inline
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyConteudo, setReplyConteudo] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyMencaoAtiva, setReplyMencaoAtiva] = useState<string | null>(null);
  const [showReplyMencaoDropdown, setShowReplyMencaoDropdown] = useState(false);

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
    const membrosPromise = equipeId ? getTeamDetail(equipeId, usuario) : Promise.resolve(null);
    const [badgeResult, teamResult] = await Promise.all([badgePromise, membrosPromise]);
    if (!('error' in badgeResult)) {
      setMencoesBadge(badgeResult.count);
    }
    if (teamResult && !('error' in teamResult)) {
      setMembrosEquipe(teamResult.membros);
    }
  }, [numeroProcesso, equipeId, usuario]);

  const loadTeamsAndAppliedTags = useCallback(async () => {
    if (!usuario) return;
    setIsLoadingTeams(true);
    try {
      const [teamsResult, personalTagsResult] = await Promise.all([
        getMyTeams(usuario),
        getProcessoTags(numeroProcesso, usuario), // personal tags (no equipeId)
      ]);

      const fetchedTeams = 'error' in teamsResult ? [] : teamsResult;
      setTeams(fetchedTeams);

      const allApplied: AppliedTag[] = [];

      // Personal applied tags
      if (!('error' in personalTagsResult)) {
        for (const tag of personalTagsResult) {
          allApplied.push({ tag, teamName: 'Pessoal', teamId: null });
        }
      }

      // Team applied tags
      await Promise.all(
        fetchedTeams.map(async (team) => {
          const tagsResult = await getProcessoTags(numeroProcesso, usuario, team.id);
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
      loadMembrosEBadge();
    }
  }, [isOpen, loadObservacoes, loadTeamsAndAppliedTags, loadMembrosEBadge]);

  // Track whether popover is in personal or team mode
  const [isPersonalMode, setIsPersonalMode] = useState(false);

  const handleSelectPersonal = async () => {
    if (!usuario) return;
    setIsPersonalMode(true);
    setSelectedTeam(null);
    setIsLoadingTeamTags(true);
    setTagFilter('');
    try {
      const result = await getTags(usuario); // no equipeId = personal
      setTeamTagsList('error' in result ? [] : result);
    } finally {
      setIsLoadingTeamTags(false);
    }
  };

  // When a team is selected in the popover, fetch its tags
  const handleSelectTeam = async (team: Team) => {
    if (!usuario) return;
    setIsPersonalMode(false);
    setSelectedTeam(team);
    setIsLoadingTeamTags(true);
    setTagFilter('');
    try {
      const result = await getTags(usuario, team.id);
      setTeamTagsList('error' in result ? [] : result);
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
      const result = await createTag(usuario, tagFilter.trim(), undefined, equipeId_param);
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

  // @mention helpers
  const detectMencao = (texto: string, cursor: number) => {
    const textoAteCursor = texto.slice(0, cursor);
    const match = textoAteCursor.match(/@([\w.]*)$/);
    return match ? match[1] : null;
  };

  const handleObsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value;
    setConteudo(texto);
    const cursor = e.target.selectionStart ?? 0;
    const mencao = detectMencao(texto, cursor);
    setMencaoAtiva(mencao);
    setShowMencaoDropdown(mencao !== null);
  };

  const handleSelectMencao = (membro: TeamMember) => {
    const cursor = textareaRef.current?.selectionStart ?? conteudo.length;
    const textoAteCursor = conteudo.slice(0, cursor);
    const match = textoAteCursor.match(/@([\w.]*)$/);
    if (!match) return;
    const inicio = cursor - match[0].length;
    const novo = conteudo.slice(0, inicio) + `@${membro.usuario} ` + conteudo.slice(cursor);
    setConteudo(novo);
    setShowMencaoDropdown(false);
    setMencaoAtiva(null);
    textareaRef.current?.focus();
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const texto = e.target.value;
    setReplyConteudo(texto);
    const cursor = e.target.selectionStart ?? 0;
    const mencao = detectMencao(texto, cursor);
    setReplyMencaoAtiva(mencao);
    setShowReplyMencaoDropdown(mencao !== null);
  };

  const handleSelectReplyMencao = (membro: TeamMember, textareaEl: HTMLTextAreaElement | null) => {
    const cursor = textareaEl?.selectionStart ?? replyConteudo.length;
    const textoAteCursor = replyConteudo.slice(0, cursor);
    const match = textoAteCursor.match(/@([\w.]*)$/);
    if (!match) return;
    const inicio = cursor - match[0].length;
    const novo = replyConteudo.slice(0, inicio) + `@${membro.usuario} ` + replyConteudo.slice(cursor);
    setReplyConteudo(novo);
    setShowReplyMencaoDropdown(false);
    setReplyMencaoAtiva(null);
    textareaEl?.focus();
  };

  const membrosFiltradosMencao = (query: string | null) => {
    if (query === null) return [];
    return membrosEquipe.filter(
      m => m.usuario !== usuario && m.usuario.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSend = async () => {
    if (!usuario || !conteudo.trim() || isSending) return;
    setIsSending(true);
    const equipeParaEnvio = escopo === 'equipe' ? (equipeId ?? escopoEquipeId) : undefined;
    try {
      const result = await createObservacao(
        numeroProcesso, usuario, conteudo.trim(), escopo, equipeParaEnvio,
        [], // backend extrai @mencoes do conteudo
      );
      if ('error' in result) {
        toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => [...prev, result]);
      setConteudo('');
      setShowMencaoDropdown(false);
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
      const result = await createObservacao(
        numeroProcesso, usuario, replyConteudo.trim(),
        escopo, equipeParaEnvio,
        [], parentId,
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
      setShowReplyMencaoDropdown(false);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMencaoDropdown && e.key === 'Escape') {
      setShowMencaoDropdown(false);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !showMencaoDropdown) {
      e.preventDefault();
      handleSend();
    }
  };

  // Renderiza conteudo com @mencoes destacadas
  const renderizarConteudo = (texto: string) => {
    const partes = texto.split(/(@[\w.]+(?:@[\w.]+)*)/g);
    return partes.map((parte, i) => {
      if (parte.startsWith('@')) {
        const isMe = usuario && parte.slice(1) === usuario;
        return (
          <span key={i} className={cn('font-semibold', isMe ? 'text-primary' : 'text-blue-600')}>
            {parte}
          </span>
        );
      }
      return <span key={i}>{parte}</span>;
    });
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
          ) : (
            <Popover
              open={isTagPopoverOpen}
              onOpenChange={(open) => {
                setIsTagPopoverOpen(open);
                if (!open) {
                  setSelectedTeam(null);
                  setIsPersonalMode(false);
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
                      onClick={() => { setSelectedTeam(null); setIsPersonalMode(false); setTagFilter(''); setTeamTagsList([]); }}
                    >
                      &larr; {isPersonalMode ? 'Pessoal' : selectedTeam!.nome}
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
          )}
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
              <textarea
                ref={textareaRef}
                value={conteudo}
                onChange={handleObsChange}
                onKeyDown={handleKeyDown}
                placeholder="Escreva uma observacao... use @ para mencionar"
                rows={2}
                className="w-full resize-none rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {/* Dropdown @mencao */}
              {showMencaoDropdown && membrosFiltradosMencao(mencaoAtiva ?? '').length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-36 overflow-y-auto">
                  {membrosFiltradosMencao(mencaoAtiva ?? '').map(membro => (
                    <button
                      key={membro.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectMencao(membro); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent text-left"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {membro.usuario[0].toUpperCase()}
                      </span>
                      <span className="truncate">{membro.usuario}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={() => handleDelete(obs.id)}
                            aria-label="Excluir observacao"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Conteudo com @mencoes destacadas */}
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                      {renderizarConteudo(obs.conteudo)}
                    </p>

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
                              <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">
                                {renderizarConteudo(resp.conteudo)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Caixa de resposta inline */}
                    {isReplying && (
                      <div className="mt-2 pl-3 border-l-2 border-primary/30">
                        <div className="relative">
                          <textarea
                            autoFocus
                            value={replyConteudo}
                            onChange={handleReplyChange}
                            onKeyDown={(e) => {
                              if (showReplyMencaoDropdown && e.key === 'Escape') {
                                setShowReplyMencaoDropdown(false);
                                return;
                              }
                              if (e.key === 'Enter' && !e.shiftKey && !showReplyMencaoDropdown) {
                                e.preventDefault();
                                handleSendReply(obs.id);
                              }
                              if (e.key === 'Escape' && !showReplyMencaoDropdown) {
                                setReplyingToId(null);
                              }
                            }}
                            placeholder="Responder... use @ para mencionar"
                            rows={2}
                            className="w-full resize-none rounded-md border border-input bg-white dark:bg-background px-2 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          />
                          {/* Dropdown @mencao reply */}
                          {showReplyMencaoDropdown && membrosFiltradosMencao(replyMencaoAtiva ?? '').length > 0 && (
                            <div className="absolute bottom-full left-0 mb-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-28 overflow-y-auto">
                              {membrosFiltradosMencao(replyMencaoAtiva ?? '').map(membro => (
                                <button
                                  key={membro.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectReplyMencao(membro, e.currentTarget.closest('.relative')?.querySelector('textarea') ?? null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent text-left"
                                >
                                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                    {membro.usuario[0].toUpperCase()}
                                  </span>
                                  <span className="truncate">{membro.usuario}</span>
                                </button>
                              ))}
                            </div>
                          )}
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
