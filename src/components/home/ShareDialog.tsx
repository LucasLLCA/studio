"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Share2, X, Users, User } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getMyTeams } from '@/lib/api/teams-api-client';
import { shareTag, getMyShares, revokeShare } from '@/lib/api/sharing-api-client';
import type { Team, ShareRecord } from '@/types/teams';

interface ShareDialogProps {
  tagId: string;
  usuario: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ tagId, usuario, open, onOpenChange }: ShareDialogProps) {
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [existingShares, setExistingShares] = useState<ShareRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [shareType, setShareType] = useState<'team' | 'user'>('team');
  const [shareTeamId, setShareTeamId] = useState('');
  const [shareUserEmail, setShareUserEmail] = useState('');

  useEffect(() => {
    if (open) {
      loadData();
      setShareType('team');
      setShareTeamId('');
      setShareUserEmail('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teamsResult, sharesResult] = await Promise.all([
        getMyTeams(usuario),
        getMyShares(usuario),
      ]);
      if (!('error' in teamsResult)) setTeams(teamsResult);
      if (!('error' in sharesResult)) {
        setExistingShares(sharesResult.filter(s => s.tag_id === tagId));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const destino = shareType === 'team'
      ? { equipe_destino_id: shareTeamId }
      : { usuario_destino: shareUserEmail.trim() };

    setIsSharing(true);
    try {
      const result = await shareTag(usuario, tagId, destino);
      if ('error' in result) {
        toast({ title: "Erro ao compartilhar", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Compartilhado com sucesso!" });
      setExistingShares(prev => [...prev, result]);
      setShareTeamId('');
      setShareUserEmail('');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    setRevokingId(shareId);
    try {
      const result = await revokeShare(shareId, usuario);
      if ('error' in result) {
        toast({ title: "Erro ao revogar", description: result.error, variant: "destructive" });
        return;
      }
      setExistingShares(prev => prev.filter(s => s.id !== shareId));
      toast({ title: "Compartilhamento removido" });
    } finally {
      setRevokingId(null);
    }
  };

  const getShareLabel = (share: ShareRecord): { icon: React.ReactNode; text: string } => {
    if (share.equipe_destino_id) {
      const team = teams.find(t => t.id === share.equipe_destino_id);
      return {
        icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />,
        text: team?.nome || 'Equipe',
      };
    }
    return {
      icon: <User className="h-3.5 w-3.5 text-muted-foreground" />,
      text: share.usuario_destino || 'Usuario',
    };
  };

  const canShare = shareType === 'team' ? !!shareTeamId : !!shareUserEmail.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Compartilhar
          </DialogTitle>
          <DialogDescription>
            Compartilhe este grupo com uma equipe ou usuario.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* New share form */}
            <div>
              <RadioGroup value={shareType} onValueChange={(v) => setShareType(v as 'team' | 'user')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="st-team" />
                  <Label htmlFor="st-team">Com equipe</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="st-user" />
                  <Label htmlFor="st-user">Com usuario individual</Label>
                </div>
              </RadioGroup>

              <div className="mt-3">
                {shareType === 'team' ? (
                  <Select value={shareTeamId} onValueChange={setShareTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.length === 0 ? (
                        <SelectItem value="_none" disabled>Nenhuma equipe</SelectItem>
                      ) : (
                        teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Email do usuario..."
                    value={shareUserEmail}
                    onChange={(e) => setShareUserEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canShare) handleShare(); }}
                  />
                )}
              </div>
            </div>

            {/* Existing shares */}
            {existingShares.length > 0 && (
              <div>
                <Separator className="mb-3" />
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Compartilhado com
                </Label>
                <div className="mt-2 space-y-1.5">
                  {existingShares.map((share) => {
                    const { icon, text } = getShareLabel(share);
                    return (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {icon}
                          <span className="text-sm truncate">{text}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={() => handleRevoke(share.id)}
                          disabled={revokingId === share.id}
                          title="Remover compartilhamento"
                        >
                          {revokingId === share.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSharing}>
              Fechar
            </Button>
            <Button onClick={handleShare} disabled={!canShare || isSharing}>
              {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Compartilhar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
