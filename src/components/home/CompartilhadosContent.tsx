"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EditableTagBadge } from '@/components/ui/editable-tag-badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getSharedWithMe } from '@/lib/api/sharing-api-client';
import type { SharedWithMeItem } from '@/types/teams';
import { TabListWrapper } from './TabListWrapper';
import { ProcessoItemRow } from './ProcessoItemRow';
import { cn } from '@/lib/utils';

interface CompartilhadosContentProps {
  usuario: string;
  contextoMap?: Record<string, string>;
}

type EquipeGroup = {
  equipeId: string;
  equipeNome: string;
  items: SharedWithMeItem[];
};

export function CompartilhadosContent({ usuario, contextoMap = {} }: CompartilhadosContentProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<SharedWithMeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEquipes, setExpandedEquipes] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());

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

  const { equipeGroups, avulsos } = useMemo(() => {
    const byEquipe = new Map<string, EquipeGroup>();
    const avulsoItems: SharedWithMeItem[] = [];

    for (const item of items) {
      if (item.equipe_destino_id && item.equipe_nome) {
        let group = byEquipe.get(item.equipe_destino_id);
        if (!group) {
          group = { equipeId: item.equipe_destino_id, equipeNome: item.equipe_nome, items: [] };
          byEquipe.set(item.equipe_destino_id, group);
        }
        group.items.push(item);
      } else {
        avulsoItems.push(item);
      }
    }

    return { equipeGroups: Array.from(byEquipe.values()), avulsos: avulsoItems };
  }, [items]);

  const toggleEquipe = (id: string) => {
    setExpandedEquipes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGrupo = (id: string) => {
    setExpandedGrupos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderGrupoItem = (item: SharedWithMeItem, showSharer?: boolean) => {
    const isExpanded = expandedGrupos.has(item.compartilhamento_id);
    return (
      <div key={item.compartilhamento_id} className="rounded-md border border-gray-200 transition-colors">
        <button
          onClick={() => toggleGrupo(item.compartilhamento_id)}
          className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {item.tag_cor && (
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.tag_cor }} />
              )}
              <p className="font-medium text-gray-800 truncate">{item.tag_nome}</p>
              <span className="text-xs text-muted-foreground shrink-0">{item.processos.length} processo(s)</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform', isExpanded && 'rotate-180')} />
          </div>
          {showSharer && (
            <p className="text-xs text-gray-500 mt-1">por {item.compartilhado_por}</p>
          )}
        </button>

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
                          <EditableTagBadge
                            key={tt.id}
                            tag={tt}
                            usuario={usuario}
                            onUpdated={() => loadShared()}
                            onDeleted={() => loadShared()}
                          />
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
  };

  return (
    <TabListWrapper isLoading={isLoading} isEmpty={items.length === 0} emptyMessage="Nenhum processo compartilhado com voce.">
      <div className="space-y-4">
        {/* Equipe groups */}
        {equipeGroups.map((group) => {
          const isEquipeExpanded = expandedEquipes.has(group.equipeId);
          return (
            <div key={group.equipeId}>
              <button
                onClick={() => toggleEquipe(group.equipeId)}
                className="flex items-center justify-between w-full px-1 py-1.5 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.equipeNome}
                  </span>
                  <Badge variant="secondary" className="text-xs">{group.items.length}</Badge>
                </div>
                {isEquipeExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>

              {isEquipeExpanded && (
                <div className="ml-2 mt-1 space-y-2">
                  {group.items.map((item) => renderGrupoItem(item, true))}
                </div>
              )}
            </div>
          );
        })}

        {/* Avulsos (user-to-user shares) */}
        {avulsos.length > 0 && (
          <div>
            <button
              onClick={() => toggleEquipe('__avulsos__')}
              className="flex items-center justify-between w-full px-1 py-1.5 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Avulsos
                </span>
                <Badge variant="secondary" className="text-xs">{avulsos.length}</Badge>
              </div>
              {expandedEquipes.has('__avulsos__')
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </button>

            {expandedEquipes.has('__avulsos__') && (
              <div className="ml-2 mt-1 space-y-2">
                {avulsos.map((item) => renderGrupoItem(item, true))}
              </div>
            )}
          </div>
        )}
      </div>
    </TabListWrapper>
  );
}
