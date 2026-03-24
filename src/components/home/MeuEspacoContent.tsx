"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, MoreHorizontal, Share2, Pencil, AlertTriangle, ChevronDown, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabListWrapper } from './TabListWrapper';
import { ProcessoItemRow } from './ProcessoItemRow';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getMyGrupos, getGrupoWithProcessos, removeProcessoFromGrupo, deleteGrupo, updateGrupo } from '@/lib/api/grupos-api-client';
import type { GrupoProcesso, GrupoProcessoWithProcessos } from '@/types/teams';
import { useFeed, useProcessosComAtividade } from '@/lib/react-query/queries/useBiQueries';
import { FeedPanel } from '@/components/bi/FeedPanel';
import { formatProcessNumber, cn } from '@/lib/utils';
import type { FeedEntry, ProcessoComAtividade } from '@/types/bi';

interface MeuEspacoContentProps {
  usuario: string;
  onShareTag?: (tagId: string) => void;
  contextoMap?: Record<string, string>;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `ha ${diffMinutes} min`;
  if (diffHours < 24) return `ha ${diffHours}h`;
  if (diffDays < 7) return `ha ${diffDays}d`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function MeuEspacoContent({ usuario, onShareTag, contextoMap = {} }: MeuEspacoContentProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [isFeedOpen, setIsFeedOpen] = useState(false);

  // Feed and activity hooks
  const { data: feedData } = useFeed(usuario);
  const { data: atividadeData } = useProcessosComAtividade(usuario);

  const feedItems = feedData?.items ?? [];
  const recentFeedItems = feedItems.slice(0, 10);
  const unreadFeedCount = feedData?.unread_count ?? 0;

  // Build a lookup set for processes with recent activity
  const processosAtivosMap = React.useMemo(() => {
    const map = new Map<string, ProcessoComAtividade>();
    if (atividadeData?.processos_com_atividade) {
      for (const p of atividadeData.processos_com_atividade) {
        map.set(p.numero_processo, p);
      }
    }
    return map;
  }, [atividadeData]);

  const [tags, setTags] = useState<GrupoProcesso[]>([]);
  const [expandedTags, setExpandedTags] = useState<Record<string, GrupoProcessoWithProcessos>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTagId, setLoadingTagId] = useState<string | null>(null);

  // Rename dialog state
  const [renameTagId, setRenameTagId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete confirmation state
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const result = await getMyGrupos(usuario);
      if ('error' in result) {
        toast({ title: "Erro ao carregar grupos", description: result.error, variant: "destructive" });
        setTags([]);
      } else {
        setTags(result);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = async (tagId: string) => {
    if (expandedIds.has(tagId)) {
      setExpandedIds(prev => { const next = new Set(prev); next.delete(tagId); return next; });
      return;
    }
    setExpandedIds(prev => new Set(prev).add(tagId));
    if (!expandedTags[tagId]) {
      setLoadingTagId(tagId);
      try {
        const result = await getGrupoWithProcessos(tagId, usuario);
        if (!('error' in result)) {
          setExpandedTags(prev => ({ ...prev, [tagId]: result }));
        }
      } finally {
        setLoadingTagId(null);
      }
    }
  };

  const handleRemoveProcesso = async (tagId: string, processoId: string) => {
    const result = await removeProcessoFromGrupo(tagId, processoId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao remover", description: result.error, variant: "destructive" });
      return;
    }
    setExpandedTags(prev => {
      const tag = prev[tagId];
      if (!tag) return prev;
      return {
        ...prev,
        [tagId]: { ...tag, processos: tag.processos.filter(p => p.id !== processoId) },
      };
    });
    setTags(prev => prev.map(t => t.id === tagId ? { ...t, total_processos: t.total_processos - 1 } : t));
    toast({ title: "Processo removido" });
  };

  const handleRename = async () => {
    if (!renameTagId || !renameValue.trim()) return;
    setIsRenaming(true);
    try {
      const result = await updateGrupo(renameTagId, usuario, { nome: renameValue.trim() });
      if ('error' in result) {
        toast({ title: "Erro ao renomear", description: result.error, variant: "destructive" });
        return;
      }
      setTags(prev => prev.map(t => t.id === renameTagId ? { ...t, nome: renameValue.trim() } : t));
      toast({ title: "Grupo renomeado" });
      setRenameTagId(null);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTagId) return;
    setIsDeleting(true);
    try {
      const result = await deleteGrupo(deleteTagId, usuario);
      if ('error' in result) {
        const isInUse = result.status === 409;
        toast({
          title: isInUse ? "Grupo em uso" : "Erro ao excluir",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      setTags(prev => prev.filter(t => t.id !== deleteTagId));
      setExpandedTags(prev => {
        const next = { ...prev };
        delete next[deleteTagId];
        return next;
      });
      setExpandedIds(prev => { const next = new Set(prev); next.delete(deleteTagId); return next; });
      toast({ title: "Grupo excluido" });
      setDeleteTagId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const openRenameDialog = (tag: GrupoProcesso) => {
    setRenameValue(tag.nome);
    setRenameTagId(tag.id);
  };

  return (
    <>
      {/* Movimentacoes Recentes section */}
      {recentFeedItems.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Movimentacoes Recentes
              {unreadFeedCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">
                  {unreadFeedCount}
                </Badge>
              )}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-auto py-0.5 px-1.5"
              onClick={() => setIsFeedOpen(true)}
            >
              Ver todas
            </Button>
          </div>
          <div className="space-y-0.5 rounded-md border border-gray-200 p-2">
            {recentFeedItems.map((entry) => {
              const isUnread = entry.visto_em === null;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-start gap-2 rounded px-2 py-1.5 transition-colors hover:bg-gray-50 border-l-2 cursor-pointer",
                    isUnread ? "border-l-blue-500 bg-blue-50/30" : "border-l-transparent"
                  )}
                  onClick={() => router.push(`/processo/${encodeURIComponent(entry.numero_processo)}/visualizar`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-primary">
                        {formatProcessNumber(entry.numero_processo)}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(entry.dt_atividade)}
                      </span>
                    </div>
                    {entry.descr_atividade && (
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                        {entry.descr_atividade}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TabListWrapper isLoading={isLoading} isEmpty={tags.length === 0} emptyMessage="Nenhum processo salvo ainda.">
        <div className="space-y-2">
          {tags.map((tag) => {
            const isExpanded = expandedIds.has(tag.id);
            return (
              <div key={tag.id} className="rounded-md border border-gray-200 transition-colors">
                {/* Tag header */}
                <button
                  onClick={() => toggleExpand(tag.id)}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  {tag.cor && (
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                  )}
                  <p className="font-medium text-gray-800 flex-1">{tag.nome}</p>
                  <span className="text-xs text-gray-500">{tag.total_processos} {tag.total_processos === 1 ? 'processo' : 'processos'}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <span
                        role="button"
                        tabIndex={0}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {onShareTag && (
                        <DropdownMenuItem onClick={() => onShareTag(tag.id)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Compartilhar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openRenameDialog(tag)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTagId(tag.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded processos */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-3 py-2">
                    {loadingTagId === tag.id ? (
                      <div className="flex justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : expandedTags[tag.id]?.processos.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">Nenhum processo neste grupo.</p>
                    ) : (
                      <div className="space-y-1">
                        {(expandedTags[tag.id]?.processos || []).map((p) => {
                          const atividade = processosAtivosMap.get(p.numero_processo);
                          return (
                            <div key={p.id} className="flex items-center gap-1.5">
                              {atividade ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Nova atividade em {new Date(atividade.dt_ultima_atividade).toLocaleDateString("pt-BR")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="w-2.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <ProcessoItemRow
                                  variant="compact"
                                  numeroProcesso={p.numero_processo}
                                  contexto={contextoMap[p.numero_processo]}
                                  nota={p.nota}
                                  onClick={() => router.push(`/processo/${encodeURIComponent(p.numero_processo)}/visualizar`)}
                                  actionSlot={
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                      onClick={() => handleRemoveProcesso(tag.id, p.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TabListWrapper>

      {/* Rename dialog */}
      <Dialog open={!!renameTagId} onOpenChange={(open) => { if (!open) setRenameTagId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear grupo</DialogTitle>
            <DialogDescription>Digite o novo nome para o grupo.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && renameValue.trim()) handleRename(); }}
            placeholder="Nome do grupo..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTagId(null)} disabled={isRenaming}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || isRenaming}>
              {isRenaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTagId} onOpenChange={(open) => { if (!open) setDeleteTagId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir grupo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao ira excluir o grupo, todos os processos salvos nele e seus compartilhamentos. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FeedPanel slide-over */}
      <FeedPanel
        open={isFeedOpen}
        onOpenChange={setIsFeedOpen}
        usuario={usuario}
      />
    </>
  );
}
