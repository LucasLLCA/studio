
"use client";

import type { ProcessedFlowData, ProcessedAndamento, UnidadeAberta } from '@/types/process-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Clock, FileText, ListChecks, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface ProcessMetadataSidebarProps {
  processedFlowData: ProcessedFlowData | null; 
  processNumber?: string;
  processNumberPlaceholder?: string;
  onTaskCardClick: (task: ProcessedAndamento) => void;
  openUnitsInProcess: UnidadeAberta[] | null;
  isLoadingOpenUnits: boolean;
}

export function ProcessMetadataSidebar({ 
  processedFlowData, 
  processNumber, 
  processNumberPlaceholder,
  onTaskCardClick,
  openUnitsInProcess,
  isLoadingOpenUnits,
}: ProcessMetadataSidebarProps) {
  
  const displayProcessNumber = processNumber || processNumberPlaceholder || "Não disponível";

  const openTasks = processedFlowData?.tasks.filter(
    task => task.color === 'hsl(var(--destructive))' && typeof task.daysOpen === 'number' && task.daysOpen >= 0
  ) || [];

  return (
    <aside className="w-80 p-4 border-r bg-card flex-shrink-0 flex flex-col space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center">
           <FileText className="mr-2 h-5 w-5 text-primary"/>
           Metadados do Processo
        </h2>
        <p className="text-sm text-muted-foreground">
          Número: <span className="font-medium text-foreground">{displayProcessNumber}</span>
        </p>
      </div>

      {/* Seção Unidades com Processo Aberto */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center">
          <ListChecks className="mr-2 h-5 w-5 text-primary" />
          Unidades com Processo Aberto
        </h3>
        {isLoadingOpenUnits && (
          <div className="space-y-2 pr-2">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        )}
        {!isLoadingOpenUnits && openUnitsInProcess && openUnitsInProcess.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside pl-2">
            {openUnitsInProcess.map(unit => (
              <li key={unit.IdUnidade} title={unit.DescricaoUnidade}>
                {unit.SiglaUnidade}
              </li>
            ))}
          </ul>
        )}
        {!isLoadingOpenUnits && (!openUnitsInProcess || openUnitsInProcess.length === 0) && (
          <p className="text-sm text-muted-foreground">
            {rawProcessData && processoNumeroInput ? "Nenhuma unidade com este processo em aberto ou informação não disponível." : "Carregue um processo para ver as unidades em aberto."}
          </p>
        )}
      </div>

      {/* Seção Tarefas Pendentes */}
      {processedFlowData && processedFlowData.tasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Tarefas Pendentes no Fluxo Atual
          </h3>
          {openTasks.length > 0 ? (
            <div className="space-y-3 pr-2"> 
              {openTasks.map(task => (
                <Card 
                  key={`${task.IdAndamento}-${task.globalSequence}`} 
                  className="shadow-sm border-destructive/50 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onTaskCardClick(task)}
                  title={`Ir para tarefa #${task.globalSequence} na unidade ${task.Unidade.Sigla}`}
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold">{task.Unidade.Sigla}</CardTitle>
                    <CardDescription className="text-xs">{task.Tarefa}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center text-xs text-destructive font-medium">
                      <Clock className="mr-1.5 h-3 w-3" />
                      {task.daysOpen} dia(s) pendente
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
             <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente identificada no fluxo atual.</p>
          )}
        </div>
      )}
      
      {!processedFlowData && (
        <p className="text-sm text-muted-foreground flex-grow pt-6">Carregue um arquivo JSON ou busque um processo para visualizar os detalhes e o fluxograma.</p>
      )}

    </aside>
  );
}
// Helper to access rawProcessData for display logic - this should ideally be passed if needed or handled via context
// This is a bit of a hack, ideally the "Carregue um processo..." message logic would be driven by props.
const rawProcessData = typeof window !== 'undefined' ? (window as any).__NEXT_DATA__?.props?.pageProps?.rawProcessData : null;
const processoNumeroInput = typeof window !== 'undefined' ? (window as any).__NEXT_DATA__?.props?.pageProps?.processoNumeroInput : null;

