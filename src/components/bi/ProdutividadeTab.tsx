"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, Activity, Clock, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useProdutividadeUnidade,
  useProdutividadeUsuario,
  useProdutividadeUnidadeMensal,
} from "@/lib/react-query/queries/useBiQueries";
import type { ProdutividadeUnidade } from "@/types/bi";

const PLACEHOLDER_ALL = "__all__";

function formatHours(h: number): string {
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k`;
  return h.toFixed(1);
}

function ProdTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; horas_total: number; total_andamentos: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">
        {formatHours(d.horas_total)} horas totais
      </p>
      <p className="text-muted-foreground">
        {d.total_andamentos.toLocaleString("pt-BR")} andamentos
      </p>
    </div>
  );
}

export function ProdutividadeTab() {
  const [orgaoFilter, setOrgaoFilter] = useState<string | undefined>(undefined);
  const [selectedUnidade, setSelectedUnidade] = useState<string | undefined>(
    undefined
  );

  const {
    data: prodData,
    isLoading: prodLoading,
    error: prodError,
  } = useProdutividadeUnidade(orgaoFilter);

  const {
    data: usuarioData,
    isLoading: usuarioLoading,
  } = useProdutividadeUsuario(undefined, selectedUnidade);

  // Monthly trend data (#17)
  const {
    data: mensalData,
    isLoading: mensalLoading,
  } = useProdutividadeUnidadeMensal(undefined, selectedUnidade);

  // Unique orgaos for filter
  const orgaos = useMemo(() => {
    if (!prodData?.items) return [];
    const set = new Set(prodData.items.map((i) => i.orgao));
    return Array.from(set).sort();
  }, [prodData]);

  // Summary cards
  const summary = useMemo(() => {
    if (!prodData?.items)
      return { totalUnidades: 0, totalAndamentos: 0, totalHoras: 0 };
    const items = prodData.items;
    return {
      totalUnidades: items.length,
      totalAndamentos: items.reduce((s, i) => s + i.total_andamentos, 0),
      totalHoras: items.reduce((s, i) => s + i.horas_total, 0),
    };
  }, [prodData]);

  // Chart data - top 20 by horas_total
  const chartData = useMemo(() => {
    if (!prodData?.items) return [];
    return [...prodData.items]
      .sort((a, b) => b.horas_total - a.horas_total)
      .slice(0, 20)
      .map((u) => ({
        name: u.unidade,
        horas_total: u.horas_total,
        total_andamentos: u.total_andamentos,
      }));
  }, [prodData]);

  const chartHeight = Math.max(300, chartData.length * 28 + 40);

  // Color based on horas
  const maxHoras = useMemo(
    () => Math.max(...chartData.map((d) => d.horas_total), 1),
    [chartData]
  );

  const handleBarClick = (data: { name: string }) => {
    if (selectedUnidade === data.name) {
      setSelectedUnidade(undefined);
    } else {
      setSelectedUnidade(data.name);
    }
  };

  // Table data
  const tableItems = useMemo(() => {
    if (!prodData?.items) return [];
    return [...prodData.items].sort((a, b) => b.horas_total - a.horas_total);
  }, [prodData]);

  // Monthly trend chart data (#17) - last 12 months sorted
  const trendData = useMemo(() => {
    if (!mensalData?.items) return [];
    return [...mensalData.items]
      .sort((a, b) => a.ano_mes.localeCompare(b.ano_mes))
      .slice(-12)
      .map((item) => ({
        ano_mes: item.ano_mes,
        horas_total: item.horas_total,
        total_andamentos: item.total_andamentos,
      }));
  }, [mensalData]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Filtrar por Orgao</label>
          <Select
            value={orgaoFilter || PLACEHOLDER_ALL}
            onValueChange={(v) => {
              setOrgaoFilter(v === PLACEHOLDER_ALL ? undefined : v);
              setSelectedUnidade(undefined);
            }}
          >
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Todos os orgaos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PLACEHOLDER_ALL}>Todos os orgaos</SelectItem>
              {orgaos.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedUnidade && (
          <Badge
            variant="secondary"
            className="cursor-pointer gap-1 mt-4"
            onClick={() => setSelectedUnidade(undefined)}
          >
            {selectedUnidade}
            <span className="text-muted-foreground ml-0.5">
              <X className="h-3 w-3" />
            </span>
          </Badge>
        )}
      </div>

      {prodLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : prodError ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <p className="text-sm">
            Erro ao carregar dados de produtividade. Verifique se a computacao
            ja foi executada.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Unidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {summary.totalUnidades.toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total de Atividades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {summary.totalAndamentos.toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Total de Horas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatHours(summary.totalHoras)}h
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Horizontal bar chart - top 20 */}
          {chartData.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                Top 20 Unidades por Horas Totais
              </h3>
              <div style={{ height: chartHeight }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                  >
                    <XAxis
                      type="number"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatHours(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={({ x, y, payload }) => (
                        <text
                          x={x}
                          y={y}
                          dy={4}
                          textAnchor="end"
                          fill={
                            selectedUnidade === payload.value
                              ? "hsl(var(--primary))"
                              : "hsl(var(--muted-foreground))"
                          }
                          fontSize={11}
                          fontWeight={
                            selectedUnidade === payload.value ? 600 : 400
                          }
                          style={{ cursor: "pointer" }}
                        >
                          {payload.value.length > 18
                            ? payload.value.slice(0, 17) + "..."
                            : payload.value}
                        </text>
                      )}
                    />
                    <Tooltip
                      content={<ProdTooltip />}
                      cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    />
                    <Bar
                      dataKey="horas_total"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(data) => handleBarClick(data)}
                    >
                      {chartData.map((entry, idx) => {
                        const ratio = entry.horas_total / maxHoras;
                        const r = Math.round(59 + (37 * ratio));
                        const g = Math.round(130 + (99 * (1 - ratio)));
                        const b = Math.round(246 - (100 * ratio));
                        return (
                          <Cell
                            key={idx}
                            fill={`rgb(${r}, ${g}, ${b})`}
                            opacity={
                              selectedUnidade &&
                              selectedUnidade !== entry.name
                                ? 0.3
                                : 1
                            }
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monthly trend line chart (#17) */}
          {selectedUnidade && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tendencia Mensal - {selectedUnidade}
              </h3>
              {mensalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Nenhum dado mensal disponivel para esta unidade.
                </p>
              ) : (
                <div style={{ height: 300 }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--muted))"
                      />
                      <XAxis
                        dataKey="ano_mes"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatHours(v)}
                        label={{
                          value: "Horas",
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        label={{
                          value: "Andamentos",
                          angle: 90,
                          position: "insideRight",
                          style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--card))",
                        }}
                        formatter={(value: number, name: string) => [
                          name === "horas_total"
                            ? `${formatHours(value)}h`
                            : value.toLocaleString("pt-BR"),
                          name === "horas_total"
                            ? "Horas Total"
                            : "Total Andamentos",
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(value: string) =>
                          value === "horas_total"
                            ? "Horas Total"
                            : "Total Andamentos"
                        }
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="horas_total"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#3b82f6" }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="total_andamentos"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#f59e0b" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* User breakdown when a unit is selected */}
          {selectedUnidade && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Usuarios - {selectedUnidade}
              </h3>
              {usuarioLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !usuarioData?.items.length ? (
                <p className="text-sm text-muted-foreground py-4">
                  Nenhum dado de usuario encontrado para esta unidade.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr className="border-b">
                        <th className="px-3 py-2.5 text-left font-semibold">
                          Usuario
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Processos
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Andamentos
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Horas
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Criacao
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Tramitacao
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold">
                          Assinatura
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarioData.items.map((u, idx) => (
                        <tr
                          key={`${u.usuario}-${idx}`}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-3 py-2 text-xs font-medium">
                            {u.usuario}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {u.total_processos.toLocaleString("pt-BR")}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {u.total_andamentos.toLocaleString("pt-BR")}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium">
                            {formatHours(u.horas_total)}h
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {u.cnt_criacao}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {u.cnt_tramitacao}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {u.cnt_assinatura}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Full unit table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Todas as Unidades</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Unidade
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Orgao
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Processos
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Andamentos
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Horas Total
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Criacao
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Tramitacao
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        Nenhum dado disponivel.
                      </td>
                    </tr>
                  ) : (
                    tableItems.map((item, idx) => (
                      <tr
                        key={`${item.unidade}-${idx}`}
                        className={`border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors ${
                          selectedUnidade === item.unidade ? "bg-primary/5" : ""
                        }`}
                        onClick={() =>
                          setSelectedUnidade(
                            selectedUnidade === item.unidade
                              ? undefined
                              : item.unidade
                          )
                        }
                      >
                        <td className="px-3 py-2 text-xs font-medium">
                          {item.unidade}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {item.orgao}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {item.total_processos.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {item.total_andamentos.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium">
                          {formatHours(item.horas_total)}h
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {item.cnt_criacao.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {item.cnt_tramitacao.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
