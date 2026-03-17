"use client";

import React, { useEffect, useMemo, useState } from 'react';
import type { Andamento } from '@/types/process-flow';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { parseCustomDateString } from '@/lib/process-flow-utils';
import { TASK_GROUPS, getGroupKeyForTask, type TaskGroup } from '@/lib/task-groups';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface ProcessFinancialTableProps {
  andamentos: Andamento[];
  horasConfig: Record<string, number>;
  processStartDate?: string;
  processEndDate?: string;
  numeroProcesso?: string;
  sessionToken?: string | null;
}

interface UserFinancialRow {
  unitId: string;
  unitSigla: string;
  unitDescricao: string;
  userId: string;
  userSigla: string;
  userName: string;
  matricula: string | null;
  groupCounts: Record<string, number>;
  totalActivities: number;
  totalHours: number;
}

interface UnitFinancialGroup {
  unitId: string;
  unitSigla: string;
  unitDescricao: string;
  users: UserFinancialRow[];
}

interface UserExternalFinancialData {
  cpf: string | null;
  mediaSalarioBruto: number | null;
}

const AUTO_CONCLUSION_TASK_TYPE = 'CONCLUSAO-AUTOMATICA-UNIDADE';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const cpfFormatter = (value: string | null): string => {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const parseDateLoose = (value?: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/')) {
    if (trimmed.includes(' ')) {
      const parsed = parseCustomDateString(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      if ([day, month, year].every((n) => Number.isFinite(n))) {
        const parsed = new Date(year, month - 1, day, 0, 0, 0);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const extractMatricula = (andamento: Andamento): string | null => {
  const attrs = andamento.Atributos || [];
  for (const attr of attrs) {
    if (!/matr/i.test(attr.Nome || '')) continue;
    const value = String(attr.Valor || '').trim();
    if (value) return value;
  }

  const siglaCandidate = String(andamento.Usuario?.Sigla || '').match(/\b\d{5,}(?:-\d)?\b/);
  if (siglaCandidate?.[0]) return siglaCandidate[0];

  const nome = String(andamento.Usuario?.Nome || '');
  const nomeCandidate = nome.match(/matr(?:[ií]cula)?\.?\s*[:\-]?\s*([a-z0-9.\-/]+)/i);
  if (nomeCandidate?.[1]) return nomeCandidate[1];

  return null;
};

const getDateHourMinuteKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const formatCurrency = (value: number): string => currencyFormatter.format(value);

const formatMonth = (month: number): string => String(month).padStart(2, '0');

const getPeriodParams = (
  andamentos: Andamento[],
  processStartDate?: string,
  processEndDate?: string
): { mesInicio: string; anoInicio: string; mesFim: string; anoFim: string } => {
  const andamentoDates = andamentos
    .map((a) => parseCustomDateString(a.DataHora || ''))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const startCandidate = parseDateLoose(processStartDate);
  const endCandidate = parseDateLoose(processEndDate);

  const startDate = startCandidate || andamentoDates[0] || new Date();
  const endDate = andamentoDates[andamentoDates.length - 1] || endCandidate || startDate;

  return {
    mesInicio: formatMonth(startDate.getMonth() + 1),
    anoInicio: String(startDate.getFullYear()),
    mesFim: formatMonth(endDate.getMonth() + 1),
    anoFim: String(endDate.getFullYear()),
  };
};

export function ProcessFinancialTable({
  andamentos,
  horasConfig,
  processStartDate,
  processEndDate,
  sessionToken,
}: ProcessFinancialTableProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [externalDataByUser, setExternalDataByUser] = useState<Record<string, UserExternalFinancialData>>({});
  const [isLoadingExternalData, setIsLoadingExternalData] = useState(false);

  const { activeGroups, unitGroups } = useMemo(() => {
    const unitMap = new Map<string, {
      unitSigla: string;
      unitDescricao: string;
      users: Map<string, UserFinancialRow>;
    }>();
    const activeGroupKeys = new Set<string>();
    const autoConclusionGroups = new Map<string, { andamento: Andamento; count: number }>();

    const processAndamento = (andamento: Andamento) => {
      const unitId = andamento.Unidade?.IdUnidade || 'unidade-desconhecida';
      const unitSigla = andamento.Unidade?.Sigla || 'Desconhecida';
      const unitDescricao = andamento.Unidade?.Descricao || '';
      const userId = andamento.Usuario?.IdUsuario || andamento.Usuario?.Sigla || 'usuario-desconhecido';
      const userSigla = andamento.Usuario?.Sigla || 'Desconhecido';
      const userName = andamento.Usuario?.Nome || 'Usuário desconhecido';
      const groupKey = getGroupKeyForTask(andamento.Tarefa || 'Tarefa desconhecida');

      activeGroupKeys.add(groupKey);

      if (!unitMap.has(unitId)) {
        unitMap.set(unitId, { unitSigla, unitDescricao, users: new Map() });
      }
      const unit = unitMap.get(unitId)!;

      const userUnitKey = `${unitId}|${userId}`;
      const estimatedHours = horasConfig[groupKey] ?? 0;

      if (!unit.users.has(userUnitKey)) {
        unit.users.set(userUnitKey, {
          unitId,
          unitSigla,
          unitDescricao,
          userId,
          userSigla,
          userName,
          matricula: extractMatricula(andamento),
          groupCounts: {},
          totalActivities: 0,
          totalHours: 0,
        });
      }

      const row = unit.users.get(userUnitKey)!;
      if (!row.matricula) {
        row.matricula = extractMatricula(andamento);
      }

      row.groupCounts[groupKey] = (row.groupCounts[groupKey] || 0) + 1;
      row.totalActivities += 1;
      row.totalHours += estimatedHours;
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

    const orderedGroups: TaskGroup[] = TASK_GROUPS.filter((group) => activeGroupKeys.has(group.key));
    if (activeGroupKeys.has('outros')) {
      orderedGroups.push({ key: 'outros', label: 'Outros', tasks: [] });
    }

    const units = Array.from(unitMap.entries())
      .map(([unitId, unit]) => ({
        unitId,
        unitSigla: unit.unitSigla,
        unitDescricao: unit.unitDescricao,
        users: Array.from(unit.users.values()).sort((a, b) => {
          if (b.totalActivities !== a.totalActivities) return b.totalActivities - a.totalActivities;
          return a.userName.localeCompare(b.userName, 'pt-BR');
        }),
      }))
      .sort((a, b) => a.unitSigla.localeCompare(b.unitSigla, 'pt-BR'));

    return { activeGroups: orderedGroups, unitGroups: units };
  }, [andamentos, horasConfig]);

  const flatUsers = useMemo(() => {
    return unitGroups.flatMap((unit) => unit.users.map((user) => ({ ...user })));
  }, [unitGroups]);

  const periodParams = useMemo(
    () => getPeriodParams(andamentos, processStartDate, processEndDate),
    [andamentos, processStartDate, processEndDate]
  );

  useEffect(() => {
    let cancelled = false;

    const loadExternalData = async () => {
      if (flatUsers.length === 0) {
        setExternalDataByUser({});
        return;
      }

      setIsLoadingExternalData(true);

      const cpfCache = new Map<string, string | null>();
      const salaryCache = new Map<string, number | null>();

      const nextEntries = await Promise.all(
        flatUsers.map(async (user) => {
          const userKey = `${user.unitId}|${user.userId}`;

          const cpfLookupKey = `${user.matricula || ''}|${user.userName}`.trim();
          let cpf: string | null = null;
          if (cpfLookupKey) {
            if (cpfCache.has(cpfLookupKey)) {
              cpf = cpfCache.get(cpfLookupKey) ?? null;
            } else {
              const params = new URLSearchParams();
              if (user.matricula) params.set('matricula', user.matricula);
              params.set('nome', user.userName);

              try {
                const headers: Record<string, string> = {};
                if (sessionToken) headers['x-sei-token'] = sessionToken;
                const response = await fetch(`${basePath}/api/cpf?${params.toString()}`, { headers });
                const payload = await response.json();
                cpf = typeof payload?.cpf === 'string' ? payload.cpf : null;
              } catch {
                cpf = null;
              }
              cpfCache.set(cpfLookupKey, cpf);
            }
          }

          const cpfDigits = cpf ? cpf.replace(/\D/g, '') : '';
          let mediaSalarioBruto: number | null = null;
          if (cpfDigits.length === 11) {
            const salaryLookupKey = `${cpfDigits}|${periodParams.mesInicio}|${periodParams.anoInicio}|${periodParams.mesFim}|${periodParams.anoFim}`;
            if (salaryCache.has(salaryLookupKey)) {
              mediaSalarioBruto = salaryCache.get(salaryLookupKey) ?? null;
            } else {
              try {
                const salaryParams = new URLSearchParams({
                  cpf: cpfDigits,
                  mes_inicio: periodParams.mesInicio,
                  mes_fim: periodParams.mesFim,
                  ano_inicio: periodParams.anoInicio,
                  ano_fim: periodParams.anoFim,
                });

                const response = await fetch(`${basePath}/api/salario-historico?${salaryParams.toString()}`);
                if (response.ok) {
                  const salaryPayload = await response.json();
                  const rawValue = salaryPayload?.resumo?.media_salario_bruto;
                  const parsedValue = Number(rawValue);
                  mediaSalarioBruto = Number.isFinite(parsedValue) ? parsedValue : null;
                }
              } catch {
                mediaSalarioBruto = null;
              }
              salaryCache.set(salaryLookupKey, mediaSalarioBruto);
            }
          }

          return [userKey, { cpf, mediaSalarioBruto }] as const;
        })
      );

      if (!cancelled) {
        setExternalDataByUser(Object.fromEntries(nextEntries));
        setIsLoadingExternalData(false);
      }
    };

    loadExternalData();
    return () => {
      cancelled = true;
    };
  }, [basePath, flatUsers, periodParams, sessionToken]);

  const calculateGroupCost = (user: UserFinancialRow, groupKey: string): number => {
    const data = externalDataByUser[`${user.unitId}|${user.userId}`];
    const mediaSalarioBruto = data?.mediaSalarioBruto ?? 0;
    if (mediaSalarioBruto <= 0) return 0;

    const totalHorasPessoa = user.totalHours;
    const totalAtividadesNoGrupo = user.groupCounts[groupKey] || 0;

    return (mediaSalarioBruto / 150) * totalHorasPessoa * totalAtividadesNoGrupo;
  };

  const calculateTotalCost = (user: UserFinancialRow): number => {
    return activeGroups.reduce((sum, group) => sum + calculateGroupCost(user, group.key), 0);
  };

  const globalTotals = useMemo(() => {
    const groupTotals: Record<string, number> = {};
    let total = 0;

    for (const unit of unitGroups) {
      for (const user of unit.users) {
        for (const group of activeGroups) {
          const value = calculateGroupCost(user, group.key);
          groupTotals[group.key] = (groupTotals[group.key] || 0) + value;
          total += value;
        }
      }
    }

    return { groupTotals, total };
  }, [activeGroups, unitGroups, externalDataByUser]);

  return (
    <TooltipProvider delayDuration={200}>
      <ScrollArea className="h-[400px] w-full">
        <div className="w-max min-w-full">
          {isLoadingExternalData && (
            <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/40 border-b">
              Atualizando CPF e salário médio bruto...
            </div>
          )}
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-400 dark:bg-slate-600">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-semibold text-slate-50 min-w-[220px]">Unidade / Usuário</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-50 min-w-[130px]">CPF</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-50 min-w-[140px]">Salário Médio</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-50 min-w-[120px]">Horas Pessoa</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-50 min-w-[140px]">Total</th>
                {activeGroups.map((group) => (
                  <th
                    key={group.key}
                    className="px-3 py-3 text-center font-semibold text-slate-50 min-w-[180px]"
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
                          {group.tasks.length > 0 ? (
                            group.tasks.map((task) => <li key={task} className="font-mono">{task}</li>)
                          ) : (
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
              {unitGroups.length === 0 && (
                <tr>
                  <td colSpan={activeGroups.length + 5} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum andamento disponível para cálculo financeiro.
                  </td>
                </tr>
              )}

              {unitGroups.map((unit) => {
                const unitGroupTotals = activeGroups.reduce<Record<string, number>>((acc, group) => {
                  acc[group.key] = unit.users.reduce((sum, user) => sum + calculateGroupCost(user, group.key), 0);
                  return acc;
                }, {});
                const unitTotal = unit.users.reduce((sum, user) => sum + calculateTotalCost(user), 0);
                const unitHours = unit.users.reduce((sum, user) => sum + user.totalHours, 0);

                return (
                  <React.Fragment key={`unit-${unit.unitId}`}>
                    <tr className="bg-muted/60 border-b">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-foreground">{unit.unitSigla}</div>
                        <div className="text-xs text-muted-foreground truncate" title={unit.unitDescricao}>
                          {unit.unitDescricao}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">-</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">-</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-foreground">
                        {unitHours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-foreground">
                        {formatCurrency(unitTotal)}
                      </td>
                      {activeGroups.map((group) => (
                        <td key={`${unit.unitId}-${group.key}`} className="px-3 py-2.5 text-center font-semibold text-foreground">
                          {formatCurrency(unitGroupTotals[group.key] || 0)}
                        </td>
                      ))}
                    </tr>

                    {unit.users.map((user, index) => {
                      const data = externalDataByUser[`${user.unitId}|${user.userId}`];
                      const salary = data?.mediaSalarioBruto ?? null;
                      const totalCost = calculateTotalCost(user);

                      return (
                        <tr
                          key={`${unit.unitId}-${user.userId}`}
                          className={`border-b last:border-b-0 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                        >
                          <td className="px-4 py-2.5 pl-8">
                            <div className="font-medium text-foreground">{user.userSigla}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 truncate" title={user.userName}>
                              {user.userName}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-medium text-foreground">
                            {cpfFormatter(data?.cpf ?? null)}
                          </td>
                          <td className="px-4 py-2.5 text-center font-medium text-foreground">
                            {salary ? formatCurrency(salary) : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center font-medium text-foreground">
                            {user.totalHours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-2.5 text-center font-semibold text-foreground">
                            {formatCurrency(totalCost)}
                          </td>
                          {activeGroups.map((group) => (
                            <td key={`${unit.unitId}-${user.userId}-${group.key}`} className="px-3 py-2.5 text-center font-medium text-foreground">
                              {formatCurrency(calculateGroupCost(user, group.key))}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {unitGroups.length > 0 && (
                <tr className="bg-slate-100 dark:bg-slate-800 border-t-2">
                  <td className="px-4 py-3 font-bold text-foreground">Total Geral</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">-</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">-</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">-</td>
                  <td className="px-4 py-3 text-center font-bold text-foreground">
                    {formatCurrency(globalTotals.total)}
                  </td>
                  {activeGroups.map((group) => (
                    <td key={`global-${group.key}`} className="px-3 py-3 text-center font-bold text-foreground">
                      {formatCurrency(globalTotals.groupTotals[group.key] || 0)}
                    </td>
                  ))}
                </tr>
              )}

            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </TooltipProvider>
  );
}
