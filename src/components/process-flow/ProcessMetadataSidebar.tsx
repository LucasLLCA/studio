
"use client";

import type { UnidadeAberta, ProcessedAndamento, ProcessedFlowData } from '@/types/process-flow';
import { Briefcase, User, Info, AlertTriangle, Loader2 } from 'lucide-react';
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
  processedFlowData: ProcessedFlowData | null; // Still needed for daysOpen correlation
  onTaskCardClick: (task: ProcessedAndamento) => void; // Still needed for card click
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

  // Find the corresponding open task from the diagram data for a given unit ID
  const findOpenTaskForUnit = (unitId: string): ProcessedAndamento | undefined => {
    if (!processedFlowData || !processedFlowData.tasks) {
      return undefined;
    }
    // Find the latest task in this unit that is marked as an open end
    const openTasksInUnit = processedFlowData.tasks
      .filter(task => task.Unidade.IdUnidade === unitId && typeof task.daysOpen === 'number' && task.daysOpen >= 0)
      .sort((a, b) => b.globalSequence - a.globalSequence); // Sort by globalSequence descending to get latest

    return openTasksInUnit[0]; // Return the latest one, if any
  };

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
          openUnitsInProcess.map(unitInfo => {
            const openTaskDetails = findOpenTaskForUnit(unitInfo.Unidade.IdUnidade);
            const cardIsClickable = !!openTaskDetails;

            return (
              <Card 
                key={unitInfo.Unidade.IdUnidade} 
                className={`shadow-sm ${cardIsClickable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
                onClick={() => {
                  if (openTaskDetails) {
                    onTaskCardClick(openTaskDetails);
                  }
                }}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center text-destructive">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {unitInfo.Unidade.Sigla}
                  </CardTitle>
                  <CardDescription className="text-xs pt-1">
                    {unitInfo.Unidade.Descricao}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
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
                  {openTaskDetails && typeof openTaskDetails.daysOpen === 'number' && (
                    <Badge variant="destructive">
                      Pendente há {openTaskDetails.daysOpen} {openTaskDetails.daysOpen === 1 ? 'dia' : 'dias'} (no fluxograma)
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
        {!isLoadingOpenUnits && openUnitsMessage && (
          <p className="text-sm text-muted-foreground mt-2 p-2 bg-secondary/50 rounded-md">
            {openUnitsMessage}
          </p>
        )}
      </div>
      
      {/* This ensures there's a message if nothing else is shown */}
      {!processNumber && !isLoadingOpenUnits && (!openUnitsInProcess || openUnitsInProcess.length === 0) && (
         <p className="text-sm text-muted-foreground flex-grow pt-6">
          Busque um processo ou carregue um arquivo JSON para visualizar os detalhes.
         </p>
      )}
    </aside>
  );
}
