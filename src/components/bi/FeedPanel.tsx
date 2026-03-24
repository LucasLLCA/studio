"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFeed } from "@/lib/react-query/queries/useBiQueries";
import { markFeedRead } from "@/lib/api/bi-api-client";
import { formatProcessNumber, cn } from "@/lib/utils";
import { queryKeys } from "@/lib/react-query/keys";
import type { FeedEntry } from "@/types/bi";

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

interface FeedPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: string;
}

export function FeedPanel({ open, onOpenChange, usuario }: FeedPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useFeed(usuario);
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = data?.items ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const invalidateBadge = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bi.feedBadge(usuario) });
    queryClient.invalidateQueries({ queryKey: queryKeys.bi.feed(usuario) });
  }, [queryClient, usuario]);

  // Auto-mark as read after 3 seconds when panel is open
  useEffect(() => {
    if (open && unreadCount > 0) {
      markReadTimerRef.current = setTimeout(async () => {
        const result = await markFeedRead(usuario);
        if (!("error" in result)) {
          invalidateBadge();
        }
      }, 3000);
    }

    return () => {
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current);
        markReadTimerRef.current = null;
      }
    };
  }, [open, unreadCount, usuario, invalidateBadge]);

  const handleMarkAllRead = async () => {
    const result = await markFeedRead(usuario);
    if (!("error" in result)) {
      invalidateBadge();
    }
  };

  const handleProcessClick = (numero: string) => {
    router.push(`/processo/${encodeURIComponent(numero)}/visualizar`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[440px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Movimentacoes
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">
            Feed de movimentacoes dos processos salvos
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-2">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma movimentacao recente nos seus processos salvos.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((entry) => (
                  <FeedEntryItem
                    key={entry.id}
                    entry={entry}
                    onProcessClick={handleProcessClick}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function FeedEntryItem({
  entry,
  onProcessClick,
}: {
  entry: FeedEntry;
  onProcessClick: (numero: string) => void;
}) {
  const isUnread = entry.visto_em === null;

  return (
    <div
      className={cn(
        "relative rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50 border-l-2",
        isUnread ? "border-l-blue-500 bg-blue-50/30" : "border-l-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onProcessClick(entry.numero_processo)}
          className="font-mono text-sm font-medium text-primary hover:underline text-left"
        >
          {formatProcessNumber(entry.numero_processo)}
        </button>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {formatRelativeTime(entry.dt_atividade)}
        </span>
      </div>

      {entry.tag_nome && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
          {entry.tag_nome}
        </Badge>
      )}

      {entry.descr_atividade && (
        <p className="text-xs text-foreground/80 mt-1 line-clamp-2">
          {entry.descr_atividade}
        </p>
      )}

      {(entry.unidade_atividade || entry.usuario_atividade) && (
        <p className="text-[11px] text-muted-foreground mt-1">
          {[entry.unidade_atividade, entry.usuario_atividade]
            .filter(Boolean)
            .join(" - ")}
        </p>
      )}

      {entry.qnt_novos_andamentos > 1 && (
        <p className="text-[11px] text-muted-foreground mt-0.5">
          +{entry.qnt_novos_andamentos} andamentos
        </p>
      )}
    </div>
  );
}
