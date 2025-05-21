
"use client";

import type { ProcessoData, ProcessedFlowData, ProcessedAndamento, Connection } from '@/types/process-flow';
import { ProcessFlowDiagram } from './ProcessFlowDiagram';
import { processAndamentos } from '@/lib/process-flow-utils';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProcessFlowClientProps {
  fullProcessData: ProcessoData;
  itemsPerPage: number;
}

export function ProcessFlowClient({ fullProcessData, itemsPerPage }: ProcessFlowClientProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const processedFullData: ProcessedFlowData = useMemo(() => {
    // Process all andamentos to get global positions, sequences, and all connections
    return processAndamentos(fullProcessData.Andamentos);
  }, [fullProcessData.Andamentos]);

  const totalPages = Math.ceil(processedFullData.tasks.length / itemsPerPage);

  const paginatedTasks: ProcessedAndamento[] = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return processedFullData.tasks.slice(startIndex, endIndex);
  }, [processedFullData.tasks, currentPage, itemsPerPage]);

  const displayedConnections: Connection[] = useMemo(() => {
    const paginatedTaskIds = new Set(paginatedTasks.map(task => task.IdAndamento));
    return processedFullData.connections.filter(conn => 
      paginatedTaskIds.has(conn.sourceTask.IdAndamento) && 
      paginatedTaskIds.has(conn.targetTask.IdAndamento)
    );
  }, [processedFullData.connections, paginatedTasks]);


  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  if (!processedFullData.tasks.length) {
    return <p className="text-center text-muted-foreground py-10">Nenhum andamento para exibir.</p>;
  }
  
  return (
    <div className="h-full flex flex-col">
      <ProcessFlowDiagram 
        tasks={paginatedTasks}
        connections={displayedConnections}
        svgWidth={processedFullData.svgWidth}
        svgHeight={processedFullData.svgHeight}
        laneMap={processedFullData.laneMap}
      />
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 p-4 border-t">
          <Button onClick={handlePreviousPage} disabled={currentPage === 1} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
            Próxima <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
