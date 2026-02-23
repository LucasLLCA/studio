"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, MessageSquare, Send, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { getObservacoes, createObservacao, deleteObservacao } from '@/lib/api/observacoes-api-client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Observacao } from '@/types/teams';

interface ObservacoesSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  numeroProcesso: string;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ObservacoesSheet({
  isOpen,
  onOpenChange,
  numeroProcesso,
}: ObservacoesSheetProps) {
  const { toast } = useToast();
  const { usuario } = usePersistedAuth();
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conteudo, setConteudo] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const loadObservacoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getObservacoes(numeroProcesso);
      if (!('error' in result)) {
        setObservacoes(result);
        setTimeout(scrollToBottom, 100);
      }
    } finally {
      setIsLoading(false);
    }
  }, [numeroProcesso, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      loadObservacoes();
    }
  }, [isOpen, loadObservacoes]);

  const handleSend = async () => {
    if (!usuario || !conteudo.trim() || isSending) return;
    setIsSending(true);
    try {
      const result = await createObservacao(numeroProcesso, usuario, conteudo.trim());
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

        {/* Input box at top */}
        <div className="flex-shrink-0 border-b pb-3 dark:bg-background">
          <div className="flex gap-2 items-end">
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
