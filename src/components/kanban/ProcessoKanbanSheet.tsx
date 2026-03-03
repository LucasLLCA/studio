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
  Check,
  ChevronDown,
  Info,
  ArrowRight,
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
import { formatProcessNumber, cn } from '@/lib/utils';
import {
  getProcessoTeamTags,
  createTeamTag,
  tagProcesso,
  untagProcesso,
  salvarProcessoNoKanban,
} from '@/lib/api/team-tags-api-client';

// Função para buscar o kanban da equipe
async function getKanbanColunas(equipeId: string, usuario: string) {
  const res = await fetch(`/equipes/${equipeId}/kanban?usuario=${encodeURIComponent(usuario)}`);
  const json = await res.json();
  return json.data.colunas;
}
import {
  getObservacoes,
  createObservacao,
  deleteObservacao,
} from '@/lib/api/observacoes-api-client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanProcesso, TeamTag, Observacao } from '@/types/teams';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';



interface ProcessoKanbanSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  processo: KanbanProcesso;
  equipeId: string;
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
  onTagsChanged,
}: ProcessoKanbanSheetProps) {
  const [moverModalAberto, setMoverModalAberto] = useState(false);
  const [gruposDestino, setGruposDestino] = useState<TeamTag[]>([]);
  const [multiSelectAberto, setMultiSelectAberto] = useState(false);
  const { toast } = useToast();
  const { usuario } = usePersistedAuth();
  const router = useRouter();
  const [isMoving, setIsMoving] = useState(false);


  // Team tags state
  const [processoTags, setProcessoTags] = useState<TeamTag[]>(processo.team_tags || []);
  const [kanbanColunas, setKanbanColunas] = useState<any[]>([]); // Colunas do kanban
  const [tagFilter, setTagFilter] = useState('');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Busca as colunas do kanban ao abrir o sidebar
  const loadKanbanColunas = useCallback(async () => {
    if (!usuario) return;
    // Busca o board completo para garantir que está pegando as colunas corretas
    const boardResult = await import('@/lib/api/team-tags-api-client').then(m => m.getKanbanBoard(equipeId, usuario));
    if (!('error' in boardResult)) {
      setKanbanColunas(boardResult.colunas);
    } else {
      setKanbanColunas([]);
    }
  }, [equipeId, usuario]);

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

  // const move -> Função para mover

  const toggleGrupoDestino = useCallback((coluna: { tag_id: string; tag_nome: string; tag_cor: string; equipe_id?: string; criado_por?: string; criado_em?: string; atualizado_em?: string }) => {
    const tag: TeamTag = {
      id: coluna.tag_id,
      nome: coluna.tag_nome,
      cor: coluna.tag_cor,
      equipe_id: coluna.equipe_id ?? equipeId,
      criado_por: coluna.criado_por ?? '',
      criado_em: coluna.criado_em ?? '',
      atualizado_em: coluna.atualizado_em ?? '',
    };
    setGruposDestino(prev =>
      prev.some(g => g.id === tag.id)
        ? prev.filter(g => g.id !== tag.id)
        : [...prev, tag]
    );
  }, [equipeId]);

  const moverProcessoParaGrupos = useCallback(async () => {
    if (!usuario || gruposDestino.length === 0) return;
    setIsMoving(true);
    try {
      const resultados = await Promise.all(
        gruposDestino.map(grupo =>
          salvarProcessoNoKanban(
            equipeId,
            grupo.id,
            processo.numero_processo,
            processo.numero_processo_formatado ?? undefined,
            usuario,
          )
        )
      );

      const erros = resultados.filter(r => 'error' in r) as { error: string; status?: number }[];
      const sucessos = resultados.filter(r => !('error' in r));

      if (erros.length === 0) {
        toast({
          title: "Processo adicionado com sucesso!",
          description: gruposDestino.length === 1
            ? `Adicionado ao grupo "${gruposDestino[0].nome}".`
            : `Adicionado a ${gruposDestino.length} grupos.`,
        });
      } else if (sucessos.length > 0) {
        toast({
          title: "Adicionado parcialmente",
          description: `${sucessos.length} grupo(s) com sucesso, ${erros.length} com erro (processo já existia).`,
          variant: "destructive",
        });
      } else {
        const primeiroErro = erros[0];
        const description = primeiroErro.status === 409
          ? 'O processo já existe em todos os grupos selecionados.'
          : primeiroErro.error;
        toast({ title: "Erro ao adicionar processo", description, variant: "destructive" });
        return;
      }

      setGruposDestino([]);
      setMoverModalAberto(false);
      onTagsChanged();
    } finally {
      setIsMoving(false);
    }
  }, [equipeId, processo.numero_processo, processo.numero_processo_formatado, usuario, toast, onTagsChanged, gruposDestino]);


  useEffect(() => {
    if (isOpen) {
      loadObservacoes();
      loadTags();
      loadKanbanColunas();
    }
  }, [isOpen, loadObservacoes, loadTags, loadKanbanColunas]);

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
  const availableTags = kanbanColunas
    .map(coluna => ({
      id: coluna.tag_id,
      nome: coluna.tag_nome,
      cor: coluna.tag_cor,
      equipe_id: coluna.equipe_id ?? equipeId,
      criado_por: coluna.criado_por ?? '',
      criado_em: coluna.criado_em ?? '',
      atualizado_em: coluna.atualizado_em ?? '',
    }))
    .filter(t => !appliedTagIds.has(t.id) && t.nome.toLowerCase().includes(tagFilter.toLowerCase()));

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

          {/* Multi-select de grupos para mover processo */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Adicionar a outros grupos:</h3>
            </div>

            {/* Informativo */}
            <div className="flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-600 leading-snug">
                Selecione um ou mais grupos para adicionar este processo a todos eles simultaneamente.
              </p>
            </div>

            {/* Popover multi-select */}
            <Popover open={multiSelectAberto} onOpenChange={setMultiSelectAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={multiSelectAberto}
                  className="w-full justify-between font-normal text-muted-foreground hover:text-foreground"
                >
                  {gruposDestino.length === 0
                    ? 'Selecione os grupos de destino...'
                    : `${gruposDestino.length} grupo${gruposDestino.length > 1 ? 's' : ''} selecionado${gruposDestino.length > 1 ? 's' : ''}`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
                <div className="max-h-48 overflow-y-auto">
                  {kanbanColunas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum grupo encontrado.</p>
                  ) : (
                    kanbanColunas.map(coluna => {
                      const isSelecionado = gruposDestino.some(g => g.id === coluna.tag_id);
                      return (
                        <button
                          key={coluna.tag_id}
                          type="button"
                          onClick={() => toggleGrupoDestino(coluna)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left hover:bg-accent cursor-pointer"
                        >
                          <div className={cn(
                            'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                            isSelecionado
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/40'
                          )}>
                            {isSelecionado && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="flex-1">{coluna.tag_nome}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                {gruposDestino.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-1 pb-0.5 pt-0.5">
                      <Button
                        className="w-full h-8 text-sm"
                        onClick={() => {
                          setMultiSelectAberto(false);
                          setMoverModalAberto(true);
                        }}
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                        Adicionar a {gruposDestino.length} grupo{gruposDestino.length > 1 ? 's' : ''}
                      </Button>
                    </div>
                  </>
                )}
              </PopoverContent>
            </Popover>

            {/* Chips dos grupos selecionados */}
            {gruposDestino.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {gruposDestino.map(grupo => (
                  <span
                    key={grupo.id}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5"
                  >
                    {grupo.nome}
                    <button
                      type="button"
                      onClick={() => setGruposDestino(prev => prev.filter(g => g.id !== grupo.id))}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

          </div>

          {/* Dialog de confirmação */}
          <Dialog open={moverModalAberto} onOpenChange={setMoverModalAberto}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Confirmar adição</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <p className="text-sm text-muted-foreground">
                  O processo será adicionado {gruposDestino.length === 1 ? 'ao grupo:' : `aos seguintes ${gruposDestino.length} grupos:`}
                </p>
                <ul className="space-y-1.5">
                  {gruposDestino.map(grupo => (
                    <li key={grupo.id} className="flex items-center gap-2 text-sm font-medium">
                      <ArrowRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {grupo.nome}
                    </li>
                  ))}
                </ul>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline" disabled={isMoving}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  disabled={isMoving}
                  onClick={moverProcessoParaGrupos}
                >
                  {isMoving
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adicionando...</>
                    : 'Confirmar'
                  }
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <SheetDescription className="sr-only">Detalhes do processo no kanban</SheetDescription>
        </SheetHeader>

        {processo.nota && (
          <p className="text-sm text-muted-foreground px-1 mt-1">{processo.nota}</p>
        )}

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
