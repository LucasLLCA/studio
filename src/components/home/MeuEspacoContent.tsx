"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, MoreHorizontal, Share2, Pencil, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabListWrapper } from './TabListWrapper';
import { ProcessoItemRow } from './ProcessoItemRow';
import { Input } from '@/components/ui/input';
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
import { getMyTags, getTagWithProcessos, removeProcessoFromTag, deleteTag, updateTag } from '@/lib/api/tags-api-client';
import type { Tag, TagWithProcessos } from '@/types/teams';

interface MeuEspacoContentProps {
  usuario: string;
  onShareTag?: (tagId: string) => void;
  contextoMap?: Record<string, string>;
}

export function MeuEspacoContent({ usuario, onShareTag, contextoMap = {} }: MeuEspacoContentProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [tags, setTags] = useState<Tag[]>([]);
  const [expandedTags, setExpandedTags] = useState<Record<string, TagWithProcessos>>({});
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
      const result = await getMyTags(usuario);
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
        const result = await getTagWithProcessos(tagId, usuario);
        if (!('error' in result)) {
          setExpandedTags(prev => ({ ...prev, [tagId]: result }));
        }
      } finally {
        setLoadingTagId(null);
      }
    }
  };

  const handleRemoveProcesso = async (tagId: string, processoId: string) => {
    const result = await removeProcessoFromTag(tagId, processoId, usuario);
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
      const result = await updateTag(renameTagId, usuario, { nome: renameValue.trim() });
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
      const result = await deleteTag(deleteTagId, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
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

  const openRenameDialog = (tag: Tag) => {
    setRenameValue(tag.nome);
    setRenameTagId(tag.id);
  };

  return (
    <>
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
                        {(expandedTags[tag.id]?.processos || []).map((p) => (
                          <ProcessoItemRow
                            key={p.id}
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
                        ))}
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
    </>
  );
}
