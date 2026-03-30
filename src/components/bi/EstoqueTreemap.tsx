"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Info,
  FileText,
  Building2,
  Clock,
  Brain,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEstoqueList,
  useSearchAutocomplete,
} from "@/lib/react-query/queries/useBiQueries";
import type { EstoqueUnidade, EstoqueListItem } from "@/types/bi";
import type { EstoqueFilterValues } from "@/components/bi/EstoqueFilters";
import { ProcessoDetailSheet } from "@/components/bi/ProcessoDetailSheet";
import { ComparisonView } from "@/components/bi/ComparisonView";

interface EstoqueChartProps {
  unidades: EstoqueUnidade[];
  totalProcessos: number;
  filters: EstoqueFilterValues;
}

function getColor(tempoMedioDias: number): string {
  const capped = Math.min(tempoMedioDias, 180);
  const ratio = capped / 180;

  if (ratio < 0.5) {
    const t = ratio * 2;
    const r = Math.round(34 + (234 - 34) * t);
    const g = Math.round(197 + (179 - 197) * t);
    const b = Math.round(94 + (8 - 94) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (ratio - 0.5) * 2;
    const r = Math.round(234 + (220 - 234) * t);
    const g = Math.round(179 + (38 - 179) * t);
    const b = Math.round(8 + (38 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getRowBg(dias: number): string {
  if (dias > 90) return "bg-destructive-light dark:bg-destructive-light";
  if (dias > 30) return "bg-warning-light dark:bg-warning-light";
  return "";
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground">-</span>;
  const lower = status.toLowerCase();
  const variant = lower.includes("aberto")
    ? "default"
    : lower.includes("fechado") || lower.includes("conclu")
    ? "secondary"
    : "outline";
  return (
    <Badge variant={variant} className="text-2xs px-1.5 py-0">
      {status}
    </Badge>
  );
}

function exportTableToCsv(items: EstoqueListItem[], filename: string) {
  const headers = [
    "Protocolo",
    "Unidade em Aberto",
    "Dias sem Atividade",
    "Ultimo Andamento",
    "Unidade Origem",
    "Tipo Procedimento",
    "Status",
  ];
  const rows = items.map((p) => [
    p.protocolo,
    p.unidade_aberta,
    String(p.dias_sem_atividade),
    p.ultimo_andamento
      ? new Date(p.ultimo_andamento).toLocaleDateString("pt-BR")
      : "",
    p.unidade_origem || "",
    p.tipo_procedimento || "",
    p.status || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: {
    payload: {
      name: string;
      processos_abertos: number;
      tempo_medio_dias: number;
    };
  }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">
        {d.processos_abertos} processo
        {d.processos_abertos !== 1 ? "s" : ""} aberto
        {d.processos_abertos !== 1 ? "s" : ""}
      </p>
      <p className="text-muted-foreground">
        Tempo medio sem atividade: ~{Math.round(d.tempo_medio_dias)} dias
      </p>
    </div>
  );
}

export function EstoqueTreemap({
  unidades,
  totalProcessos,
  filters,
}: EstoqueChartProps) {
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] =
    useState<EstoqueListItem | null>(null);
  const [comparedUnits, setComparedUnits] = useState<string[]>([]);

  // Autocomplete query
  const { data: autocompleteData } = useSearchAutocomplete(autocompleteQuery);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  const autocompleteTimerRef = React.useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setTablePage(1);
    }, 400);
    // Autocomplete debounce
    clearTimeout(autocompleteTimerRef.current);
    autocompleteTimerRef.current = setTimeout(() => {
      setAutocompleteQuery(value);
      if (value.length >= 2) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 300);
  };

  const handleSuggestionClick = (value: string) => {
    setSearchTerm(value);
    setDebouncedSearch(value);
    setTablePage(1);
    setShowSuggestions(false);
  };

  // Group autocomplete suggestions by type
  const groupedSuggestions = useMemo(() => {
    if (!autocompleteData?.suggestions) return {};
    const groups: Record<string, { value: string; type: string }[]> = {};
    for (const s of autocompleteData.suggestions) {
      const label = s.type === "protocolo" ? "Protocolo" : "Unidade";
      if (!groups[label]) groups[label] = [];
      groups[label].push(s);
    }
    return groups;
  }, [autocompleteData]);

  // Merge parent filters with local unidade selection
  const listFilters = useMemo(() => {
    const f = { ...filters };
    if (selectedUnidade) {
      f.unidade_aberta = selectedUnidade;
      f.orgao_aberta = undefined;
    }
    return f;
  }, [filters, selectedUnidade]);

  // Server-side paginated list
  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
  } = useEstoqueList(listFilters, tablePage, debouncedSearch || undefined);

  // Chart data -- top 30 units by count
  const chartData = useMemo(
    () =>
      unidades.slice(0, 30).map((u) => ({
        name: u.unidade,
        processos_abertos: u.processos_abertos,
        tempo_medio_dias: u.tempo_medio_dias,
      })),
    [unidades]
  );

  const chartHeight = Math.max(300, chartData.length * 28 + 40);

  const scrollToTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleBarClick = (
    data: { name: string },
    _index: number,
    e: React.MouseEvent
  ) => {
    // Shift+click for comparison mode
    if (e.shiftKey) {
      setComparedUnits((prev) => {
        if (prev.includes(data.name)) {
          return prev.filter((u) => u !== data.name);
        }
        if (prev.length >= 3) return prev;
        return [...prev, data.name];
      });
      return;
    }

    if (selectedUnidade === data.name) {
      setSelectedUnidade(null);
    } else {
      setSelectedUnidade(data.name);
    }
    setTablePage(1);
    // Auto-scroll to table after a small delay for state update
    setTimeout(scrollToTable, 100);
  };

  const goToProcesso = (protocolo: string) => {
    router.push(`/processo/${encodeURIComponent(protocolo)}/visualizar`);
  };

  const handleRowClick = (p: EstoqueListItem) => {
    setSelectedProcesso(p);
    setSheetOpen(true);
  };

  const handleExportCsv = () => {
    if (!listData?.items.length) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    exportTableToCsv(listData.items, `estoque-processos-${dateStr}.csv`);
  };

  // Summary cards data (#20)
  const summaryStats = useMemo(() => {
    const totalUnidades = unidades.length;
    const tempoMedioGeral =
      totalUnidades > 0
        ? Math.round(
            unidades.reduce((sum, u) => sum + u.tempo_medio_dias, 0) /
              totalUnidades
          )
        : 0;
    // Count processos with IA (entendimento_processo) from the currently loaded list
    // This is an approximation from the visible list data
    const processosComIA = listData?.items
      ? listData.items.filter((item) => item.entendimento_processo).length
      : 0;

    return { totalUnidades, tempoMedioGeral, processosComIA };
  }, [unidades, listData]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary cards (#20) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Processos Abertos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-bold">
                {totalProcessos.toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Total Unidades
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-bold">
                {summaryStats.totalUnidades.toLocaleString("pt-BR")}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Tempo Medio Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-bold">
                {summaryStats.tempoMedioGeral}{" "}
                <span className="text-sm font-normal text-muted-foreground">dias</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5" />
                Processos com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-bold">
                {summaryStats.processosComIA.toLocaleString("pt-BR")}
              </p>
              {listData?.items && listData.items.length > 0 && (
                <p className="text-2xs text-muted-foreground">
                  da pagina atual
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Color legend */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
          <span className="text-xs">
            Segure <kbd className="px-1 py-0.5 bg-muted rounded text-2xs font-mono">Shift</kbd> + clique para comparar unidades
          </span>
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <span className="text-xs">Tempo medio:</span>
            <div
              className="h-3 w-24 rounded-sm"
              style={{
                background:
                  "linear-gradient(to right, rgb(34,197,94), rgb(234,179,8), rgb(220,38,38))",
              }}
            />
            <span className="text-xs">0 -- 180+ dias</span>
          </div>
        </div>

        {/* Horizontal bar chart */}
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
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
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
                        : comparedUnits.includes(payload.value)
                        ? "#3b82f6"
                        : "hsl(var(--muted-foreground))"
                    }
                    fontSize={11}
                    fontWeight={
                      selectedUnidade === payload.value ||
                      comparedUnits.includes(payload.value)
                        ? 600
                        : 400
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {payload.value.length > 16
                      ? payload.value.slice(0, 15) + "..."
                      : payload.value}
                  </text>
                )}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              />
              <Bar
                dataKey="processos_abertos"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data, index, e) =>
                  handleBarClick(data, index, e as unknown as React.MouseEvent)
                }
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={getColor(entry.tempo_medio_dias)}
                    opacity={
                      selectedUnidade && selectedUnidade !== entry.name
                        ? 0.3
                        : 1
                    }
                    stroke={
                      comparedUnits.includes(entry.name)
                        ? "#3b82f6"
                        : undefined
                    }
                    strokeWidth={comparedUnits.includes(entry.name) ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {unidades.length > 30 && (
          <p className="text-xs text-muted-foreground">
            Mostrando as 30 unidades com mais processos. Use a tabela abaixo
            para ver todas.
          </p>
        )}

        {/* Comparison panel (#16) */}
        {comparedUnits.length >= 2 && (
          <div className="border rounded-lg p-4 bg-blue-50/30 dark:bg-blue-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Comparacao de Unidades
                <span className="text-xs font-normal text-muted-foreground">
                  ({comparedUnits.length} selecionadas)
                </span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setComparedUnits([])}
              >
                <X className="h-3 w-3" />
                Limpar comparacao
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {comparedUnits.map((unit, idx) => (
                <Badge
                  key={unit}
                  variant="secondary"
                  className="cursor-pointer gap-1 text-xs"
                  style={{
                    borderColor: ["#3b82f6", "#f59e0b", "#10b981"][idx],
                    borderWidth: 1,
                  }}
                  onClick={() =>
                    setComparedUnits((prev) =>
                      prev.filter((u) => u !== unit)
                    )
                  }
                >
                  {unit}
                  <span className="text-muted-foreground ml-0.5">x</span>
                </Badge>
              ))}
            </div>
            <ComparisonView selectedUnits={comparedUnits} />
          </div>
        )}

        {/* Process table */}
        <div className="space-y-3" ref={tableRef}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <h3 className="font-semibold text-sm">Processos</h3>
            {selectedUnidade && (
              <Badge
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => {
                  setSelectedUnidade(null);
                  setTablePage(1);
                }}
              >
                {selectedUnidade}
                <span className="text-muted-foreground ml-0.5">x</span>
              </Badge>
            )}
            <div
              className="relative w-full sm:w-64 sm:ml-auto"
              ref={searchContainerRef}
            >
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar protocolo ou unidade..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                  if (searchTerm.length >= 2) setShowSuggestions(true);
                }}
                className="pl-8 h-8 text-xs"
              />
              {/* Autocomplete dropdown (#11) */}
              {showSuggestions &&
                autocompleteData?.suggestions &&
                autocompleteData.suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-card shadow-lg max-h-60 overflow-y-auto">
                    {Object.entries(groupedSuggestions).map(
                      ([groupLabel, items]) => (
                        <div key={groupLabel}>
                          <div className="px-3 py-1.5 text-2xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40">
                            {groupLabel}
                          </div>
                          {items.map((item) => (
                            <button
                              key={`${item.type}-${item.value}`}
                              className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors cursor-pointer"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSuggestionClick(item.value);
                              }}
                            >
                              {item.value}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 shrink-0"
              onClick={handleExportCsv}
              disabled={!listData?.items.length}
              title="Exportar CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <span className="text-xs text-muted-foreground shrink-0">
              {listData
                ? `${listData.total.toLocaleString("pt-BR")} resultado${
                    listData.total !== 1 ? "s" : ""
                  }`
                : ""}
            </span>
            {listFetching && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Mobile-responsive table (#21) */}
          <div className="overflow-x-auto -mx-2 px-2">
           <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm md:min-w-[640px]">
              <thead className="bg-muted/60">
                <tr className="border-b">
                  <th className="px-3 py-2.5 text-left font-semibold">
                    Protocolo
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold">
                    Unidade em Aberto
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold hidden md:table-cell">
                    Unidade Origem
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold hidden md:table-cell">
                    Tipo
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Dias s/ Ativ.
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Ult. Andamento
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold w-16">
                    {/* actions */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                    </td>
                  </tr>
                ) : !listData?.items.length ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      Nenhum processo encontrado.
                    </td>
                  </tr>
                ) : (
                  listData.items.map((p, idx) => (
                    <tr
                      key={`${p.protocolo}-${p.unidade_aberta}-${idx}`}
                      className={`border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors ${getRowBg(
                        p.dias_sem_atividade
                      )}`}
                      onClick={() => handleRowClick(p)}
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.protocolo}
                      </td>
                      <td className="px-3 py-2 text-xs">{p.unidade_aberta}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[140px] hidden md:table-cell">
                        {p.unidade_origem || "-"}
                      </td>
                      <td className="px-3 py-2 text-xs truncate max-w-[120px] hidden md:table-cell">
                        {p.tipo_procedimento || "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Badge
                          variant={
                            p.dias_sem_atividade > 90
                              ? "destructive"
                              : p.dias_sem_atividade > 30
                              ? "default"
                              : "secondary"
                          }
                        >
                          {p.dias_sem_atividade}d
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                        {p.ultimo_andamento
                          ? new Date(p.ultimo_andamento).toLocaleDateString(
                              "pt-BR"
                            )
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {p.entendimento_processo && (
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Info className="h-3.5 w-3.5 text-blue-500" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                className="max-w-xs text-xs"
                              >
                                {p.entendimento_processo.length > 200
                                  ? p.entendimento_processo.slice(0, 200) +
                                    "..."
                                  : p.entendimento_processo}
                              </TooltipContent>
                            </UITooltip>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToProcesso(p.protocolo);
                            }}
                            title="Visualizar processo"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
           </div>
          </div>

          {/* Pagination */}
          {listData && listData.total_pages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Pagina {listData.page} de {listData.total_pages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={listData.page <= 1}
                  onClick={() => setTablePage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={listData.page >= listData.total_pages}
                  onClick={() => setTablePage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Sheet */}
        <ProcessoDetailSheet
          processo={selectedProcesso}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </TooltipProvider>
  );
}
