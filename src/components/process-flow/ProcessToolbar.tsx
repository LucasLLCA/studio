"use client";

import React, { useState } from 'react';
import type { ProcessoData, UnidadeAberta } from '@/types/process-flow';
import { Loader2, ExternalLink, PanelRight, Bookmark, BookmarkCheck, Bell, RefreshCw, MessageSquare, GitBranch, Menu } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Button } from '@/components/ui/button';
import { formatProcessNumber } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SaveProcessoModal } from './SaveProcessoModal';
import { ObservacoesSheet } from './ObservacoesSheet';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

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
  dataCarga?: string | null;
  hasLinkedFluxo?: boolean;
  onVincularFluxo?: () => void;
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
  dataCarga,
  hasLinkedFluxo,
  onVincularFluxo,
}: ProcessToolbarProps) {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isObservacoesOpen, setIsObservacoesOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const formattedNumber = formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso);

  return (
    <div className="mb-8 space-y-3">
      {/* Status line — stacks vertically on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
        {openUnitsInProcess !== null && (
          <StatusIndicator status={openUnitsInProcess.length === 0 ? 'completed' : 'in-progress'} className="gap-2" />
        )}
        {hasBackgroundLoading && (
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
        )}
        {!hasBackgroundLoading && (dataCarga ? (
          <span>
            Atualizado em {new Date(dataCarga).toLocaleString('pt-BR')}
          </span>
        ) : lastFetchedAt ? (
          <span>
            Atualizado {formatDistanceToNowStrict(lastFetchedAt, { addSuffix: true, locale: ptBR })}
          </span>
        ) : null)}
      </div>

      <hr className="border-border/50" />

      {/* Número + link — number on separate line on mobile */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          <span className="block sm:inline">Processo,</span>{' '}
          <span className="font-bold block sm:inline">{formattedNumber}</span>
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

      {/* ── DESKTOP buttons ── */}
      <div className="hidden lg:flex flex-wrap items-center justify-start gap-2">
        {!isDetailsSheetOpen && (
          <Button variant="outline" size="sm" onClick={onOpenDetailsSheet}>
            <PanelRight className="mr-2 h-4 w-4" /> Detalhes
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing || hasBackgroundLoading}
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
        {!hasLinkedFluxo && onVincularFluxo && (
          <Button variant="outline" size="sm" onClick={onVincularFluxo}>
            <GitBranch className="mr-2 h-4 w-4" /> Vincular a Fluxo
          </Button>
        )}
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

      {/* ── MOBILE buttons: Detalhes, Observacoes, Mais ── */}
      <div className="flex lg:hidden items-center justify-start gap-2">
        {!isDetailsSheetOpen && (
          <Button variant="outline" size="sm" onClick={onOpenDetailsSheet}>
            <PanelRight className="mr-2 h-4 w-4" /> Detalhes
          </Button>
        )}
        <Button
          variant={isObservacoesOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setIsObservacoesOpen(!isObservacoesOpen)}
        >
          <MessageSquare className="mr-2 h-4 w-4" /> Observacoes
        </Button>

        <Drawer open={isMobileMoreOpen} onOpenChange={setIsMobileMoreOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Mais opções">
              <Menu className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="rounded-t-3xl">
            <div className="mx-auto w-full max-w-md">
              <DrawerHeader className="text-center pb-2">
                <DrawerTitle className="text-lg font-semibold">Opções</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-4 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Atualizar */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Dados</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl h-12"
                    onClick={() => { onRefresh(); setIsMobileMoreOpen(false); }}
                    disabled={isRefreshing || hasBackgroundLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>

                {/* Salvar / Vincular */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Ações</p>
                  <Button
                    variant={initialIsSaved ? "default" : "outline"}
                    className="w-full justify-start rounded-xl h-12"
                    onClick={() => { setIsSaveModalOpen(true); setIsMobileMoreOpen(false); }}
                  >
                    {initialIsSaved ? (
                      <><BookmarkCheck className="mr-2 h-4 w-4" /> Salvo</>
                    ) : (
                      <><Bookmark className="mr-2 h-4 w-4" /> Salvar</>
                    )}
                  </Button>
                  {!hasLinkedFluxo && onVincularFluxo && (
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl h-12"
                      onClick={() => { onVincularFluxo(); setIsMobileMoreOpen(false); }}
                    >
                      <GitBranch className="mr-2 h-4 w-4" /> Vincular a Fluxo
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-xl h-12"
                    disabled
                  >
                    <Bell className="mr-2 h-4 w-4" /> Notificacoes diarias
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full rounded-xl h-11">
                    Fechar
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <SaveProcessoModal
        open={isSaveModalOpen}
        onOpenChange={setIsSaveModalOpen}
        numeroProcesso={numeroProcesso}
        numeroProcessoFormatado={formattedNumber}
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
