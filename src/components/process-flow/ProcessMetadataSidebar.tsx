
"use client";

import type { UnidadeAberta } from '@/types/process-flow';
import { ListChecks, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; 

interface ProcessMetadataSidebarProps {
  processNumber?: string;
  processNumberPlaceholder?: string;
  openUnitsInProcess: UnidadeAberta[] | null;
  isLoadingOpenUnits: boolean;
}

export function ProcessMetadataSidebar({ 
  processNumber, 
  processNumberPlaceholder,
  openUnitsInProcess,
  isLoadingOpenUnits,
}: ProcessMetadataSidebarProps) {
  
  const displayProcessNumber = processNumber || processNumberPlaceholder || "Não disponível";

  // Helper logic to determine message for open units section
  const getOpenUnitsMessage = () => {
    if (isLoadingOpenUnits) return null; // Loading skeleton will show
    if (!processNumber) return "Carregue um processo para ver as unidades em aberto.";
    if (openUnitsInProcess && openUnitsInProcess.length === 0) {
      return "Nenhuma unidade com este processo em aberto ou informação não disponível.";
    }
    if (!openUnitsInProcess) { // Error or not yet loaded but process number exists
        return "Verificando unidades abertas...";
    }
    return null; // Will render list
  };
  const openUnitsMessage = getOpenUnitsMessage();

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

      {/* Seção Unidades com Processo Aberto */}
      <div>
        {isLoadingOpenUnits && (
          <div className="space-y-2 pr-2 mt-2">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        )}
        {!isLoadingOpenUnits && openUnitsInProcess && openUnitsInProcess.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside pl-2 mt-2">
            {openUnitsInProcess.map(unit => (
              <li key={unit.IdUnidade} title={unit.DescricaoUnidade}>
                {unit.SiglaUnidade}
              </li>
            ))}
          </ul>
        )}
        {!isLoadingOpenUnits && openUnitsMessage && (
          <p className="text-sm text-muted-foreground mt-2">
            {openUnitsMessage}
          </p>
        )}
      </div>
      
      {/* Removed "Tarefas Pendentes" section */}
      
      {!processNumber && !isLoadingOpenUnits && !openUnitsInProcess && ( // Simplified initial message
        <p className="text-sm text-muted-foreground flex-grow pt-6">Carregue um arquivo JSON ou busque um processo para visualizar os detalhes.</p>
      )}

    </aside>
  );
}
