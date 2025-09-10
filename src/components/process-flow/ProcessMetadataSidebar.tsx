
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProcessMetadataSidebarProps {
  processNumber?: string;
  processNumberPlaceholder?: string;
  openUnitsInProcess: UnidadeAberta[] | null;
  processedFlowData: ProcessedFlowData | null; 
  onTaskCardClick: (task: ProcessedAndamento) => void;
}

export function ProcessMetadataSidebar({ 
  processNumber, 
  processNumberPlaceholder,
  openUnitsInProcess,
  processedFlowData,
  onTaskCardClick,
}: ProcessMetadataSidebarProps) {

  const getOpenUnitsMessage = () => {
    if (!processNumber && !openUnitsInProcess) return "Carregue ou pesquise um processo para ver as unidades em aberto.";
    if (openUnitsInProcess && openUnitsInProcess.length === 0 && processNumber) { 
      return "Nenhuma unidade com este processo em aberto (conforme API SEI).";
    }
    if (!openUnitsInProcess && processNumber) { 
        return "Verificando unidades abertas (API)...";
    }
    return null; 
  };
  const openUnitsMessage = getOpenUnitsMessage();

  const findOpenTaskForUnit = (unitId: string): ProcessedAndamento | undefined => {
    if (!processedFlowData || !processedFlowData.tasks) {
      return undefined;
    }
    const openTasksInUnit = processedFlowData.tasks
      .filter(task => task.Unidade.IdUnidade === unitId && typeof task.daysOpen === 'number' && task.daysOpen >= 0)
      .sort((a, b) => b.globalSequence - a.globalSequence); 

    return openTasksInUnit[0]; 
  };

  return (
    <div className="w-full"> 
        <div className="space-y-3">
          {openUnitsInProcess && openUnitsInProcess.length > 0 && (
            openUnitsInProcess.map(unitInfo => {
              const openTaskDetails = findOpenTaskForUnit(unitInfo.Unidade.IdUnidade);
              const cardIsClickable = !!openTaskDetails;

              return (
                <Card 
                  key={unitInfo.Unidade.IdUnidade} 
                  className={`shadow-sm w-full bg-card text-card-foreground ${cardIsClickable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
                  onClick={() => {
                    if (openTaskDetails) {
                      onTaskCardClick(openTaskDetails);
                    }
                  }}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-base flex items-center text-destructive">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      <span className="truncate">{unitInfo.Unidade.Sigla}</span>
                    </CardTitle>
                    <CardDescription className="text-xs pt-1 break-words">
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
                        <span>Não atribuído a um usuário.</span>
                      </div>
                    )}
                    {openTaskDetails && typeof openTaskDetails.daysOpen === 'number' && (
                      <Badge variant="destructive">
                        Pendente há {openTaskDetails.daysOpen} {openTaskDetails.daysOpen === 1 ? 'dia' : 'dias'}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
          {openUnitsMessage && (
            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded-md">
              {openUnitsMessage}
            </p>
          )}
        </div>
      
      {(!openUnitsInProcess || openUnitsInProcess.length === 0) && !openUnitsMessage && (
         <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma unidade com processo em aberto ou dados não carregados.
         </p>
      )}
    </div>
  );
}

