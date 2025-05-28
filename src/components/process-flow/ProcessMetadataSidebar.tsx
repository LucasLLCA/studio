
"use client";

import type { UnidadeAberta } from '@/types/process-flow';
import { ListChecks, Loader2, Briefcase, User, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; 
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';

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

  const getOpenUnitsMessage = () => {
    if (isLoadingOpenUnits) return null; 
    if (!processNumber) return "Carregue um processo para ver as unidades em aberto.";
    if (openUnitsInProcess && openUnitsInProcess.length === 0) {
      return "Nenhuma unidade com este processo em aberto ou informação não disponível.";
    }
    if (!openUnitsInProcess && processNumber) { 
        return "Verificando unidades abertas...";
    }
    return null; 
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
      
      <div className="space-y-3">
        {isLoadingOpenUnits && (
          <>
            <h3 className="text-md font-semibold text-foreground mb-2">Unidades com Processo Aberto:</h3>
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </>
        )}
        {!isLoadingOpenUnits && openUnitsInProcess && openUnitsInProcess.length > 0 && (
          <>
            <h3 className="text-md font-semibold text-foreground mb-2">Unidades com Processo Aberto:</h3>
            {openUnitsInProcess.map(unitInfo => (
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
                  {unitInfo.UsuarioAtribuicao.Nome ? (
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
            ))}
          </>
        )}
        {!isLoadingOpenUnits && openUnitsMessage && (
          <p className="text-sm text-muted-foreground mt-2 p-2 bg-secondary/50 rounded-md">
            {openUnitsMessage}
          </p>
        )}
      </div>
      
      {!processNumber && !isLoadingOpenUnits && (!openUnitsInProcess || openUnitsInProcess.length === 0) && (
         <p className="text-sm text-muted-foreground flex-grow pt-6">
          Busque um processo ou carregue um arquivo JSON para visualizar os detalhes.
         </p>
      )}

    </aside>
  );
}
