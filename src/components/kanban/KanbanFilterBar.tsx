"use client";

import React from 'react';
import { Search, X as XIcon, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface KanbanFilterBarProps {
  filterNumero: string;
  onFilterNumeroChange: (value: string) => void;
  colunas: Array<{ tag_id: string; tag_nome: string; tag_cor?: string | null }>;
  filterTagIds: Set<string>;
  onToggleTag: (tagId: string) => void;
  // Optional team tags (equipes only)
  teamTags?: Array<{ id: string; nome: string; cor?: string | null }>;
  filterTeamTagIds?: Set<string>;
  onToggleTeamTag?: (tagId: string) => void;
  tagFilterMode?: 'and' | 'or';
  onToggleFilterMode?: () => void;
  // Clear
  onClearFilters: () => void;
  isFilterActive: boolean;
}

/**
 * Shared filter bar content used for both desktop (inline) and mobile (drawer) contexts.
 *
 * Desktop: rendered with compact sizing (h-8 inputs, horizontal scroll, inline layout).
 * Mobile: rendered with larger touch targets (h-10 inputs, flex-wrap, stacked layout).
 */

/* ------------------------------------------------------------------ */
/* Desktop variant — inline bar with horizontal scroll                 */
/* ------------------------------------------------------------------ */
export function KanbanFilterBar(props: KanbanFilterBarProps) {
  const {
    filterNumero,
    onFilterNumeroChange,
    colunas,
    filterTagIds,
    onToggleTag,
    teamTags,
    filterTeamTagIds,
    onToggleTeamTag,
    tagFilterMode,
    onToggleFilterMode,
    onClearFilters,
    isFilterActive,
  } = props;

  return (
    <div className="hidden md:block flex-shrink-0 border-b px-4 sm:px-6 py-2 space-y-2 bg-muted/20">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Número Processo..."
            value={filterNumero}
            onChange={(e) => onFilterNumeroChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {filterNumero && (
            <button
              onClick={() => onFilterNumeroChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {isFilterActive && (
          <button
            onClick={onClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <Separator />

      {/* Grupos — horizontal scroll */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground font-medium">Grupos</span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Clique em um grupo para filtrar os processos.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex items-center gap-1.5 pb-1">
            {colunas.map(coluna => (
              <button
                key={coluna.tag_id}
                onClick={() => onToggleTag(coluna.tag_id)}
                className={cn(
                  'text-xs px-2.5 py-0.5 rounded-full border transition-colors shrink-0',
                  filterTagIds.has(coluna.tag_id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                )}
              >
                {coluna.tag_nome}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Team tags — horizontal scroll (equipes only) */}
      {teamTags && teamTags.length > 0 && filterTeamTagIds && onToggleTeamTag && (
        <>
          <Separator />
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground font-medium">Tags</span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    Filtra processos que possuem esta tag.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {filterTeamTagIds.size > 1 && onToggleFilterMode && tagFilterMode && (
              <button
                onClick={onToggleFilterMode}
                className={cn(
                  'text-2xs font-bold px-2 py-0.5 rounded border transition-colors shrink-0',
                  tagFilterMode === 'and'
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-amber-100 text-amber-700 border-amber-300',
                )}
                title={tagFilterMode === 'and' ? 'E — todas as tags' : 'OU — qualquer tag'}
              >
                {tagFilterMode === 'and' ? 'E' : 'OU'}
              </button>
            )}
            <ScrollArea className="flex-1">
              <div className="flex items-center gap-1.5 pb-1">
                {teamTags.map(tag => {
                  const active = filterTeamTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onToggleTeamTag(tag.id)}
                      className={cn(
                        'text-xs px-2.5 py-0.5 rounded-full border transition-all shrink-0',
                        active ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100',
                      )}
                      style={
                        tag.cor
                          ? {
                              backgroundColor: active ? tag.cor : 'transparent',
                              color: active ? '#fff' : tag.cor,
                              borderColor: tag.cor,
                            }
                          : undefined
                      }
                      title={`Filtrar por tag "${tag.nome}"`}
                    >
                      {tag.nome}
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile variant — stacked layout for use inside a Drawer             */
/* ------------------------------------------------------------------ */
export function KanbanFilterBarMobile(props: KanbanFilterBarProps) {
  const {
    filterNumero,
    onFilterNumeroChange,
    colunas,
    filterTagIds,
    onToggleTag,
    teamTags,
    filterTeamTagIds,
    onToggleTeamTag,
    tagFilterMode,
    onToggleFilterMode,
  } = props;

  return (
    <div className="px-4 pb-4 space-y-4 max-h-[75vh] overflow-y-auto">
      {/* Search */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-primary">Buscar</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Número Processo..."
            value={filterNumero}
            onChange={(e) => onFilterNumeroChange(e.target.value)}
            className="pl-8 h-10 rounded-xl"
          />
        </div>
      </div>

      <Separator />

      {/* Grupos */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-primary">Grupos</p>
        <div className="flex flex-wrap gap-1.5">
          {colunas.map(coluna => (
            <button
              key={coluna.tag_id}
              onClick={() => onToggleTag(coluna.tag_id)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                filterTagIds.has(coluna.tag_id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border',
              )}
            >
              {coluna.tag_nome}
            </button>
          ))}
        </div>
      </div>

      {/* Team tags (equipes only) */}
      {teamTags && teamTags.length > 0 && filterTeamTagIds && onToggleTeamTag && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-primary">Tags</p>
              {filterTeamTagIds.size > 1 && onToggleFilterMode && tagFilterMode && (
                <button
                  onClick={onToggleFilterMode}
                  className={cn(
                    'text-2xs font-bold px-2 py-0.5 rounded border transition-colors',
                    tagFilterMode === 'and'
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-amber-100 text-amber-700 border-amber-300',
                  )}
                >
                  {tagFilterMode === 'and' ? 'E' : 'OU'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {teamTags.map(tag => {
                const active = filterTeamTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => onToggleTeamTag(tag.id)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-all',
                      active ? 'opacity-100' : 'opacity-70',
                    )}
                    style={
                      tag.cor
                        ? {
                            backgroundColor: active ? tag.cor : 'transparent',
                            color: active ? '#fff' : tag.cor,
                            borderColor: tag.cor,
                          }
                        : undefined
                    }
                  >
                    {tag.nome}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
