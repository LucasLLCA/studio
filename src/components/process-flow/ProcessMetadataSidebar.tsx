
"use client";

import type { ProcessoData, ProcessedAndamento } from '@/types/process-flow';
import { ProcessFlowLegend } from './ProcessFlowLegend';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { processAndamentos } from '@/lib/process-flow-utils';


interface ProcessMetadataSidebarProps {
  processedData: ProcessoData | null; 
  processNumberPlaceholder?: string;
}

export function ProcessMetadataSidebar({ processedData: rawProcessData, processNumberPlaceholder }: ProcessMetadataSidebarProps) {
  
  const processedFullData = useMemo(() => {
    if (!rawProcessData || !rawProcessData.Andamentos) {
      return null;
    }
    return processAndamentos(rawProcessData.Andamentos);
  }, [rawProcessData]);
  
  // Placeholder - ideally sourced from rawProcessData.Info or a dedicated field
  const displayProcessNumber = rawProcessData?.Info?.NumeroProcesso || processNumberPlaceholder || "Não disponível";

  if (!processedFullData || processedFullData.tasks.length === 0) {
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
        <p className="text-sm text-muted-foreground flex-grow">Carregue um arquivo JSON para visualizar os detalhes e o fluxograma.</p>
        <div className="mt-auto">
          <ProcessFlowLegend />
        </div>
      </aside>
    );
  }

  const openTasks = processedFullData.tasks.filter(
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
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2"> {/* Added max-h and overflow for cards */}
            {openTasks.map(task => (
              <Card key={`${task.IdAndamento}-${task.globalSequence}`} className="shadow-sm border-destructive/50">
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
      
      <div className="mt-auto pt-4"> {/* Pushes legend to bottom */}
        <ProcessFlowLegend />
      </div>
    </aside>
  );
}
