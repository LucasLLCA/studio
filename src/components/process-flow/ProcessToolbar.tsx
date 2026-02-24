"use client";

import React, { useState } from 'react';
import type { ProcessoData, UnidadeAberta } from '@/types/process-flow';
import { Loader2, ExternalLink, PanelRight, Bookmark, BookmarkCheck, Bell, RefreshCw, MessageSquare, AlertTriangle } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Button } from '@/components/ui/button';
import { formatProcessNumber } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SaveProcessoModal } from './SaveProcessoModal';
import { ObservacoesSheet } from './ObservacoesSheet';

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
  initialIsSaved: boolean;
  onSavedStatusChange: (saved: boolean) => void;
  documentsFailed?: boolean;
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
  initialIsSaved,
  onSavedStatusChange,
  documentsFailed = false,
}: ProcessToolbarProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isObservacoesOpen, setIsObservacoesOpen] = useState(false);

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
        {documentsFailed && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <span className="flex items-center gap-1 text-xs text-destructive" title="Falha ao carregar documentos do SEI">
              <AlertTriangle className="h-3.5 w-3.5" />
              Docs indisponíveis
            </span>
          </>
        )}
      </div>

      {/* Número + link */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-3xl text-foreground tracking-tight">
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

      {/* Buttons row: Detalhes, Atualizar, Salvar, Observacoes, Notificações */}
      <div className="flex flex-wrap items-center gap-2">
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
        <Button
          variant={initialIsSaved ? "default" : "outline"}
          size="sm"
          onClick={() => setIsSaveModalOpen(true)}
        >
          {initialIsSaved ? (
            <><BookmarkCheck className="mr-2 h-4 w-4" /> Salvo</>
          ) : (
            <><Bookmark className="mr-2 h-4 w-4" /> Salvar</>
          )}
        </Button>
        <Button
          variant={isObservacoesOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setIsObservacoesOpen(!isObservacoesOpen)}
        >
          <MessageSquare className="mr-2 h-4 w-4" /> Observacoes
        </Button>
        <Button variant="outline" size="sm" disabled>
          <Bell className="mr-2 h-4 w-4" /> Notificacoes diarias
        </Button>
      </div>

      <SaveProcessoModal
        open={isSaveModalOpen}
        onOpenChange={setIsSaveModalOpen}
        numeroProcesso={numeroProcesso}
        numeroProcessoFormatado={formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso)}
        onSaveSuccess={() => onSavedStatusChange(true)}
      />

      <ObservacoesSheet
        isOpen={isObservacoesOpen}
        onOpenChange={setIsObservacoesOpen}
        numeroProcesso={numeroProcesso}
      />
    </div>
  );
}
