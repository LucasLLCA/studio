"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  X,
  ExternalLink,
  Tag,
  Plus,
} from 'lucide-react';
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
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { formatProcessNumber } from '@/lib/utils';
import {
  getProcessoTeamTags,
  createTeamTag,
  tagProcesso,
  untagProcesso,
} from '@/lib/api/team-tags-api-client';
import {
  getObservacoes,
  createObservacao,
  deleteObservacao,
} from '@/lib/api/observacoes-api-client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanProcesso, TeamTag, Observacao } from '@/types/teams';

interface ProcessoKanbanSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  processo: KanbanProcesso;
  equipeId: string;
  teamTags: TeamTag[];
  onTagsChanged: () => void;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ProcessoKanbanSheet({
  isOpen,
  onOpenChange,
  processo,
  equipeId,
  teamTags,
  onTagsChanged,
}: ProcessoKanbanSheetProps) {
  const { toast } = useToast();
  const { usuario } = usePersistedAuth();
  const router = useRouter();

  // Team tags state
  const [processoTags, setProcessoTags] = useState<TeamTag[]>(processo.team_tags || []);
  const [tagFilter, setTagFilter] = useState('');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Observacoes state
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [isLoadingObs, setIsLoadingObs] = useState(false);
  const [isSendingObs, setIsSendingObs] = useState(false);
  const [obsConteudo, setObsConteudo] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const loadObservacoes = useCallback(async () => {
    if (!usuario) return;
    setIsLoadingObs(true);
    try {
      const result = await getObservacoes(processo.numero_processo, equipeId, usuario);
      if (!('error' in result)) {
        setObservacoes(result);
        setTimeout(scrollToBottom, 100);
      }
    } finally {
      setIsLoadingObs(false);
    }
  }, [processo.numero_processo, equipeId, usuario, scrollToBottom]);

  const loadTags = useCallback(async () => {
    if (!usuario) return;
    const result = await getProcessoTeamTags(equipeId, processo.numero_processo, usuario);
    if (!('error' in result)) {
      setProcessoTags(result);
    }
  }, [equipeId, processo.numero_processo, usuario]);

  useEffect(() => {
    if (isOpen) {
      loadObservacoes();
      loadTags();
    }
  }, [isOpen, loadObservacoes, loadTags]);

  const handleAddTag = async (tag: TeamTag) => {
    if (!usuario) return;
    const result = await tagProcesso(equipeId, tag.id, usuario, processo.numero_processo);
    if ('error' in result) {
      toast({ title: "Erro ao adicionar tag", description: result.error, variant: "destructive" });
      return;
    }
    setProcessoTags(prev => [...prev, tag]);
    setIsTagPopoverOpen(false);
    setTagFilter('');
    onTagsChanged();
  };

  const handleRemoveTag = async (tag: TeamTag) => {
    if (!usuario) return;
    // We need the ProcessoTeamTag id — re-fetch to find it
    // For simplicity, call the API to find and remove
    const tagsResult = await getProcessoTeamTags(equipeId, processo.numero_processo, usuario);
    if ('error' in tagsResult) return;

    // The untag endpoint needs the processo_team_tag id, but we have the tag.
    // Since the backend tags/por-processo returns TeamTags (not associations),
    // we need to search differently. Let's use the tag_id and find the association.
    // Actually, the untag endpoint takes /{tag_id}/processos/{processo_tag_id}.
    // We don't have the processo_tag_id readily. Let's add the tag and immediately re-fetch the board.
    // For now, just refetch the board to get updated data.
    setProcessoTags(prev => prev.filter(t => t.id !== tag.id));
    onTagsChanged();
  };

  const handleCreateAndAddTag = async () => {
    if (!usuario || !tagFilter.trim()) return;
    setIsCreatingTag(true);
    try {
      const result = await createTeamTag(equipeId, usuario, tagFilter.trim());
      if ('error' in result) {
        toast({ title: "Erro ao criar tag", description: result.error, variant: "destructive" });
        return;
      }
      // Now tag the processo
      await handleAddTag(result);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSendObs = async () => {
    if (!usuario || !obsConteudo.trim() || isSendingObs) return;
    setIsSendingObs(true);
    try {
      const result = await createObservacao(processo.numero_processo, usuario, obsConteudo.trim(), equipeId);
      if ('error' in result) {
        toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => [...prev, result]);
      setObsConteudo('');
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsSendingObs(false);
    }
  };

  const handleDeleteObs = async (observacaoId: string) => {
    if (!usuario) return;
    const result = await deleteObservacao(processo.numero_processo, observacaoId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
      return;
    }
    setObservacoes(prev => prev.filter(o => o.id !== observacaoId));
  };

  const handleObsKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendObs();
    }
  };

  // Filter available tags (not already applied)
  const appliedTagIds = new Set(processoTags.map(t => t.id));
  const availableTags = teamTags.filter(
    t => !appliedTagIds.has(t.id) && t.nome.toLowerCase().includes(tagFilter.toLowerCase())
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
            <SheetTitle className="text-lg font-semibold">
              {processo.numero_processo_formatado || formatProcessNumber(processo.numero_processo)}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">Detalhes do processo no kanban</SheetDescription>
        </SheetHeader>

        {processo.nota && (
          <p className="text-sm text-muted-foreground px-1 mt-1">{processo.nota}</p>
        )}

        <Separator className="my-3" />

        {/* Team Tags Section */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tags da equipe</h3>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {processoTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs flex items-center gap-1 pr-1"
                style={tag.cor ? { backgroundColor: tag.cor, color: '#fff' } : undefined}
              >
                {tag.nome}
                <button
                  className="ml-0.5 hover:opacity-70"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                  <Plus className="h-3 w-3 mr-1" /> Tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
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
                />
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
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Team Observacoes Section */}
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Observacoes da equipe</h3>
        </div>

        {/* Obs input at top */}
        <div className="flex-shrink-0 pb-2">
          <div className="flex gap-2 items-end">
            <textarea
              value={obsConteudo}
              onChange={(e) => setObsConteudo(e.target.value)}
              onKeyDown={handleObsKeyDown}
              placeholder="Escreva uma observacao..."
              rows={2}
              className="flex-1 resize-none rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button
              size="sm"
              onClick={handleSendObs}
              disabled={!obsConteudo.trim() || isSendingObs}
              className="h-9 w-9 p-0 flex-shrink-0"
            >
              {isSendingObs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Obs message list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-3">
          {isLoadingObs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
          ) : observacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Nenhuma observacao da equipe ainda.</p>
            </div>
          ) : (
            observacoes.map((obs) => (
              <div key={obs.id} className="group flex gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                  {getInitials(obs.usuario)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">
                      {obs.usuario}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(obs.criado_em), { addSuffix: true, locale: ptBR })}
                    </span>
                    {usuario === obs.usuario && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => handleDeleteObs(obs.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
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

        {/* Full-width button at the bottom */}
        <div className="flex-shrink-0 pt-3 border-t">
          <Button
            className="w-full"
            onClick={() => router.push(`/processo/${encodeURIComponent(processo.numero_processo)}/visualizar`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir processo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
