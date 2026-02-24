"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSharedWithMe } from '@/lib/api/sharing-api-client';
import type { SharedWithMeItem } from '@/types/teams';
import { TabListWrapper } from './TabListWrapper';
import { ProcessoItemRow } from './ProcessoItemRow';

interface CompartilhadosContentProps {
  usuario: string;
  contextoMap?: Record<string, string>;
}

export function CompartilhadosContent({ usuario, contextoMap = {} }: CompartilhadosContentProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<SharedWithMeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadShared();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const loadShared = async () => {
    setIsLoading(true);
    try {
      const result = await getSharedWithMe(usuario);
      if ('error' in result) {
        toast({ title: "Erro ao carregar compartilhados", description: result.error, variant: "destructive" });
        setItems([]);
      } else {
        setItems(result);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <TabListWrapper isLoading={isLoading} isEmpty={items.length === 0} emptyMessage="Nenhum processo compartilhado com voce.">
      <div className="space-y-2">
        {items.map((item) => {
          const isExpanded = expandedIds.has(item.compartilhamento_id);
          return (
            <div key={item.compartilhamento_id} className="rounded-md border border-gray-200 transition-colors">
              {/* Tag header */}
              <button
                onClick={() => toggleExpand(item.compartilhamento_id)}
                className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.tag_cor && (
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.tag_cor }} />
                    )}
                    <p className="font-medium text-gray-800 truncate">{item.tag_nome}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {item.compartilhado_por}
                  <br />
                  {item.equipe_nome}
                </p>
              </button>

              {/* Expanded processos */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-3 py-2">
                  {item.processos.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">Nenhum processo neste grupo.</p>
                  ) : (
                    <div className="space-y-1">
                      {item.processos.map((p) => (
                        <div key={p.id}>
                          <ProcessoItemRow
                            variant="compact"
                            numeroProcesso={p.numero_processo}
                            contexto={contextoMap[p.numero_processo]}
                            nota={p.nota}
                            onClick={() => router.push(`/processo/${encodeURIComponent(p.numero_processo)}/visualizar`)}
                          />
                          {p.team_tags && p.team_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-2 mt-0.5 mb-1">
                              {p.team_tags.map((tt) => (
                                <Badge
                                  key={tt.id}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                  style={tt.cor ? { backgroundColor: tt.cor, color: '#fff' } : undefined}
                                >
                                  {tt.nome}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TabListWrapper>
  );
}
