"use client";

import type { HistoryItem } from '@/lib/history-api-client';
import { TabListWrapper } from './TabListWrapper';
import { ProcessoItemRow } from './ProcessoItemRow';

interface HistoricoContentProps {
  history: HistoryItem[];
  isLoading: boolean;
  contextoMap: Record<string, string>;
  onItemClick: (item: HistoryItem) => void;
}

export function HistoricoContent({ history, isLoading, contextoMap, onItemClick }: HistoricoContentProps) {
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
          />
        ))}
      </div>
    </TabListWrapper>
  );
}
