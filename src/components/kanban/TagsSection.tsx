"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Trash2,
  X,
  Tag,
  Plus,
  Check,
  Info,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  getTags,
  getProcessoTags,
  createTag,
  updateTag,
  deleteTag,
  tagProcesso,
  untagProcessoPorNumero,
} from '@/lib/api/tags-api-client';
import { TAG_COLORS } from '@/lib/constants';
import { EditableTagBadge } from '@/components/ui/editable-tag-badge';
import type { TeamTag } from '@/types/teams';

interface TagsSectionProps {
  processoNumero: string;
  equipeId: string;
  usuario: string | null;
  initialTags: TeamTag[];
  onTagsChanged: () => void;
}

export function TagsSection({
  processoNumero,
  equipeId,
  usuario,
  initialTags,
  onTagsChanged,
}: TagsSectionProps) {
  const { toast } = useToast();

  const [processoTags, setProcessoTags] = useState<TeamTag[]>(initialTags);
  const [teamTagsList, setTeamTagsList] = useState<TeamTag[]>([]);
  const [tagFilter, setTagFilter] = useState('');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isLoadingTeamTags, setIsLoadingTeamTags] = useState(false);
  const [newTagColor, setNewTagColor] = useState<string>('');
  const [editingTag, setEditingTag] = useState<TeamTag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  const loadTeamTags = useCallback(async () => {
    if (!usuario) return;
    setIsLoadingTeamTags(true);
    try {
      const result = await getTags(usuario, equipeId);
      setTeamTagsList('error' in result ? [] : result);
    } finally {
      setIsLoadingTeamTags(false);
    }
  }, [equipeId, usuario]);

  const loadTags = useCallback(async () => {
    if (!usuario) return;
    const result = await getProcessoTags(processoNumero, usuario, equipeId);
    if (!('error' in result)) {
      setProcessoTags(result);
    }
  }, [equipeId, processoNumero, usuario]);

  useEffect(() => {
    loadTeamTags();
    loadTags();
  }, [loadTeamTags, loadTags]);

  const handleAddTag = async (tag: TeamTag) => {
    if (!usuario) return;
    const result = await tagProcesso(tag.id, usuario, processoNumero);
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
    setProcessoTags(prev => prev.filter(t => t.id !== tag.id));
    const result = await untagProcessoPorNumero(tag.id, processoNumero, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao remover tag", description: result.error, variant: "destructive" });
      setProcessoTags(prev => [...prev, tag]);
      return;
    }
    onTagsChanged();
  };

  const handleCreateAndAddTag = async () => {
    if (!usuario || !tagFilter.trim()) return;
    setIsCreatingTag(true);
    try {
      const result = await createTag(usuario, tagFilter.trim(), newTagColor || undefined, equipeId);
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
    setProcessoTags(prev => prev.map(t => t.id === editingTag.id ? { ...t, ...updates } : t));
    setEditingTag(null);
    onTagsChanged();
  };

  const handleDeleteTag = async (tag: TeamTag) => {
    if (!usuario) return;
    const result = await deleteTag(tag.id, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir tag", description: result.error, variant: "destructive" });
      return;
    }
    setTeamTagsList(prev => prev.filter(t => t.id !== tag.id));
    setProcessoTags(prev => prev.filter(t => t.id !== tag.id));
    onTagsChanged();
    toast({ title: "Tag excluida" });
  };

  const appliedTagIds = new Set(processoTags.map(t => t.id));
  const availableTags = teamTagsList
    .filter(t => !appliedTagIds.has(t.id) && t.nome.toLowerCase().includes(tagFilter.toLowerCase()));

  return (
    <>
      <div className="flex-shrink-0 flex flex-wrap items-center gap-1.5 py-3 border-b">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        {processoTags.map((tag) => (
          <EditableTagBadge
            key={tag.id}
            tag={tag}
            usuario={usuario || ''}
            size="sm"
            onUpdated={(updated) => {
              setProcessoTags(prev => prev.map(t => t.id === updated.id ? updated : t));
              setTeamTagsList(prev => prev.map(t => t.id === updated.id ? updated : t));
              onTagsChanged();
            }}
            onDeleted={(id) => {
              setProcessoTags(prev => prev.filter(t => t.id !== id));
              setTeamTagsList(prev => prev.filter(t => t.id !== id));
              onTagsChanged();
            }}
            suffix={
              <button className="ml-0.5 hover:opacity-70" onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}>
                <X className="h-3 w-3" />
              </button>
            }
          />
        ))}
        <Popover
          open={isTagPopoverOpen}
          onOpenChange={(open) => {
            setIsTagPopoverOpen(open);
            if (!open) {
              setTagFilter('');
              setNewTagColor('');
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" /> Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="start">
            <Input
              placeholder="Filtrar ou criar tag..."
              value={tagFilter}
              onChange={(e) => { setTagFilter(e.target.value); setNewTagColor(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagFilter.trim() && availableTags.length === 0) {
                  const existing = teamTagsList.find(t => t.nome.toLowerCase() === tagFilter.trim().toLowerCase());
                  if (existing) handleAddTag(existing);
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
                    const jaAplicada = appliedTagIds.has(existingTag.id);
                    return (
                      <div className="space-y-1 pt-0.5">
                        {jaAplicada ? (
                          <div className="flex items-center gap-1.5 px-2 py-2 bg-green-50 border border-green-100 rounded text-xs text-green-700">
                            <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                            <span>
                              <span className="font-medium">&quot;{existingTag.nome}&quot;</span> ja esta aplicada a este processo.
                            </span>
                          </div>
                        ) : (
                          <>
                            <p className="text-2xs text-amber-600 px-2 py-1 bg-amber-50 rounded flex items-center gap-1">
                              <Info className="h-3 w-3 shrink-0" /> Tag ja existe — deseja aplica-la?
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
                  return (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-2xs text-muted-foreground px-1">Cor da tag (opcional):</p>
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
                <p className="text-2xs text-muted-foreground mb-1">Cor:</p>
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
    </>
  );
}
