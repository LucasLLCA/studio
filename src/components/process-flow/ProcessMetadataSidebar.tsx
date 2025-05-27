
"use client";

import type { ProcessedFlowData, ProcessedAndamento } from '@/types/process-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Clock, FileText } from 'lucide-react';

interface ProcessMetadataSidebarProps {
  processedFlowData: ProcessedFlowData | null; 
  processNumber?: string;
  processNumberPlaceholder?: string;
  onTaskCardClick: (task: ProcessedAndamento) => void;
}

export function ProcessMetadataSidebar({ 
  processedFlowData, 
  processNumber, 
  processNumberPlaceholder,
  onTaskCardClick 
}: ProcessMetadataSidebarProps) {
  
  const displayProcessNumber = processNumber || processNumberPlaceholder || "Não disponível";

  if (!processedFlowData || processedFlowData.tasks.length === 0) {
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
        <p className="text-sm text-muted-foreground flex-grow">Carregue um arquivo JSON ou busque um processo para visualizar os detalhes e o fluxograma.</p>
      </aside>
    );
  }

  const openTasks = processedFlowData.tasks.filter(
    task => task.color === 'hsl(var(--destructive))' && typeof task.daysOpen === 'number' && task.daysOpen >= 0
  );

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

      {openTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Tarefas Pendentes
          </h3>
          {/* Removed max-h-96 and overflow-y-auto from the div below */}
          <div className="space-y-3 pr-2"> 
            {openTasks.map(task => (
              <Card 
                key={`${task.IdAndamento}-${task.globalSequence}`} 
                className="shadow-sm border-destructive/50 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onTaskCardClick(task)}
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
        </div>
      )}
      
      {openTasks.length === 0 && (
         <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente neste processo.</p>
      )}

    </aside>
  );
}
