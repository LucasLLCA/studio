"use client";

import React, { useMemo, useState } from 'react';
import type { Andamento } from '@/types/process-flow';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { parseCustomDateString } from '@/lib/process-flow-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TASK_GROUPS, getGroupKeyForTask } from '@/lib/task-groups';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ListChecks, Clock, DollarSign } from 'lucide-react';
import { ProcessFinancialTable } from './ProcessFinancialTable';

export type ProductivityTab = 'tarefas' | 'horas' | 'financeiro';

interface ProcessProductivityTableProps {
  andamentos: Andamento[];
  searchQuery?: string;
  unitFilter?: string;
  horasConfig?: Record<string, number>;
  processStartDate?: string;
  processEndDate?: string;
  numeroProcesso?: string;
  sessionToken?: string | null;
  activeTab?: ProductivityTab;
  onActiveTabChange?: (value: ProductivityTab) => void;
  hideInternalTabs?: boolean;
  canViewFinanceiro?: boolean;
}

interface UserRow {
  userId: string;
  userSigla: string;
  userName: string;
  groupCounts: Record<string, number>;
  total: number;
}

interface UnitGroup {
  unitId: string;
  unitSigla: string;
  unitDescricao: string;
  users: UserRow[];
  groupTotals: Record<string, number>;
  total: number;
}

const AUTO_CONCLUSION_TASK_TYPE = 'CONCLUSAO-AUTOMATICA-UNIDADE';

const getDateHourMinuteKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

// Exported unit filter component for the Card header
export function ProcessProductivityUnitFilter({
  andamentos,
  value,
  onChange,
  triggerClassName,
}: {
  andamentos: Andamento[];
  value: string;
  onChange: (value: string) => void;
  triggerClassName?: string;
}) {
  const units = useMemo(() => {
    const map = new Map<string, string>();
    andamentos.forEach(a => {
      const id = a.Unidade?.IdUnidade;
      const sigla = a.Unidade?.Sigla;
      if (id && sigla && !map.has(id)) map.set(id, sigla);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [andamentos]);

  return (
    <Select value={value} onValueChange={(v) => onChange(v === '__all__' ? '' : v)}>
      <SelectTrigger className={triggerClassName || "h-8 w-48 text-sm text-foreground font-medium"}>
        <SelectValue placeholder="Todas unidades" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">Todas unidades</SelectItem>
        {units.map(([id, sigla]) => (
          <SelectItem key={id} value={id}>{sigla}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProcessProductivityTable({
  andamentos,
  searchQuery = '',
  unitFilter = '',
  horasConfig,
  processStartDate,
  processEndDate,
  numeroProcesso,
  sessionToken,
  activeTab,
  onActiveTabChange,
  hideInternalTabs = false,
  canViewFinanceiro = false,
}: ProcessProductivityTableProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<ProductivityTab>('tarefas');
  const hasHorasConfig = !!horasConfig && Object.values(horasConfig).some(v => v > 0);
  const resolvedActiveTab = hasHorasConfig && canViewFinanceiro ? (activeTab ?? internalActiveTab) : 'tarefas';

  const handleTabChange = (value: string) => {
    const nextTab = value as ProductivityTab;
    if (!hasHorasConfig && nextTab !== 'tarefas') return;
    if (nextTab === 'financeiro' && !canViewFinanceiro) return;
    if (activeTab === undefined) setInternalActiveTab(nextTab);
    onActiveTabChange?.(nextTab);
  };

  const formatValue = (count: number, groupKey: string): string => {
    if (resolvedActiveTab === 'horas' && horasConfig) {
      const coef = horasConfig[groupKey] ?? 0;
      return `${(count * coef).toFixed(1)}h`;
    }
    return String(count);
  };

  const formatTotal = (groupCounts: Record<string, number>): string => {
    if (resolvedActiveTab === 'horas' && horasConfig) {
      let total = 0;
      for (const [key, count] of Object.entries(groupCounts)) {
        total += count * (horasConfig[key] ?? 0);
      }
      return `${total.toFixed(1)}h`;
    }
    const total = Object.values(groupCounts).reduce((a, b) => a + b, 0);
    return String(total);
  };
  // Determine which groups are actually present in the data
  const { activeGroups, unitGroups } = useMemo(() => {
    const unitMap = new Map<string, {
      unitSigla: string;
      unitDescricao: string;
      users: Map<string, UserRow>;
    }>();
    const autoConclusionGroups = new Map<string, { andamento: Andamento; count: number }>();
    const activeGroupKeys = new Set<string>();

    const processAndamento = (andamento: Andamento) => {
      const task = andamento.Tarefa || 'Tarefa desconhecida';
      const groupKey = getGroupKeyForTask(task);
      activeGroupKeys.add(groupKey);

      const unitId = andamento.Unidade?.IdUnidade || 'unidade-desconhecida';
      const unitSigla = andamento.Unidade?.Sigla || 'Desconhecida';
      const unitDescricao = andamento.Unidade?.Descricao || '';
      const userId = andamento.Usuario?.IdUsuario || andamento.Usuario?.Sigla || 'usuario-desconhecido';
      const userSigla = andamento.Usuario?.Sigla || 'Desconhecido';
      const userName = andamento.Usuario?.Nome || 'Usuário desconhecido';

      if (!unitMap.has(unitId)) {
        unitMap.set(unitId, { unitSigla, unitDescricao, users: new Map() });
      }
      const unit = unitMap.get(unitId)!;

      const userUnitKey = `${unitId}|${userId}`;
      if (!unit.users.has(userUnitKey)) {
        unit.users.set(userUnitKey, {
          userId,
          userSigla,
          userName,
          groupCounts: {},
          total: 0,
        });
      }
      const row = unit.users.get(userUnitKey)!;
      row.groupCounts[groupKey] = (row.groupCounts[groupKey] || 0) + 1;
      row.total += 1;
    };

    andamentos.forEach((andamento) => {
      const task = andamento.Tarefa || 'Tarefa desconhecida';
      if (task === AUTO_CONCLUSION_TASK_TYPE) {
        const userKey = andamento.Usuario?.IdUsuario || andamento.Usuario?.Sigla || 'usuario-desconhecido';
        const unitKey = andamento.Unidade?.IdUnidade || 'unidade-desconhecida';
        const parsedDate = parseCustomDateString(andamento.DataHora || '');
        const dateHourMinute = getDateHourMinuteKey(parsedDate);
        const groupKey = `${userKey}|${unitKey}|${dateHourMinute}`;

        if (!autoConclusionGroups.has(groupKey)) {
          autoConclusionGroups.set(groupKey, { andamento, count: 1 });
        } else {
          autoConclusionGroups.get(groupKey)!.count += 1;
        }
      } else {
        processAndamento(andamento);
      }
    });

    autoConclusionGroups.forEach(({ andamento }) => {
      processAndamento(andamento);
    });

    // Only include groups that have data, preserving definition order
    const active = TASK_GROUPS.filter(g => activeGroupKeys.has(g.key));
    // Add "outros" if any unknown tasks exist
    if (activeGroupKeys.has('outros')) {
      active.push({ key: 'outros', label: 'Outros', tasks: [] });
    }
    const activeGroupKeysList = active.map(g => g.key);

    const groups: UnitGroup[] = Array.from(unitMap.entries()).map(([unitId, unit]) => {
      const users = Array.from(unit.users.values()).sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.userName.localeCompare(b.userName, 'pt-BR');
      });

      const groupTotals: Record<string, number> = {};
      let total = 0;
      users.forEach(u => {
        total += u.total;
        activeGroupKeysList.forEach(gk => {
          groupTotals[gk] = (groupTotals[gk] || 0) + (u.groupCounts[gk] || 0);
        });
      });

      return {
        unitId,
        unitSigla: unit.unitSigla,
        unitDescricao: unit.unitDescricao,
        users,
        groupTotals,
        total,
      };
    }).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.unitSigla.localeCompare(b.unitSigla, 'pt-BR');
    });

    return { activeGroups: active, unitGroups: groups };
  }, [andamentos]);

  // Apply filters
  const filteredGroups = useMemo(() => {
    let groups = unitGroups;

    if (unitFilter) {
      groups = groups.filter(g => g.unitId === unitFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      groups = groups.map(g => {
        const unitMatches =
          g.unitSigla.toLowerCase().includes(q) ||
          g.unitDescricao.toLowerCase().includes(q);

        if (unitMatches) return g;

        const matchedUsers = g.users.filter(u =>
          u.userSigla.toLowerCase().includes(q) ||
          u.userName.toLowerCase().includes(q)
        );

        if (matchedUsers.length === 0) return null;

        const groupTotals: Record<string, number> = {};
        let total = 0;
        matchedUsers.forEach(u => {
          total += u.total;
          activeGroups.forEach(ag => {
            groupTotals[ag.key] = (groupTotals[ag.key] || 0) + (u.groupCounts[ag.key] || 0);
          });
        });

        return { ...g, users: matchedUsers, groupTotals, total };
      }).filter(Boolean) as UnitGroup[];
    }

    return groups;
  }, [unitGroups, unitFilter, searchQuery, activeGroups]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full border rounded-lg overflow-hidden bg-card shadow-sm">
        {!hideInternalTabs && (
          <ProcessProductivityTabs
            value={resolvedActiveTab}
            hasHorasConfig={hasHorasConfig}
            onValueChange={handleTabChange}
            canViewFinanceiro={canViewFinanceiro}
          />
        )}

        {resolvedActiveTab === 'tarefas' || resolvedActiveTab === 'horas' ? (
          <>
            {/* ── MOBILE: Card view ── */}
            <div className="lg:hidden max-h-[400px] overflow-y-auto">
              {filteredGroups.length === 0 ? (
                <p className="px-4 py-6 text-center text-muted-foreground text-sm">
                  Nenhum andamento disponível para cálculo de produtividade.
                </p>
              ) : (
                <div className="p-3 space-y-4">
                  {filteredGroups.map((group) => (
                    <div
                      key={`card-unit-${group.unitId}`}
                      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                    >
                      {/* Header da unidade */}
                      <div className="bg-muted/50 px-4 py-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground line-clamp-3 leading-5">
                            {group.unitSigla}
                          </div>
                          <div
                            className="mt-1 text-xs text-muted-foreground line-clamp-2"
                            title={group.unitDescricao}
                          >
                            {group.unitDescricao}
                          </div>
                        </div>

                        <div className="shrink-0 rounded-xl border bg-background px-3 py-2 text-center min-w-[72px]">
                          <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                            Total
                          </div>
                          <div className="text-lg font-bold leading-none text-foreground mt-1">
                            {formatTotal(group.groupTotals)}
                          </div>
                        </div>
                      </div>

                      {/* Métricas da unidade */}
                      <div className="px-4 py-4 grid grid-cols-2 gap-2 border-t bg-background/50">
                        {activeGroups.map((ag) => {
                          const val = group.groupTotals[ag.key] || 0;
                          if (val === 0) return null;

                          return (
                            <div
                              key={ag.key}
                              className="rounded-xl border bg-background px-3 py-3.5"
                            >
                              <div className="text-lg font-bold leading-none text-foreground">
                                {formatValue(val, ag.key)}
                              </div>
                              <div className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                {ag.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Usuários */}
                      <div className="border-t divide-y">
                        {group.users.map((row) => (
                          <div
                            key={`${group.unitId}-${row.userId}`}
                            className="px-4 py-3 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground break-words">
                                {row.userSigla}
                              </div>
                              <div
                                className="mt-1 text-xs text-muted-foreground break-words"
                                title={row.userName}
                              >
                                {row.userName}
                              </div>
                            </div>

                            <div className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-center min-w-[64px]">
                              <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                                Total
                              </div>
                              <div className="text-base font-bold leading-none text-foreground mt-1">
                                {formatTotal(row.groupCounts)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── DESKTOP: TABLE VIEW ── */}
            <ScrollArea className="h-[420px] w-full hidden lg:block">
            <div className="min-w-max">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-20 bg-background">
                  <tr className="border-b bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 dark:bg-muted/95 dark:supports-[backdrop-filter]:bg-muted/80">
                    <th className="px-4 py-3 text-left font-semibold text-foreground min-w-[280px] border-b">
                      Unidade / Usuário
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-foreground min-w-[100px] border-b">
                      Total
                    </th>

                    {activeGroups.map((group) => (
                      <th
                        key={group.key}
                        className="px-3 py-3 text-center font-semibold text-foreground min-w-[160px] border-b"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center gap-1 cursor-help">
                              <span className="line-clamp-2 text-center">{group.label}</span>
                              <Info className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                            </span>
                          </TooltipTrigger>

                          <TooltipContent side="bottom" className="max-w-xs">
                            <p className="font-semibold mb-1">{group.label}</p>
                            <ul className="text-xs space-y-0.5">
                              {group.tasks.length > 0 ? (
                                group.tasks.map((task) => (
                                  <li key={task}>• {task}</li>
                                ))
                              ) : (
                                <li>Sem tarefas mapeadas</li>
                              )}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2 + activeGroups.length}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Nenhum andamento disponível para cálculo de produtividade.
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <React.Fragment key={group.unitId}>
                        {/* Linha da unidade */}
                        <tr className="bg-muted/30 dark:bg-muted/30">
                          <td className="px-4 py-4 border-b align-top">
                            <div className="min-w-0">
                              <div className="font-semibold text-[15px] text-foreground">
                                {group.unitSigla}
                              </div>
                              <div
                                className="text-sm text-muted-foreground truncate"
                                title={group.unitDescricao}
                              >
                                {group.unitDescricao}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 border-b text-center align-middle">
                            <span className="inline-flex min-w-[56px] justify-center rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-foreground">
                              {formatTotal(group.groupTotals)}
                            </span>
                          </td>

                          {activeGroups.map((ag) => (
                            <td
                              key={`${group.unitId}-${ag.key}`}
                              className="px-3 py-4 border-b text-center align-middle"
                            >
                              <span className="text-base font-bold text-foreground tabular-nums">
                                {formatValue(group.groupTotals[ag.key] || 0, ag.key)}
                              </span>
                            </td>
                          ))}
                        </tr>

                        {/* Linhas dos usuários */}
                        {group.users.map((row, index) => (
                          <tr
                            key={`${group.unitId}-${row.userId}`}
                            className={[
                              "transition-colors hover:bg-muted/30 dark:hover:bg-muted/30",
                              index % 2 === 0 ? "bg-background" : "bg-muted/20 dark:bg-muted/20",
                            ].join(" ")}
                          >
                            <td className="px-4 py-3 border-b">
                              <div className="pl-4 min-w-0">
                                <div className="font-medium text-foreground">
                                  {row.userSigla}
                                </div>
                                <div
                                  className="text-xs text-muted-foreground truncate"
                                  title={row.userName}
                                >
                                  {row.userName}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 border-b text-center">
                              <span className="font-semibold text-foreground tabular-nums">
                                {formatTotal(row.groupCounts)}
                              </span>
                            </td>

                            {activeGroups.map((ag) => (
                              <td
                                key={`${group.unitId}-${row.userId}-${ag.key}`}
                                className="px-3 py-3 border-b text-center"
                              >
                                <span className="text-sm text-foreground tabular-nums">
                                  {formatValue(row.groupCounts[ag.key] || 0, ag.key)}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
          </>
        ) : (
          <div className="overflow-hidden p-0 px-6 pb-6 pt-4">
            {/* Financeiro tab content */}
            {andamentos && horasConfig && (
              <ProcessFinancialTable
                andamentos={andamentos}
                horasConfig={horasConfig}
                processStartDate={processStartDate}
                processEndDate={processEndDate}
                numeroProcesso={numeroProcesso}
                sessionToken={sessionToken}
              />
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export function ProcessProductivityTabs({
  value,
  onValueChange,
  hasHorasConfig = false,
  canViewFinanceiro = false,
}: {
  value: ProductivityTab;
  onValueChange: (value: string) => void;
  hasHorasConfig?: boolean;
  canViewFinanceiro?: boolean;
}) {
  const safeValue = hasHorasConfig ? value : 'tarefas';

  return (
    <div className="flex items-center border rounded-md overflow-hidden">
      <button
        onClick={() => onValueChange('tarefas')}
        className={`px-3 py-1.5 text-sm font-medium h-8 transition-colors flex items-center gap-1 ${
          safeValue === 'tarefas'
            ? 'bg-primary text-primary-foreground'
            : 'bg-transparent text-foreground hover:bg-muted'
        }`}
      >
        <ListChecks className="h-4 w-4" />
        <span className="hidden xl:inline">Tarefas</span>
      </button>
      {hasHorasConfig && (
        <button
          onClick={() => onValueChange('horas')}
          className={`px-3 py-1.5 text-sm font-medium h-8 transition-colors border-l flex items-center gap-1 ${
            safeValue === 'horas'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-muted'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span className="hidden xl:inline">Horas</span>
        </button>
      )}
      {hasHorasConfig && canViewFinanceiro && (
        <button
          onClick={() => onValueChange('financeiro')}
          className={`px-3 py-1.5 text-sm font-medium h-8 transition-colors border-l flex items-center gap-1 ${
            safeValue === 'financeiro'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-muted'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span className="hidden xl:inline">Financeiro</span>
        </button>
      )}
    </div>
  );
}
