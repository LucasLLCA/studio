"use client";

import React, { useMemo, useState } from 'react';
import type { Andamento } from '@/types/process-flow';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { parseCustomDateString } from '@/lib/process-flow-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TASK_GROUPS, getGroupKeyForTask } from '@/lib/task-groups';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
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
}: {
  andamentos: Andamento[];
  value: string;
  onChange: (value: string) => void;
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
      <SelectTrigger className="h-8 w-48 text-sm text-foreground font-medium">
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
          <ScrollArea className="h-[400px] w-full">
            <div className="w-max min-w-full">
              <table className="border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-400 dark:bg-slate-600">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold text-slate-50 min-w-[200px]">
                    Unidade / Usuário
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-50 min-w-[80px]">
                    Total
                  </th>
                  {activeGroups.map((group) => (
                    <th
                      key={group.key}
                      className="px-3 py-3 text-center font-semibold text-slate-50 min-w-[140px]"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help">
                            <span className="line-clamp-2">{group.label}</span>
                            <Info className="h-3 w-3 flex-shrink-0 opacity-70" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-semibold mb-1">{group.label}</p>
                          <ul className="text-xs space-y-0.5">
                            {group.tasks.length > 0 ? group.tasks.map(t => (
                              <li key={t} className="font-mono">{t}</li>
                            )) : (
                              <li className="italic">Tarefas não classificadas</li>
                            )}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={activeGroups.length + 2} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum andamento disponível para cálculo de produtividade.
                    </td>
                  </tr>
                )}

                {filteredGroups.map((group) => (
                  <React.Fragment key={`unit-${group.unitId}`}>
                    {/* Unit header row */}
                    <tr className="bg-muted/60 border-b">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-foreground">{group.unitSigla}</div>
                        <div className="text-xs text-muted-foreground truncate" title={group.unitDescricao}>
                          {group.unitDescricao}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="font-bold text-foreground">{formatTotal(group.groupTotals)}</span>
                      </td>
                      {activeGroups.map((ag) => (
                        <td key={`${group.unitId}-${ag.key}`} className="px-3 py-2.5 text-center">
                          <span className="font-semibold text-foreground">
                            {formatValue(group.groupTotals[ag.key] || 0, ag.key)}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* User rows within the unit */}
                    {group.users.map((row, userIndex) => (
                      <tr
                        key={`${group.unitId}-${row.userId}`}
                        className={`border-b last:border-b-0 ${
                          userIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                        }`}
                      >
                        <td className="px-4 py-2.5 pl-8">
                          <div className="font-medium text-foreground">{row.userSigla}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 truncate" title={row.userName}>
                            {row.userName}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-semibold text-foreground">{formatTotal(row.groupCounts)}</span>
                        </td>
                        {activeGroups.map((ag) => (
                          <td key={`${group.unitId}-${row.userId}-${ag.key}`} className="px-3 py-2.5 text-center">
                            <span className="font-medium text-foreground">
                              {formatValue(row.groupCounts[ag.key] || 0, ag.key)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
          </ScrollArea>
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
        className={`px-3 py-1.5 text-sm font-medium h-8 transition-colors ${
          safeValue === 'tarefas'
            ? 'bg-primary text-primary-foreground'
            : 'bg-transparent text-foreground hover:bg-muted'
        }`}
      >
        Tarefas
      </button>
      {hasHorasConfig && (
        <button
          onClick={() => onValueChange('horas')}
          className={`px-3 py-1.5 text-sm font-medium h-8 transition-colors border-l ${
            safeValue === 'horas'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-muted'
          }`}
        >
          Horas
        </button>
      )}
      {hasHorasConfig && canViewFinanceiro && (
        <button
          onClick={() => onValueChange('financeiro')}
          className={`px-3 py-1.5 text-sm font-medium h-8 transition-colors border-l ${
            safeValue === 'financeiro'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-muted'
          }`}
        >
          Financeiro
        </button>
      )}
    </div>
  );
}
