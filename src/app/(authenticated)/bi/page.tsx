"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, Loader2, RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query/keys";
import { useEstoqueProcessos, useEstoqueUnidades } from "@/lib/react-query/queries/useBiQueries";
import {
  refreshEstoque,
  refreshProdutividade,
  refreshProcessosUnicos,
} from "@/lib/api/bi-api-client";
import { EstoqueTreemap } from "@/components/bi/EstoqueTreemap";
import { EstoqueFilters, type EstoqueFilterValues } from "@/components/bi/EstoqueFilters";
import { ProdutividadeTab } from "@/components/bi/ProdutividadeTab";
import { TaskHistoryPanel } from "@/components/bi/TaskHistoryPanel";

function isStaleData(computedAt: string | null | undefined): boolean {
  if (!computedAt) return false;
  const diff = Date.now() - new Date(computedAt).getTime();
  return diff > 24 * 60 * 60 * 1000; // 24 hours
}

export default function BiPage() {
  const [filters, setFilters] = useState<EstoqueFilterValues>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: estoqueData,
    isLoading: estoqueLoading,
    error: estoqueError,
  } = useEstoqueProcessos(filters);

  const { data: unidadesOptions, isLoading: unidadesLoading } = useEstoqueUnidades();

  const staleWarning = useMemo(
    () => isStaleData(estoqueData?.computed_at),
    [estoqueData?.computed_at]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Trigger all computations in parallel
    const [estoqueResult, prodResult, procResult] = await Promise.all([
      refreshEstoque(),
      refreshProdutividade(),
      refreshProcessosUnicos(),
    ]);

    const errors: string[] = [];
    if ("error" in estoqueResult) errors.push(`Estoque: ${estoqueResult.error}`);
    if ("error" in prodResult) errors.push(`Produtividade: ${prodResult.error}`);
    if ("error" in procResult) errors.push(`Processos Unicos: ${procResult.error}`);

    if (errors.length > 0) {
      toast({
        title: "Erro ao solicitar atualizacao",
        description: errors.join("; "),
        variant: "destructive",
      });
    } else {
      toast({
        title: "Atualizacao solicitada",
        description:
          "Todas as tarefas foram iniciadas. Os dados serao atualizados em alguns minutos.",
      });
      // Refetch after a delay to pick up new data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.bi.all });
      }, 10_000);
    }
    setIsRefreshing(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Business Intelligence
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar Dados
        </Button>
      </div>

      {/* Stale data warning */}
      {staleWarning && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Os dados foram computados ha mais de 24 horas (
            {estoqueData?.computed_at
              ? new Date(estoqueData.computed_at).toLocaleString("pt-BR")
              : ""}
            ). Clique em &quot;Atualizar Dados&quot; para recomputar.
          </span>
        </div>
      )}

      <Tabs defaultValue="estoque" className="w-full">
        <TabsList className="mb-4 overflow-x-auto">
          <TabsTrigger value="estoque">Estoque de Processos</TabsTrigger>
          <TabsTrigger value="produtividade">Produtividade</TabsTrigger>
        </TabsList>

        <TabsContent value="estoque">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Estoque de Processos por Unidade</CardTitle>
              <CardDescription>
                Visao geral dos processos abertos em cada unidade, com tempo medio sem atividade.
                {estoqueData?.computed_at && (
                  <span className="ml-2 text-xs">
                    Ultima atualizacao:{" "}
                    {new Date(estoqueData.computed_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EstoqueFilters
                filters={filters}
                onChange={setFilters}
                unidadesOptions={unidadesOptions}
                isLoading={unidadesLoading}
              />

              {estoqueLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : estoqueError ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <AlertCircle className="h-10 w-10" />
                  <p className="text-sm">
                    Erro ao carregar dados. Verifique se o servico D-1 esta disponivel e se a
                    computacao do estoque ja foi executada.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Solicitar Computacao
                  </Button>
                </div>
              ) : estoqueData && estoqueData.unidades.length > 0 ? (
                <EstoqueTreemap
                  unidades={estoqueData.unidades}
                  totalProcessos={estoqueData.total_processos_abertos}
                  filters={filters}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <BarChart3 className="h-10 w-10" />
                  <p className="text-sm">
                    Nenhum dado de estoque disponivel. Clique em &quot;Atualizar Dados&quot; para
                    executar a primeira computacao.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtividade">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Produtividade por Unidade</CardTitle>
              <CardDescription>
                Analise de atividades e horas de trabalho por unidade e usuario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProdutividadeTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task History Panel (#18) */}
      <TaskHistoryPanel />
    </div>
  );
}
