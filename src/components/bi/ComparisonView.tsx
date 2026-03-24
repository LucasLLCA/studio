"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import {
  useEstoqueProcessos,
  useProdutividadeUnidade,
} from "@/lib/react-query/queries/useBiQueries";

interface ComparisonViewProps {
  selectedUnits: string[];
}

const COLORS = ["#3b82f6", "#f59e0b", "#10b981"];

function formatHours(h: number): string {
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k`;
  return h.toFixed(1);
}

export function ComparisonView({ selectedUnits }: ComparisonViewProps) {
  const { data: estoqueData, isLoading: estoqueLoading } = useEstoqueProcessos();
  const { data: prodData, isLoading: prodLoading } = useProdutividadeUnidade();

  const comparisonRows = useMemo(() => {
    if (!estoqueData || !prodData) return [];

    return selectedUnits.map((unit) => {
      const estoqueUnit = estoqueData.unidades.find((u) => u.unidade === unit);
      const prodUnit = prodData.items.find((u) => u.unidade === unit);

      return {
        unidade: unit,
        processos_abertos: estoqueUnit?.processos_abertos ?? 0,
        tempo_medio_dias: estoqueUnit?.tempo_medio_dias ?? 0,
        horas_total: prodUnit?.horas_total ?? 0,
        cnt_criacao: prodUnit?.cnt_criacao ?? 0,
        cnt_tramitacao: prodUnit?.cnt_tramitacao ?? 0,
      };
    });
  }, [selectedUnits, estoqueData, prodData]);

  const chartData = useMemo(() => {
    const metrics = [
      { metric: "Processos Abertos", key: "processos_abertos" as const },
      { metric: "Horas Total", key: "horas_total" as const },
      { metric: "Criacao", key: "cnt_criacao" as const },
      { metric: "Tramitacao", key: "cnt_tramitacao" as const },
    ];

    return metrics.map((m) => {
      const entry: Record<string, string | number> = { metric: m.metric };
      selectedUnits.forEach((unit) => {
        const row = comparisonRows.find((r) => r.unidade === unit);
        entry[unit] = row ? row[m.key] : 0;
      });
      return entry;
    });
  }, [selectedUnits, comparisonRows]);

  if (estoqueLoading || prodLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comparison table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-semibold text-xs">Metrica</th>
                {selectedUnits.map((unit, idx) => (
                  <th
                    key={unit}
                    className="px-3 py-2 text-right font-semibold text-xs"
                    style={{ color: COLORS[idx] }}
                  >
                    {unit.length > 20 ? unit.slice(0, 19) + "..." : unit}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-1.5 text-xs font-medium">Processos Abertos</td>
                {comparisonRows.map((r) => (
                  <td key={r.unidade} className="px-3 py-1.5 text-right text-xs">
                    {r.processos_abertos.toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="px-3 py-1.5 text-xs font-medium">Tempo Medio (dias)</td>
                {comparisonRows.map((r) => (
                  <td key={r.unidade} className="px-3 py-1.5 text-right text-xs">
                    {Math.round(r.tempo_medio_dias)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="px-3 py-1.5 text-xs font-medium">Horas Total</td>
                {comparisonRows.map((r) => (
                  <td key={r.unidade} className="px-3 py-1.5 text-right text-xs">
                    {formatHours(r.horas_total)}h
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="px-3 py-1.5 text-xs font-medium">Criacao</td>
                {comparisonRows.map((r) => (
                  <td key={r.unidade} className="px-3 py-1.5 text-right text-xs">
                    {r.cnt_criacao.toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-1.5 text-xs font-medium">Tramitacao</td>
                {comparisonRows.map((r) => (
                  <td key={r.unidade} className="px-3 py-1.5 text-right text-xs">
                    {r.cnt_tramitacao.toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Grouped bar chart */}
      <div style={{ height: 200 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <XAxis dataKey="metric" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 11 }}
              formatter={(value: number) => value.toLocaleString("pt-BR")}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {selectedUnits.map((unit, idx) => (
              <Bar
                key={unit}
                dataKey={unit}
                fill={COLORS[idx]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
