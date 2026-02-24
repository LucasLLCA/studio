"use client";

import { MoreHorizontal, Save, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HistoryItem } from '@/lib/history-api-client';
import { TabListWrapper } from './TabListWrapper';
import { ProcessoItemRow } from './ProcessoItemRow';

interface HistoricoContentProps {
  history: HistoryItem[];
  isLoading: boolean;
  contextoMap: Record<string, string>;
  onItemClick: (item: HistoryItem) => void;
  onSave?: (item: HistoryItem) => void;
  onShare?: (item: HistoryItem) => void;
  onDelete?: (item: HistoryItem) => void;
}

export function HistoricoContent({
  history,
  isLoading,
  contextoMap,
  onItemClick,
  onSave,
  onShare,
  onDelete,
}: HistoricoContentProps) {
  const hasActions = onSave || onShare || onDelete;

  return (
    <TabListWrapper
      isLoading={isLoading}
      isEmpty={history.length === 0}
      emptyMessage="Nenhuma pesquisa encontrada no historico."
    >
      <div className="space-y-2">
        {history.map((item) => (
          <ProcessoItemRow
            key={item.id}
            numeroProcesso={item.numero_processo}
            contexto={item.caixa_contexto || contextoMap[item.numero_processo]}
            onClick={() => onItemClick(item)}
            actionSlot={hasActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onSave && (
                    <DropdownMenuItem onClick={() => onSave(item)}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuItem onClick={() => onShare(item)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined}
          />
        ))}
      </div>
    </TabListWrapper>
  );
}
