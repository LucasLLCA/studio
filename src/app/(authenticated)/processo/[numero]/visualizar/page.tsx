"use client";

import { ProcessFlowDiagram } from '@/components/process-flow/ProcessFlowDiagram';
import type { ProcessedFlowData, ProcessedAndamento } from '@/types/process-flow';
import { Loader2, GanttChartSquare, BookText, Info, ChevronsLeft, ChevronsRight, HelpCircle, AlertTriangle, RefreshCw, Search, Table2 } from 'lucide-react';
import { LoadingFeedback } from '@/components/home/LoadingFeedback';
import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { processAndamentos } from '@/lib/process-flow-utils';
import { formatProcessNumber } from '@/lib/utils';
import { useOpenUnits } from '@/lib/react-query/queries/useOpenUnits';
import { useAndamentosCount } from '@/lib/react-query/queries/useAndamentosCount';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProcessFlowLegend } from '@/components/process-flow/ProcessFlowLegend';

// Extracted hooks
import { useProcessData } from '@/hooks/use-process-data';
import { useProcessCreationInfo } from '@/hooks/use-process-creation-info';
import { useOrgaoMetrics } from '@/hooks/use-orgao-metrics';

// Extracted components
import { ProcessToolbar } from '@/components/process-flow/ProcessToolbar';
import { ProcessDetailsSheet } from '@/components/process-flow/ProcessDetailsSheet';
import { OpenUnitsCard } from '@/components/process-flow/OpenUnitsCard';
import { ProcessAndamentosTable } from '@/components/process-flow/ProcessAndamentosTable';
import {
  ProcessProductivityTable,
  ProcessProductivityTabs,
  ProcessProductivityUnitFilter,
  type ProductivityTab,
} from '@/components/process-flow/ProcessProductivityTable';
import { ProcessProvider } from '@/contexts/process-context';
import { useLastViewedProcess } from '@/contexts/last-viewed-process-context';
import { useProcessoSalvo } from '@/lib/react-query/queries/useProcessoSalvo';
import { useConfiguracaoHorasPublic } from '@/lib/react-query/queries/useAdminQueries';

export default function VisualizarProcessoPage() {
  return (
    <Suspense>
      <VisualizarProcessoContent />
    </Suspense>
  );
}

function VisualizarProcessoContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const numeroProcesso = decodeURIComponent(params.numero as string);
  const { toast } = useToast();

  const noDocAccessParam = searchParams.get('noDocAccess') === '1';

  // Ensure hydration match - only render conditional content after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track last viewed process for header navigation
  const { setLastViewedProcess, clearLastViewedProcess } = useLastViewedProcess();
  useEffect(() => {
    if (numeroProcesso) setLastViewedProcess(numeroProcesso);
  }, [numeroProcesso, setLastViewedProcess]);

  const {
    isAuthenticated,
    sessionToken,
    selectedUnidadeFiltro,
    orgao: userOrgao,
    usuario,
    papelGlobal,
    logout: persistLogout,
  } = usePersistedAuth();

  // UI-level state
  const [taskToScrollTo, setTaskToScrollTo] = useState<ProcessedAndamento | null>(null);
  const [taskToSelect, setTaskToSelect] = useState<ProcessedAndamento | null>(null);
  const [isSummarizedView, setIsSummarizedView] = useState<boolean>(true);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedLaneUnits, setSelectedLaneUnits] = useState<string[]>([]);
  const [andamentosView, setAndamentosView] = useState<'timeline' | 'table'>('timeline');
  const [andamentosSearchQuery, setAndamentosSearchQuery] = useState('');
  const [prodSearchQuery, setProdSearchQuery] = useState('');
  const [prodUnitFilter, setProdUnitFilter] = useState('');
  const [prodActiveTab, setProdActiveTab] = useState<ProductivityTab>('tarefas');
  const [isClient, setIsClient] = useState(false);

  // Hour coefficient config for productivity table
  const { data: horasConfig } = useConfiguracaoHorasPublic(userOrgao);
  const hasHorasConfig = !!horasConfig && Object.values(horasConfig).some((v) => v > 0);

  // Tag/bookmark status — cached via React Query, deduped across mounts
  const { data: processoSalvoData } = useProcessoSalvo({
    usuario: usuario || '',
    numeroProcesso,
    enabled: !!usuario,
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (processoSalvoData) setIsSaved(processoSalvoData.salvo);
  }, [processoSalvoData]);

  // Lightweight count query — reused from selecionar unidade if cached
  const { data: countData } = useAndamentosCount({
    processo: numeroProcesso,
    unidade: selectedUnidadeFiltro || '',
    token: sessionToken || '',
    enabled: isAuthenticated && !!sessionToken && !!selectedUnidadeFiltro,
  });

  // Open units via React Query — skips refetch when TotalItens unchanged
  const {
    data: openUnitsData,
    isLoading: isLoadingOpenUnits,
    isError: isOpenUnitsError,
    error: openUnitsError,
    refetch: refetchOpenUnits,
  } = useOpenUnits({
    processo: numeroProcesso,
    unidadeOrigem: selectedUnidadeFiltro || '',
    token: sessionToken || '',
    enabled: isAuthenticated && !!sessionToken && !!selectedUnidadeFiltro,
    currentTotalItens: countData?.total_itens,
  });

  const openUnitsInProcess = openUnitsData?.unidades || null;
  const processLinkAcesso = openUnitsData?.linkAcesso || null;

  const unitAccessDenied = noDocAccessParam || (isOpenUnitsError && !!openUnitsError);

  // Data fetching hook
  const {
    rawProcessData,
    processSummary,
    situacaoAtual,
    isLoading,
    isRefreshing,
    lastFetchedAt,
    backgroundLoading,
    hasBackgroundLoading,
    loadingTasks,
    refresh,
    isPartialData,
    andamentosFailed,
    andamentosProgress,
  } = useProcessData({
    numeroProcesso,
    sessionToken,
    selectedUnidadeFiltro,
    isAuthenticated,
    unitAccessDenied,
    onSessionExpired: () => { persistLogout(); clearLastViewedProcess(); router.push('/'); },
    refetchOpenUnits,
  });

  // Derived state hooks
  const processCreationInfo = useProcessCreationInfo(rawProcessData);

  const processedFlowData: ProcessedFlowData | null = useMemo(() => {
    const andamentos = rawProcessData?.Andamentos;
    if (!rawProcessData || !andamentos) return null;
    const processNumber = rawProcessData.Info?.NumeroProcesso || numeroProcesso;
    return processAndamentos(andamentos, openUnitsInProcess, processNumber, isSummarizedView, isPartialData);
  }, [rawProcessData, openUnitsInProcess, numeroProcesso, isSummarizedView, isPartialData]);

  const { isExternalProcess, daysOpenInUserOrgao } = useOrgaoMetrics({
    userOrgao,
    processCreationInfo,
    openUnitsInProcess,
    processedFlowData,
    rawProcessData,
  });

  // Redirect guards
  useEffect(() => {
    if (!isAuthenticated && !sessionToken) {
      router.push('/');
    }
  }, [isAuthenticated, sessionToken, router]);

  useEffect(() => {
    if (!selectedUnidadeFiltro && isAuthenticated) {
      toast({
        title: "Selecione uma unidade",
        description: "É necessário selecionar uma unidade antes de visualizar o processo.",
        variant: "destructive"
      });
      router.push(`/processo/${encodeURIComponent(numeroProcesso)}`);
    }
  }, [selectedUnidadeFiltro, isAuthenticated, numeroProcesso, router, toast]);

  // Open sheet when data loads
  useEffect(() => {
    if (rawProcessData) {
      setIsDetailsSheetOpen(true);
    }
  }, [rawProcessData]);

  // Navigation handlers
  const handleTaskCardClick = (task: ProcessedAndamento) => setTaskToScrollTo(task);
  const handleScrollToFirstTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[0]); };
  const handleScrollToLastTask = () => { if (processedFlowData?.tasks.length) setTaskToScrollTo(processedFlowData.tasks[processedFlowData.tasks.length - 1]); };

  const handleNodeNavigate = useCallback((id: string, type: 'andamento' | 'document') => {
    if (!processedFlowData?.tasks) return;

    let targetTask: ProcessedAndamento | undefined;

    if (type === 'andamento') {
      targetTask = processedFlowData.tasks.find(t => t.IdAndamento === id);
    } else {
      // Document: find andamento whose Descricao contains the document number
      targetTask = processedFlowData.tasks.find(t => t.Descricao.includes(id));
    }

    if (targetTask) {
      setTaskToScrollTo(targetTask);
      setTaskToSelect(targetTask);
    }
  }, [processedFlowData]);

  const availableLaneUnits = useMemo(() => {
    if (!processedFlowData?.laneMap) return [];
    return Array.from(processedFlowData.laneMap.keys()).sort();
  }, [processedFlowData]);

  // Augment loading tasks with open units
  const allLoadingTasks = useMemo(() => {
    const tasks = [...loadingTasks];
    if (isLoadingOpenUnits) tasks.splice(1, 0, "Verificando unidades abertas");
    return tasks;
  }, [loadingTasks, isLoadingOpenUnits]);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto px-8 py-4 w-full">
        {/* Loading feedback when no data */}
        {isClient && hasBackgroundLoading && !rawProcessData && (
          <LoadingFeedback
            title="Carregando dados..."
            loadingTasks={allLoadingTasks}
          />
        )}

        {/* Error card when andamentos failed */}
        {andamentosFailed && !rawProcessData && !hasBackgroundLoading && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold">Falha ao carregar o processo</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Não foi possível buscar os andamentos do processo {formatProcessNumber(numeroProcesso)}.
                  Verifique sua conexão ou tente novamente.
                </p>
              </div>
              <Button onClick={refresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        {(rawProcessData || processCreationInfo) && (
          <ProcessToolbar
            rawProcessData={rawProcessData}
            numeroProcesso={numeroProcesso}
            processLinkAcesso={processLinkAcesso}
            openUnitsInProcess={openUnitsInProcess}
            hasBackgroundLoading={hasBackgroundLoading}
            lastFetchedAt={lastFetchedAt}
            isRefreshing={isRefreshing}
            isDetailsSheetOpen={isDetailsSheetOpen}
            onOpenDetailsSheet={() => setIsDetailsSheetOpen(true)}
            onRefresh={refresh}
            initialIsSaved={isSaved}
            onSavedStatusChange={setIsSaved}
          />
        )}

        {/* Details sheet */}
        <ProcessDetailsSheet
          isOpen={isDetailsSheetOpen}
          onOpenChange={setIsDetailsSheetOpen}
          rawProcessData={rawProcessData}
          numeroProcesso={numeroProcesso}
          processCreationInfo={processCreationInfo}
          openUnitsInProcess={openUnitsInProcess}
          processSummary={processSummary}
          situacaoAtual={situacaoAtual}
          backgroundLoading={backgroundLoading}
          unitAccessDenied={unitAccessDenied}
          userOrgao={userOrgao}
          isExternalProcess={isExternalProcess}
          daysOpenInUserOrgao={daysOpenInUserOrgao}
          onNodeNavigate={handleNodeNavigate}
        />

        {rawProcessData && (
          <ProcessProvider value={{
            sessionToken,
            isAuthenticated,
            selectedUnidadeFiltro,
            processNumber: numeroProcesso || rawProcessData?.Info?.NumeroProcesso || '',
            openUnitsInProcess,
            refresh,
          }}>
            <div className="flex flex-col gap-6">
              {/* Open Units */}
              <OpenUnitsCard
                openUnitsInProcess={openUnitsInProcess}
                isLoadingOpenUnits={isLoadingOpenUnits}
                unitAccessDenied={unitAccessDenied}
                processedFlowData={processedFlowData}
                onTaskCardClick={handleTaskCardClick}
                isPartialData={isPartialData}
              />

              {/* Andamentos (Timeline or Table) */}
              <Card className="flex flex-col" data-diagram-card>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GanttChartSquare className="h-5 w-5" /> Andamentos
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* View toggle */}
                      <div className="flex items-center border rounded-md overflow-hidden">
                        <Button
                          variant={andamentosView === 'timeline' ? 'default' : 'ghost'}
                          size="sm"
                          className="rounded-none h-8"
                          onClick={() => setAndamentosView('timeline')}
                        >
                          <GanttChartSquare className="mr-1 h-4 w-4" />
                          <span className="hidden sm:inline">Linha do Tempo</span>
                        </Button>
                        <Button
                          variant={andamentosView === 'table' ? 'default' : 'ghost'}
                          size="sm"
                          className="rounded-none h-8"
                          onClick={() => setAndamentosView('table')}
                        >
                          <Table2 className="mr-1 h-4 w-4" />
                          <span className="hidden sm:inline">Tabela</span>
                        </Button>
                      </div>

                      {andamentosView === 'timeline' && (
                        <>
                          <Separator orientation="vertical" className="h-5" />
                          <div className="flex items-center space-x-2">
                            <Switch id="summarize-graph" checked={isSummarizedView} onCheckedChange={setIsSummarizedView} disabled={!rawProcessData || isLoading} />
                            <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">Resumido</Label>
                          </div>
                          {isPartialData && rawProcessData?.Info && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>
                                {andamentosProgress?.loaded ?? rawProcessData.Andamentos?.length ?? 0} de {andamentosProgress?.total ?? rawProcessData.Info.TotalItens} andamentos carregados
                              </span>
                            </div>
                          )}
                          <Separator orientation="vertical" className="h-5" />
                          <Button onClick={handleScrollToFirstTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length}>
                            <ChevronsLeft className="mr-1 h-4 w-4" /> Inicio
                          </Button>
                          <Button onClick={handleScrollToLastTask} variant="outline" size="sm" disabled={!processedFlowData?.tasks.length}>
                            <ChevronsRight className="mr-1 h-4 w-4" /> Fim
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" disabled={!processedFlowData?.tasks.length}>
                                <GanttChartSquare className="mr-1 h-4 w-4" />
                                Filtrar Unidades
                                {selectedLaneUnits.length > 0 && (
                                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                                    {selectedLaneUnits.length}
                                  </span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Filtrar Raias por Unidade</h4>
                                  <p className="text-xs text-muted-foreground">
                                    Selecione as unidades para reorganizá-las no topo
                                  </p>
                                </div>
                                <div className="flex justify-between items-center">
                                  <Button variant="outline" size="sm" onClick={() => setSelectedLaneUnits(availableLaneUnits)}>
                                    Todas
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setSelectedLaneUnits([])}>
                                    Limpar
                                  </Button>
                                </div>
                                <ScrollArea className="h-[300px]">
                                  <div className="space-y-2">
                                    {availableLaneUnits.map((unit) => (
                                      <div key={unit} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`unit-${unit}`}
                                          checked={selectedLaneUnits.includes(unit)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedLaneUnits([...selectedLaneUnits, unit]);
                                            } else {
                                              setSelectedLaneUnits(selectedLaneUnits.filter(u => u !== unit));
                                            }
                                          }}
                                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                        />
                                        <Label htmlFor={`unit-${unit}`} className="text-sm cursor-pointer flex-1">
                                          {unit}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Dialog open={isLegendModalOpen} onOpenChange={setIsLegendModalOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <HelpCircle className="mr-1 h-4 w-4" /> Legenda
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="sr-only">Legenda do Fluxo</DialogTitle>
                              </DialogHeader>
                              <ProcessFlowLegend />
                            </DialogContent>
                          </Dialog>
                        </>
                      )}

                      {andamentosView === 'table' && (
                        <>
                          <Separator orientation="vertical" className="h-5" />
                          <div className="relative w-72">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Buscar unidade, usuário ou descrição..."
                              value={andamentosSearchQuery}
                              onChange={(e) => setAndamentosSearchQuery(e.target.value)}
                              className="h-8 pl-8 text-sm text-foreground font-medium"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="overflow-hidden p-0 px-6 pb-6 pt-4">
                  {andamentosView === 'timeline' ? (
                    processedFlowData && processedFlowData.tasks.length > 0 ? (
                      <div className="h-[600px] flex flex-col w-full">
                        <ProcessFlowDiagram
                          tasks={processedFlowData.tasks}
                          connections={processedFlowData.connections}
                          svgWidth={processedFlowData.svgWidth}
                          svgHeight={processedFlowData.svgHeight}
                          laneMap={processedFlowData.laneMap}
                          taskToScrollTo={taskToScrollTo}
                          taskToSelect={taskToSelect}
                          filteredLaneUnits={selectedLaneUnits}
                          isPartialData={isPartialData}
                        />
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir ou dados inválidos.</p>
                    )
                  ) : (
                    processedFlowData && processedFlowData.tasks.length > 0 ? (
                      <ProcessAndamentosTable
                        andamentos={processedFlowData.tasks}
                        searchQuery={andamentosSearchQuery}
                        openUnitsInProcess={openUnitsInProcess}
                      />
                    ) : (
                      <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir ou dados inválidos.</p>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Productivity Table */}
              {rawProcessData?.Andamentos?.length > 0 && (
                <Card className="flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <GanttChartSquare className="h-5 w-5" /> Tabela Produtividade
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <ProcessProductivityTabs
                          value={prodActiveTab}
                          onValueChange={(value) => setProdActiveTab(value as ProductivityTab)}
                          hasHorasConfig={hasHorasConfig}
                          canViewFinanceiro={papelGlobal === 'admin' || papelGlobal === 'beta'}
                        />
                        <>
                          <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Buscar unidade ou usuário..."
                              value={prodSearchQuery}
                              onChange={(e) => setProdSearchQuery(e.target.value)}
                              className="h-8 pl-8 text-sm text-foreground font-medium"
                            />
                          </div>
                          <ProcessProductivityUnitFilter
                            andamentos={rawProcessData.Andamentos}
                            value={prodUnitFilter}
                            onChange={setProdUnitFilter}
                          />
                        </>
                      </div>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="overflow-hidden p-0 px-6 pb-6 pt-4">
                    <ProcessProductivityTable
                      andamentos={rawProcessData.Andamentos}
                      searchQuery={prodSearchQuery}
                      unitFilter={prodUnitFilter}
                      horasConfig={horasConfig}
                      sessionToken={sessionToken}
                      activeTab={prodActiveTab}
                      onActiveTabChange={setProdActiveTab}
                      hideInternalTabs
                      papelGlobal={papelGlobal}
                      processStartDate={rawProcessData?.Info?.DataAutuacao || processCreationInfo?.dataCriacao}
                      processEndDate={rawProcessData?.Info?.DataConclusao}
                      numeroProcesso={numeroProcesso}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </ProcessProvider>
        )}
      </div>

      {/* Summary expanded modal */}
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-success">
              <BookText className="mr-2 h-5 w-5" />
              Entendimento Automatizado (IA) - Resumo Expandido
            </DialogTitle>
            <DialogDescription>
              Resumo detalhado do processo gerado automaticamente por inteligência artificial
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-4">
            <div className="p-4 bg-muted/30 rounded-md">
              {processSummary ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed">
                    {processSummary}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Info className="mr-2 h-4 w-4" />
                  Nenhum resumo disponível para exibir.
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsSummaryModalOpen(false)} variant="outline">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
