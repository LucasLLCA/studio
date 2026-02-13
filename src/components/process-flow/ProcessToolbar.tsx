"use client";

import React from 'react';
import type { ProcessoData, UnidadeAberta } from '@/types/process-flow';
import { Loader2, ExternalLink, PanelRight, Bookmark, Bell, RefreshCw } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Button } from '@/components/ui/button';
import { formatProcessNumber } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessToolbarProps {
  rawProcessData: ProcessoData | null;
  numeroProcesso: string;
  processLinkAcesso: string | null;
  openUnitsInProcess: UnidadeAberta[] | null;
  hasBackgroundLoading: boolean;
  lastFetchedAt: Date | null;
  isRefreshing: boolean;
  isDetailsSheetOpen: boolean;
  onOpenDetailsSheet: () => void;
  onRefresh: () => void;
}

export function ProcessToolbar({
  rawProcessData,
  numeroProcesso,
  processLinkAcesso,
  openUnitsInProcess,
  hasBackgroundLoading,
  lastFetchedAt,
  isRefreshing,
  isDetailsSheetOpen,
  onOpenDetailsSheet,
  onRefresh,
}: ProcessToolbarProps) {
  return (
    <div className="mb-8 space-y-2">
      {/* Status acima do número */}
      <div className="flex items-center gap-2">
        {openUnitsInProcess !== null && (
          <StatusIndicator status={openUnitsInProcess.length === 0 ? 'completed' : 'in-progress'} />
        )}
        {hasBackgroundLoading && (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        )}
        {lastFetchedAt && !hasBackgroundLoading && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-xs text-muted-foreground">
              Atualizado {formatDistanceToNowStrict(lastFetchedAt, { addSuffix: true, locale: ptBR })}
            </span>
          </>
        )}
      </div>

      {/* Número + link */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl text-foreground tracking-tight">
          Processo, <span className='font-bold'>{formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso)}</span>
        </h1>
        {processLinkAcesso && (
          <a
            href={processLinkAcesso}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-hover"
            title="Abrir no SEI"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
      </div>

      {/* Buttons row: Detalhes, Atualizar, Salvar, Notificações */}
      <div className="flex items-center gap-2">
        {!isDetailsSheetOpen && (
          <Button variant="outline" size="sm" onClick={onOpenDetailsSheet} aria-label="Abrir painel de detalhes">
            <PanelRight className="mr-2 h-4 w-4" /> Detalhes
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing || hasBackgroundLoading}
          aria-label="Atualizar dados do processo"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Bookmark className="mr-2 h-4 w-4" /> Salvar
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Bell className="mr-2 h-4 w-4" /> Notificações diárias
        </Button>
      </div>
    </div>
  );
}
