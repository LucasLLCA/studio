"use client";

import { ProcessFlowDiagram } from '@/components/process-flow/ProcessFlowDiagram';
import type { ProcessedFlowData, ProcessedAndamento } from '@/types/process-flow';
import {
  GanttChartSquare,
  BookText,
  Info,
  ChevronsLeft,
  ChevronsRight,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Download,
  ChevronDown,
  FlaskConical,
  Menu,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LoadingFeedback } from '@/components/home/LoadingFeedback';
import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { usePermissions } from '@/hooks/use-permissions';
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
import { processAndamentos, deriveOpenUnitsFromAndamentos } from '@/lib/process-flow-utils';
import { formatProcessNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProcessFlowLegend } from '@/components/process-flow/ProcessFlowLegend';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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
import { MobileVerticalTimeline } from '@/components/process-flow/MobileVerticalTimeline';
import { FlowComplianceSection } from '@/components/flow-builder/FlowComplianceSection';
import { useFluxosByProcesso } from '@/lib/react-query/queries/useFluxos';
import { stripProcessNumber } from '@/lib/utils';
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
    idUnidadeAtual,
    orgao: userOrgao,
    usuario,
    unidadesFiltroList,
    logout: persistLogout,
  } = usePersistedAuth();
  const { hasModulo } = usePermissions();

  // Use selected unit or fall back to user's default unit
  const unidadeParaConsulta = selectedUnidadeFiltro || idUnidadeAtual || '';

  // Override unidade for resumo/situacao requests (when document access fails)
  const [resumoUnidadeOverride, setResumoUnidadeOverride] = useState<string | undefined>(undefined);

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
  const [isMobileAndamentosMenuOpen, setIsMobileAndamentosMenuOpen] = useState(false);
  const [isMobileProdMenuOpen, setIsMobileProdMenuOpen] = useState(false);

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

  // Check if process has any linked flows (for "Vincular a Fluxo" button)
  const { data: fluxosVinculados } = useFluxosByProcesso(usuario || '', stripProcessNumber(numeroProcesso));
  const hasLinkedFluxo = (fluxosVinculados?.length ?? 0) > 0;

  const unitAccessDenied = noDocAccessParam;

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
    andamentosFailed,
    d1Failed,
    d1Error,
    resumoFailed,
    resumoError,
    retryResumo,
    dataCarga,
    refreshNoCache,
  } = useProcessData({
    numeroProcesso,
    sessionToken,
    selectedUnidadeFiltro: unidadeParaConsulta,
    resumoUnidadeOverride,
    isAuthenticated,
    unitAccessDenied,
    onSessionExpired: () => { persistLogout(); clearLastViewedProcess(); router.push('/'); },
  });

  // Derive open units from the andamentos timeline (no endpoint needed)
  const openUnitsInProcess = useMemo(() => {
    const andamentos = rawProcessData?.Andamentos;
    if (!andamentos || andamentos.length === 0) return null;
    return deriveOpenUnitsFromAndamentos(andamentos);
  }, [rawProcessData?.Andamentos]);

  // Derived state hooks
  const processCreationInfo = useProcessCreationInfo(rawProcessData);

  const processedFlowData: ProcessedFlowData | null = useMemo(() => {
    const andamentos = rawProcessData?.Andamentos;
    if (!rawProcessData || !andamentos) return null;
    const processNumber = rawProcessData.Info?.NumeroProcesso || numeroProcesso;
    return processAndamentos(andamentos, openUnitsInProcess, processNumber, isSummarizedView);
  }, [rawProcessData, openUnitsInProcess, numeroProcesso, isSummarizedView]);

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

  const handleExportTimelineText = useCallback(() => {
    if (!processedFlowData || !rawProcessData) return;

    const processNum = formatProcessNumber(rawProcessData.Info?.NumeroProcesso || numeroProcesso);
    const tasks = processedFlowData.tasks;
    const connections = processedFlowData.connections;
    const lanes = Array.from(processedFlowData.laneMap.keys());

    const lines: string[] = [];
    lines.push(`# Timeline: Processo ${processNum}`);
    lines.push(`# Exported: ${new Date().toISOString()}`);
    lines.push(`# Total andamentos: ${tasks.length}`);
    lines.push(`# Lanes (units): ${lanes.length}`);
    lines.push(`# Connections: ${connections.length}`);
    lines.push('');

    // Lanes
    lines.push('## Lanes (swim lanes)');
    lanes.forEach((lane, i) => lines.push(`  ${i + 1}. ${lane}`));
    lines.push('');

    // Open units
    if (openUnitsInProcess && openUnitsInProcess.length > 0) {
      lines.push('## Open units (processo em aberto)');
      openUnitsInProcess.forEach(u => {
        const user = u.UsuarioAtribuicao?.Nome || u.UsuarioAtribuicao?.Sigla || '-';
        lines.push(`  - ${u.Unidade.Sigla} (user: ${user})`);
      });
      lines.push('');
    }

    // Nodes (chronological, oldest first)
    lines.push('## Nodes (chronological order, oldest first)');
    lines.push('');
    const sorted = [...tasks].sort((a, b) => a.globalSequence - b.globalSequence);
    sorted.forEach(t => {
      const grouped = t.isSummaryNode ? ` [grouped: ${t.groupedTasksCount} actions]` : '';
      const days = t.daysOpen !== undefined ? ` [OPEN: ${t.daysOpen}d]` : '';
      const attrs = t.Atributos?.length
        ? ` attrs=[${t.Atributos.map(a => `${a.Nome}:${a.Valor}`).join(', ')}]`
        : '';
      lines.push(`  [${t.globalSequence}] ${t.DataHora} | ${t.Tarefa} | ${t.Unidade.Sigla} | ${t.Usuario.Nome || t.Usuario.Sigla || '-'}${grouped}${days}${attrs}`);
      if (t.Descricao && !t.isSummaryNode) {
        const clean = t.Descricao.replace(/<[^>]*>/g, '').substring(0, 120);
        lines.push(`       desc: ${clean}`);
      }
    });
    lines.push('');

    // Connections
    lines.push('## Connections (edges)');
    lines.push('');
    connections.forEach(c => {
      const style = c.style === 'dotted' ? ' (dotted/reference)' : '';
      lines.push(`  [${c.sourceTask.globalSequence}] ${c.sourceTask.Unidade.Sigla} → [${c.targetTask.globalSequence}] ${c.targetTask.Unidade.Sigla}${style}`);
    });
    lines.push('');

    // Summary stats
    lines.push('## Summary');
    const taskCounts: Record<string, number> = {};
    tasks.forEach(t => { taskCounts[t.Tarefa] = (taskCounts[t.Tarefa] || 0) + 1; });
    Object.entries(taskCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([tipo, count]) => lines.push(`  ${tipo}: ${count}`));

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${processNum.replace(/[\/\s.]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processedFlowData, rawProcessData, numeroProcesso, openUnitsInProcess]);

  const handleExportTimeline = useCallback(() => {
    const card = document.querySelector('[data-diagram-card]');
    if (!card) return;
    const svgEl = card.querySelector('svg');
    if (!svgEl) return;

    // Clone SVG and inline computed styles for standalone rendering
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Add white background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', 'white');
    clone.insertBefore(bg, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const processId = formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso);
    a.download = `timeline-${processId.replace(/[\/\s.]/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rawProcessData, numeroProcesso]);

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

  const allLoadingTasks = loadingTasks;

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Loading feedback when no data */}
        {isClient && hasBackgroundLoading && !rawProcessData && (
          <LoadingFeedback
            title="Carregando dados..."
            loadingTasks={allLoadingTasks}
          />
        )}

        {/* Error card when D-1 data source failed */}
        {d1Failed && !rawProcessData && !hasBackgroundLoading && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold">Falha ao carregar dados do processo</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  O serviço de dados pré-armazenados (D-1) não está disponível no momento.
                  Não foi possível carregar os andamentos do processo {formatProcessNumber(numeroProcesso)}.
                </p>
                {d1Error && (
                  <p className="text-xs text-muted-foreground/70 mt-1">{d1Error}</p>
                )}
              </div>
              <Button onClick={refresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error card when SEI sync failed (D-1 loaded but SEI errored) */}
        {andamentosFailed && !d1Failed && !rawProcessData && !hasBackgroundLoading && (
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
            processLinkAcesso={null}
            openUnitsInProcess={openUnitsInProcess}
            hasBackgroundLoading={hasBackgroundLoading}
            lastFetchedAt={lastFetchedAt}
            isRefreshing={isRefreshing}
            isDetailsSheetOpen={isDetailsSheetOpen}
            onOpenDetailsSheet={() => setIsDetailsSheetOpen(true)}
            onRefresh={refresh}
            initialIsSaved={isSaved}
            onSavedStatusChange={setIsSaved}
            dataCarga={dataCarga}
            hasLinkedFluxo={hasLinkedFluxo}
            onVincularFluxo={() => router.push('/fluxos')}
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
          resumoFailed={resumoFailed}
          resumoError={resumoError}
          unidadesFiltroList={unidadesFiltroList}
          currentUnidade={resumoUnidadeOverride || unidadeParaConsulta}
          onRetryResumoWithUnidade={(unidadeId) => {
            setResumoUnidadeOverride(unidadeId);
            retryResumo();
          }}
        />

        {rawProcessData && (
          <ProcessProvider value={{
            sessionToken,
            isAuthenticated,
            selectedUnidadeFiltro: unidadeParaConsulta,
            processNumber: numeroProcesso || rawProcessData?.Info?.NumeroProcesso || '',
            openUnitsInProcess,
            refresh,
          }}>
            <div className="flex flex-col gap-6">
              {/* Open Units */}
              <OpenUnitsCard
                openUnitsInProcess={openUnitsInProcess}
                unitAccessDenied={unitAccessDenied}
                processedFlowData={processedFlowData}
                onTaskCardClick={handleTaskCardClick}
              />

              {/* Flow Compliance */}
              {rawProcessData?.Andamentos && usuario && (
                <FlowComplianceSection
                  usuario={usuario}
                  numeroProcesso={numeroProcesso}
                  andamentos={rawProcessData.Andamentos}
                />
              )}

              {/* Andamentos (Timeline or Table) */}
              <Card className="flex flex-col" data-diagram-card>
               <CardHeader className="pb-3 flex-shrink-0">
  {/* DESKTOP */}
  <div className="hidden lg:flex items-center justify-between gap-4">
    {/* ESQUERDA: título + troca de visualização */}
    <div className="flex items-center gap-3 min-w-0">
      <CardTitle className="flex items-center gap-2 text-lg whitespace-nowrap">
        <GanttChartSquare className="h-5 w-5" />
        Andamentos
      </CardTitle>

      <div className="flex items-center border rounded-md overflow-hidden">
        <Button
          variant={andamentosView === "timeline" ? "default" : "ghost"}
          size="sm"
          className="rounded-none h-8"
          onClick={() => setAndamentosView("timeline")}
        >
          <GanttChartSquare className="mr-1 h-4 w-4" />
          <span className="hidden lg:inline">Linha do Tempo</span>
        </Button>

        <Button
          variant={andamentosView === "table" ? "default" : "ghost"}
          size="sm"
          className="rounded-none h-8"
          onClick={() => setAndamentosView("table")}
        >
          <Table2 className="mr-1 h-4 w-4" />
          <span className="hidden lg:inline">Tabela</span>
        </Button>
      </div>
    </div>

    {/* DIREITA: ações desktop */}
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-amber-500/50 text-amber-700"
          >
            <FlaskConical className="mr-1 h-3 w-3" />
            <span className="hidden lg:inline">Experimental</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Cache</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={refreshNoCache}
            disabled={isRefreshing || hasBackgroundLoading}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Limpar cache
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {processedFlowData && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Download className="mr-1 h-3 w-3" />
              <span className="hidden lg:inline">Exportar</span>
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {andamentosView === "timeline" && (
              <DropdownMenuItem onClick={handleExportTimeline}>
                <Download className="mr-2 h-3 w-3" />
                Exportar SVG
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handleExportTimelineText}>
              <Download className="mr-2 h-3 w-3" />
              Exportar TXT (LLM)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Separator orientation="vertical" className="h-5" />

      <div className="flex items-center space-x-2">
        <Switch
          id="summarize-graph"
          checked={isSummarizedView}
          onCheckedChange={setIsSummarizedView}
          disabled={!rawProcessData || isLoading}
        />
        <Label htmlFor="summarize-graph" className="text-sm text-muted-foreground">
          Resumido
        </Label>
      </div>

      {andamentosView === "timeline" && (
        <>
          <Separator orientation="vertical" className="h-5" />

          <Button
            onClick={handleScrollToFirstTask}
            variant="outline"
            size="sm"
            disabled={!processedFlowData?.tasks.length}
          >
            <ChevronsLeft className="lg:mr-1 h-4 w-4" />
            <span className="hidden lg:inline">Início</span>
          </Button>

          <Button
            onClick={handleScrollToLastTask}
            variant="outline"
            size="sm"
            disabled={!processedFlowData?.tasks.length}
          >
            <ChevronsRight className="lg:mr-1 h-4 w-4" />
            <span className="hidden lg:inline">Fim</span>
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!processedFlowData?.tasks.length}
              >
                <GanttChartSquare className="lg:mr-1 h-4 w-4" />
                <span className="hidden lg:inline">Filtrar Unidades</span>
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
                  <h4 className="font-medium text-sm mb-2">
                    Filtrar Raias por Unidade
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Selecione as unidades para reorganizá-las no topo
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLaneUnits(availableLaneUnits)}
                  >
                    Todas
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLaneUnits([])}
                  >
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
                              setSelectedLaneUnits(
                                selectedLaneUnits.filter((u) => u !== unit)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                        />
                        <Label
                          htmlFor={`unit-${unit}`}
                          className="text-sm cursor-pointer flex-1"
                        >
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
                <HelpCircle className="lg:mr-1 h-4 w-4" />
                <span className="hidden lg:inline">Legenda</span>
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

      {andamentosView === "table" && (
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

  {/* MOBILE */}
  <div className="flex lg:hidden items-center justify-between gap-2">
    <CardTitle className="flex items-center gap-2 text-lg min-w-0">
      <GanttChartSquare className="h-5 w-5 shrink-0" />
      <span className="truncate">Andamentos</span>
    </CardTitle>

    <Drawer
      open={isMobileAndamentosMenuOpen}
      onOpenChange={setIsMobileAndamentosMenuOpen}
    >
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 rounded-xl shrink-0"
          aria-label="Abrir opções de andamentos"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="rounded-t-3xl">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle className="text-lg font-semibold">
              Opções de Andamentos
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Visualização */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary">Visualização</p>

              <Button
                variant={andamentosView === "timeline" ? "default" : "outline"}
                className="w-full justify-start rounded-xl h-12"
                onClick={() => {
                  setAndamentosView("timeline");
                  setIsMobileAndamentosMenuOpen(false);
                }}
              >
                <GanttChartSquare className="mr-2 h-4 w-4" />
                Linha do Tempo
              </Button>

              <Button
                variant={andamentosView === "table" ? "default" : "outline"}
                className="w-full justify-start rounded-xl h-12"
                onClick={() => {
                  setAndamentosView("table");
                  setIsMobileAndamentosMenuOpen(false);
                }}
              >
                <Table2 className="mr-2 h-4 w-4" />
                Tabela
              </Button>
            </div>

            {/* Ações */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary">Ações</p>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between rounded-xl h-12"
                  >
                    <span className="flex items-center">
                      <FlaskConical className="mr-2 h-4 w-4" />
                      Experimental
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="center" className="w-[260px]">
                  <DropdownMenuLabel>Cache</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      refreshNoCache();
                      setIsMobileAndamentosMenuOpen(false);
                    }}
                    disabled={isRefreshing || hasBackgroundLoading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar cache
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {processedFlowData && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between rounded-xl h-12"
                    >
                      <span className="flex items-center">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="center" className="w-[260px]">
                    {andamentosView === "timeline" && (
                      <DropdownMenuItem
                        onClick={() => {
                          handleExportTimeline();
                          setIsMobileAndamentosMenuOpen(false);
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar SVG
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => {
                        handleExportTimelineText();
                        setIsMobileAndamentosMenuOpen(false);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar TXT (LLM)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Exibição */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary">Exibição</p>

              <div className="flex items-center justify-between rounded-xl border px-4 py-4">
                <Label htmlFor="summarize-graph-mobile" className="text-sm font-medium">
                  Resumido
                </Label>

                <Switch
                  id="summarize-graph-mobile"
                  checked={isSummarizedView}
                  onCheckedChange={setIsSummarizedView}
                  disabled={!rawProcessData || isLoading}
                />
              </div>
            </div>

            {/* Timeline */}
            {andamentosView === "timeline" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">
                  Linha do Tempo
                </p>

                <Button
                  onClick={() => {
                    handleScrollToFirstTask();
                    setIsMobileAndamentosMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full justify-start rounded-xl h-12"
                  disabled={!processedFlowData?.tasks.length}
                >
                  <ChevronsLeft className="mr-2 h-4 w-4" />
                  Início
                </Button>

                <Button
                  onClick={() => {
                    handleScrollToLastTask();
                    setIsMobileAndamentosMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full justify-start rounded-xl h-12"
                  disabled={!processedFlowData?.tasks.length}
                >
                  <ChevronsRight className="mr-2 h-4 w-4" />
                  Fim
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl h-12"
                      disabled={!processedFlowData?.tasks.length}
                    >
                      <GanttChartSquare className="mr-2 h-4 w-4" />
                      Filtrar Unidades
                      {selectedLaneUnits.length > 0 && (
                        <span className="ml-auto px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                          {selectedLaneUnits.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-80 rounded-2xl" align="center">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">
                          Filtrar Raias por Unidade
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Selecione as unidades para reorganizá-las no topo
                        </p>
                      </div>

                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLaneUnits(availableLaneUnits)}
                        >
                          Todas
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLaneUnits([])}
                        >
                          Limpar
                        </Button>
                      </div>

                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {availableLaneUnits.map((unit) => (
                            <div key={unit} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`mobile-unit-${unit}`}
                                checked={selectedLaneUnits.includes(unit)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLaneUnits([...selectedLaneUnits, unit]);
                                  } else {
                                    setSelectedLaneUnits(
                                      selectedLaneUnits.filter((u) => u !== unit)
                                    );
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                              />

                              <Label
                                htmlFor={`mobile-unit-${unit}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {unit}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl h-12"
                  onClick={() => {
                    setIsLegendModalOpen(true);
                    setIsMobileAndamentosMenuOpen(false);
                  }}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Legenda
                </Button>
              </div>
            )}

            {/* Busca tabela */}
            {andamentosView === "table" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">Busca</p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    placeholder="Buscar unidade, usuário ou descrição..."
                    value={andamentosSearchQuery}
                    onChange={(e) => setAndamentosSearchQuery(e.target.value)}
                    className="h-12 pl-9 rounded-xl text-sm text-foreground font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full rounded-xl h-11">
                Fechar
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  </div>
</CardHeader>

                <Separator />

                <CardContent className="overflow-hidden p-0 px-6 pb-6 pt-4">
                  {andamentosView === 'timeline' ? (
                    processedFlowData && processedFlowData.tasks.length > 0 ? (
                      <>
                        {/* Desktop: horizontal SVG diagram */}
                        <div
                          className="hidden lg:flex flex-col w-full"
                          style={{ height: `${Math.min(processedFlowData.svgHeight + 80, 600)}px` }}
                        >
                          <ProcessFlowDiagram
                            tasks={processedFlowData.tasks}
                            connections={processedFlowData.connections}
                            svgWidth={processedFlowData.svgWidth}
                            svgHeight={processedFlowData.svgHeight}
                            laneMap={processedFlowData.laneMap}
                            taskToScrollTo={taskToScrollTo}
                            taskToSelect={taskToSelect}
                            filteredLaneUnits={selectedLaneUnits}
                          />
                        </div>
                        {/* Mobile: vertical timeline */}
                        <div className="lg:hidden">
                          <MobileVerticalTimeline tasks={processedFlowData.tasks} />
                        </div>
                      </>
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
                    {/* DESKTOP */}
                    <div className="hidden lg:flex items-center justify-between">
                      {/* LEFT: title + tabs */}
                      <div className="flex items-center gap-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <GanttChartSquare className="h-5 w-5" /> Produtividade
                        </CardTitle>
                        <ProcessProductivityTabs
                          value={prodActiveTab}
                          onValueChange={(value) => setProdActiveTab(value as ProductivityTab)}
                          hasHorasConfig={hasHorasConfig}
                          canViewFinanceiro={hasModulo('financeiro')}
                        />
                      </div>
                      {/* RIGHT: search + filter */}
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>

                    {/* MOBILE */}
                <div className="flex lg:hidden items-center justify-between">

                  {/* Título */}
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GanttChartSquare className="h-5 w-5" />
                    Produtividade
                  </CardTitle>

                  {/* Drawer */}
                  <Drawer
                    open={isMobileProdMenuOpen}
                    onOpenChange={setIsMobileProdMenuOpen}
                  >
                    <DrawerTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 w-10 rounded-xl">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DrawerTrigger>

                    <DrawerContent className="rounded-t-3xl">
                      <div className="mx-auto w-full max-w-md">

                        {/* HEADER */}
                        <DrawerHeader className="text-center pb-2">
                          <DrawerTitle>Opções de Produtividade</DrawerTitle>
                        </DrawerHeader>

                        {/* CONTEÚDO */}
                        <div className="px-4 pb-4 space-y-5">

                          {/* ================= TABS ================= */}
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-primary">
                              Visualização
                            </p>

                            <Button
                              className="w-full justify-start rounded-xl h-12"
                              variant={prodActiveTab === "tarefas" ? "default" : "outline"}
                              onClick={() => {
                                setProdActiveTab("tarefas")
                                setIsMobileProdMenuOpen(false)
                              }}
                            >
                              Tarefas
                            </Button>

                            <Button
                              className="w-full justify-start rounded-xl h-12"
                              variant={prodActiveTab === "horas" ? "default" : "outline"}
                              onClick={() => {
                                setProdActiveTab("horas")
                                setIsMobileProdMenuOpen(false)
                              }}
                            >
                              Horas
                            </Button>
                          </div>

                          {/* ================= BUSCA ================= */}
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-primary">
                              Busca
                            </p>

                            <Input
                              placeholder="Buscar unidade ou usuário..."
                              value={prodSearchQuery}
                              onChange={(e) => setProdSearchQuery(e.target.value)}
                              className="h-12 rounded-xl"
                            />
                          </div>

                          {/* ================= FILTRO ================= */}
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-primary">
                              Filtro
                            </p>

                            <ProcessProductivityUnitFilter
                              andamentos={rawProcessData.Andamentos}
                              value={prodUnitFilter}
                              onChange={(value) => {
                                setProdUnitFilter(value)
                              }}
                            />
                          </div>

                        </div>

                        {/* BOTÃO FECHAR */}
                        <div className="p-4">
                          <DrawerClose asChild>
                            <Button variant="outline" className="w-full rounded-xl h-11">
                              Fechar
                            </Button>
                          </DrawerClose>
                        </div>

                      </div>
                    </DrawerContent>
                  </Drawer>
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
                      canViewFinanceiro={hasModulo('financeiro')}
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