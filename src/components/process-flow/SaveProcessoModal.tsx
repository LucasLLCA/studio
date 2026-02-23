"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, ChevronRight, Share2 } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { getMyTags, createTag, saveProcessoToTag } from '@/lib/api/tags-api-client';
import { getMyTeams } from '@/lib/api/teams-api-client';
import { shareTag } from '@/lib/api/sharing-api-client';
import { formatProcessNumber } from '@/lib/utils';
import type { Tag, Team } from '@/types/teams';

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

  const [step, setStep] = useState<1 | 2>(1);
  const [tags, setTags] = useState<Tag[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 state
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Step 2 state
  const [shareOption, setShareOption] = useState<'private' | 'share'>('private');
  const [shareType, setShareType] = useState<'team' | 'user'>('team');
  const [shareTeamId, setShareTeamId] = useState('');
  const [shareUserEmail, setShareUserEmail] = useState('');

  useEffect(() => {
    if (open && usuario) {
      loadData();
    }
    if (!open) {
      // Reset state
      setStep(1);
      setSelectedTagId('');
      setNewTagName('');
      setIsCreatingTag(false);
      setShareOption('private');
      setShareType('team');
      setShareTeamId('');
      setShareUserEmail('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, usuario]);

  const loadData = async () => {
    if (!usuario) return;
    setIsLoading(true);
    try {
      const [tagsResult, teamsResult] = await Promise.all([
        getMyTags(usuario),
        getMyTeams(usuario),
      ]);
      if (!('error' in tagsResult)) setTags(tagsResult);
      if (!('error' in teamsResult)) setTeams(teamsResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!usuario || !newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const result = await createTag(usuario, newTagName.trim());
      if ('error' in result) {
        toast({ title: "Erro ao criar tag", description: result.error, variant: "destructive" });
        return;
      }
      setTags(prev => [result, ...prev]);
      setSelectedTagId(result.id);
      setNewTagName('');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSave = async () => {
    if (!usuario || !selectedTagId) return;
    setIsSaving(true);
    try {
      // 1. Save processo to tag
      const saveResult = await saveProcessoToTag(
        selectedTagId,
        usuario,
        numeroProcesso,
        numeroProcessoFormatado || formatProcessNumber(numeroProcesso),
      );
      if ('error' in saveResult) {
        toast({ title: "Erro ao salvar", description: saveResult.error, variant: "destructive" });
        return;
      }

      // 2. Share if selected
      if (shareOption === 'share') {
        const destino = shareType === 'team'
          ? { equipe_destino_id: shareTeamId }
          : { usuario_destino: shareUserEmail };

        const shareResult = await shareTag(usuario, selectedTagId, destino);
        if ('error' in shareResult) {
          toast({ title: "Processo salvo, mas erro ao compartilhar", description: shareResult.error, variant: "destructive" });
          onOpenChange(false);
          return;
        }
      }

      toast({ title: "Processo salvo com sucesso!" });
      onSaveSuccess?.();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const canProceedStep1 = !!selectedTagId;
  const canSave = shareOption === 'private' || (
    shareType === 'team' ? !!shareTeamId : !!shareUserEmail.trim()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Processo</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Selecione ou crie uma tag para salvar o processo."
              : "Deseja compartilhar este grupo?"
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <Label>Processo: <span className="font-bold">{formatProcessNumber(numeroProcesso)}</span></Label>

            {/* Tag list */}
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma tag criada ainda. Crie uma abaixo.
                </p>
              ) : (
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTagId(tag.id)}
                      className={`w-full text-left p-2 rounded-md transition-colors flex items-center justify-between ${
                        selectedTagId === tag.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {tag.cor && (
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.cor }} />
                        )}
                        <span className="text-sm font-medium">{tag.nome}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tag.total_processos}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Create new tag inline */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome da nova tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagName.trim()) handleCreateTag();
                }}
              />
              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreatingTag}
              >
                {isCreatingTag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={shareOption} onValueChange={(v) => setShareOption(v as 'private' | 'share')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private">Apenas para mim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="share" id="share" />
                <Label htmlFor="share" className="flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                </Label>
              </div>
            </RadioGroup>

            {shareOption === 'share' && (
              <div className="space-y-3 pl-6">
                <RadioGroup value={shareType} onValueChange={(v) => setShareType(v as 'team' | 'user')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="team" id="share-team" />
                    <Label htmlFor="share-team">Com equipe</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="share-user" />
                    <Label htmlFor="share-user">Com usuario</Label>
                  </div>
                </RadioGroup>

                {shareType === 'team' ? (
                  <Select value={shareTeamId} onValueChange={setShareTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Email do usuario..."
                    value={shareUserEmail}
                    onChange={(e) => setShareUserEmail(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={isSaving}>
              Voltar
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Proximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!canSave || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
