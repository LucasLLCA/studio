"use client";

import React, { useState } from 'react';
import { Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TAG_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { updateTag, deleteTag } from '@/lib/api/tags-api-client';
import { useToast } from '@/hooks/use-toast';
import type { TeamTag } from '@/types/teams';

interface EditableTagBadgeProps {
  tag: TeamTag;
  usuario: string;
  /** Content to render after the tag name (e.g. an X button to remove) */
  suffix?: React.ReactNode;
  /** Called after a successful edit or delete so the parent can refresh */
  onUpdated?: (updated: TeamTag) => void;
  onDeleted?: (tagId: string) => void;
  /** Extra className for the Badge */
  className?: string;
  /** Badge size variant */
  size?: 'sm' | 'xs';
  /** If true, the badge is read-only (no edit popover) */
  readOnly?: boolean;
}

export function EditableTagBadge({
  tag,
  usuario,
  suffix,
  onUpdated,
  onDeleted,
  className,
  size = 'xs',
  readOnly = false,
}: EditableTagBadgeProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState(tag.nome);
  const [editColor, setEditColor] = useState(tag.cor ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setEditName(tag.nome);
      setEditColor(tag.cor ?? '');
      setConfirmDelete(false);
    }
  };

  const handleSave = async () => {
    const updates: { nome?: string; cor?: string } = {};
    if (editName.trim() && editName !== tag.nome) updates.nome = editName.trim();
    if (editColor !== (tag.cor ?? '')) updates.cor = editColor;
    if (Object.keys(updates).length === 0) { setOpen(false); return; }

    setIsSaving(true);
    try {
      const result = await updateTag(tag.id, usuario, updates);
      if ('error' in result) {
        toast({ title: "Erro ao editar tag", description: result.error, variant: "destructive" });
        return;
      }
      onUpdated?.({ ...tag, ...updates });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTag(tag.id, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao excluir tag", description: result.error, variant: "destructive" });
        return;
      }
      onDeleted?.(tag.id);
      setOpen(false);
      toast({ title: "Tag excluída" });
    } finally {
      setIsDeleting(false);
    }
  };

  const sizeClass = size === 'xs' ? 'text-2xs px-1.5 py-0' : 'text-xs';

  const badge = (
    <Badge
      variant="secondary"
      className={cn(
        sizeClass,
        'flex items-center gap-1',
        suffix ? 'pr-1' : '',
        !readOnly && 'cursor-pointer hover:opacity-80',
        className,
      )}
      style={tag.cor ? { backgroundColor: tag.cor, color: '#fff' } : undefined}
    >
      {tag.nome}
      {suffix}
    </Badge>
  );

  if (readOnly) return badge;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        {badge}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="start" onClick={(e) => e.stopPropagation()}>
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">Excluir tag &quot;{tag.nome}&quot;?</p>
            <p className="text-xs text-muted-foreground">A tag será removida de todos os processos.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Excluir
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome da tag"
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
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
                      editColor === cor ? 'border-foreground scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: cor }}
                    onClick={() => setEditColor(prev => prev === cor ? '' : cor)}
                  />
                ))}
                <button
                  type="button"
                  title="Sem cor"
                  className={cn(
                    'w-5 h-5 rounded-full border-2 bg-muted flex items-center justify-center transition-transform hover:scale-110',
                    !editColor ? 'border-foreground scale-110' : 'border-transparent',
                  )}
                  onClick={() => setEditColor('')}
                >
                  <X className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Excluir
              </Button>
              <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSave} disabled={isSaving || !editName.trim()}>
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Salvar
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
