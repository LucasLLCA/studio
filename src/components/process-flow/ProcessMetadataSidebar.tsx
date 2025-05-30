
"use client";

import type { UnidadeAberta, ProcessedAndamento, ProcessedFlowData } from '@/types/process-flow';
import { ListChecks, Loader2, Briefcase, User, Info, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; 
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import React from 'react';

interface ProcessMetadataSidebarProps {
  processNumber?: string;
  processNumberPlaceholder?: string;
  openUnitsInProcess: UnidadeAberta[] | null;
  isLoadingOpenUnits: boolean;
  processedFlowData: ProcessedFlowData | null;
  onTaskCardClick: (task: ProcessedAndamento) => void;
}

export function ProcessMetadataSidebar({ 
  processNumber, 
  processNumberPlaceholder,
  openUnitsInProcess,
  isLoadingOpenUnits,
  processedFlowData,
  onTaskCardClick,
}: ProcessMetadataSidebarProps) {
  
  const displayProcessNumber = processNumber || processNumberPlaceholder || "Não disponível";

  const getOpenUnitsMessage = () => {
    if (isLoadingOpenUnits) return null; 
    if (!processNumber) return "Carregue um processo para ver as unidades em aberto (API).";
    if (openUnitsInProcess && openUnitsInProcess.length === 0) {
      return "Nenhuma unidade com este processo em aberto (conforme API SEI).";
    }
    if (!openUnitsInProcess && processNumber) { 
        return "Verificando unidades abertas (API)...";
    }
    return null; 
  };
  const openUnitsMessage = getOpenUnitsMessage();

  const openTasksFromDiagram: ProcessedAndamento[] = React.useMemo(() => {
    if (!processedFlowData || !processedFlowData.tasks) {
      return [];
    }
    return processedFlowData.tasks.filter(task => typeof task.daysOpen === 'number' && task.daysOpen >= 0);
  }, [processedFlowData]);

  return (
    <aside className="w-80 p-4 border-r bg-card flex-shrink-0 flex flex-col space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-xl font-semibold mb-1">
           Metadados do Processo
        </h2>
        <p className="text-sm text-muted-foreground">
          Número: <span className="font-medium text-foreground">{displayProcessNumber}</span>
        </p>
      </div>
      
      {/* Unidades com Processo Aberto (via API SEI) */}
      <div className="space-y-3">
        <h3 className="text-md font-semibold text-foreground mb-2">Unidades com Processo Aberto (API SEI):</h3>
        {isLoadingOpenUnits && (
          <>
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </>
        )}
        {!isLoadingOpenUnits && openUnitsInProcess && openUnitsInProcess.length > 0 && (
          openUnitsInProcess.map(unitInfo => (
            <Card key={unitInfo.Unidade.IdUnidade} className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center">
                  <Briefcase className="mr-2 h-4 w-4 text-primary" />
                  {unitInfo.Unidade.Sigla}
                </CardTitle>
                <CardDescription className="text-xs pt-1">
                  {unitInfo.Unidade.Descricao}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {unitInfo.UsuarioAtribuicao?.Nome ? (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="mr-2 h-3 w-3" />
                    <span>Atribuído a: {unitInfo.UsuarioAtribuicao.Nome}</span>
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-muted-foreground/70">
                    <Info className="mr-2 h-3 w-3" />
                    <span>Não atribuído a um usuário específico.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        {!isLoadingOpenUnits && openUnitsMessage && (
          <p className="text-sm text-muted-foreground mt-2 p-2 bg-secondary/50 rounded-md">
            {openUnitsMessage}
          </p>
        )}
      </div>

      {/* Tarefas Pendentes (derivado do fluxograma) */}
      {processedFlowData && openTasksFromDiagram.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-foreground mb-2">Tarefas Pendentes (Fluxograma):</h3>
          {openTasksFromDiagram.map(task => (
            <Card 
              key={`${task.IdAndamento}-${task.globalSequence}`} 
              className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onTaskCardClick(task)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center text-destructive">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {task.Unidade.Sigla}
                </CardTitle>
                <CardDescription className="text-xs pt-1">
                  {task.Tarefa}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <Badge variant="destructive">
                  Pendente há {task.daysOpen} {task.daysOpen === 1 ? 'dia' : 'dias'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {!processNumber && !isLoadingOpenUnits && (!openUnitsInProcess || openUnitsInProcess.length === 0) && (!processedFlowData || openTasksFromDiagram.length === 0) && (
         <p className="text-sm text-muted-foreground flex-grow pt-6">
          Busque um processo ou carregue um arquivo JSON para visualizar os detalhes e tarefas pendentes.
         </p>
      )}
    </aside>
  );
}
