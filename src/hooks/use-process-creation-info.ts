"use client";

import { useState, useEffect } from 'react';
import type { ProcessoData, Andamento } from '@/types/process-flow';
import { parseCustomDateString, formatDisplayDate } from '@/lib/process-flow-utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ProcessCreationInfo {
  creatorUnit: string;
  creatorUser: string;
  creatorSigla: string;
  creationDate: string;
  timeSinceCreation: string;
}

export function useProcessCreationInfo(rawProcessData: ProcessoData | null): ProcessCreationInfo | null {
  const [processCreationInfo, setProcessCreationInfo] = useState<ProcessCreationInfo | null>(null);

  useEffect(() => {
    if (rawProcessData && rawProcessData.Andamentos && rawProcessData.Andamentos.length > 0) {
      const sortedAndamentos = [...rawProcessData.Andamentos]
        .map(a => ({ ...a, parsedDate: parseCustomDateString(a.DataHora) }))
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

      let generationEvent: Andamento | undefined = sortedAndamentos.find(a => a.Tarefa === 'GERACAO-PROCEDIMENTO');
      if (!generationEvent && sortedAndamentos.length > 0) {
        generationEvent = sortedAndamentos[0];
      }

      if (generationEvent) {
        const creationDate = parseCustomDateString(generationEvent.DataHora);
        setProcessCreationInfo({
          creatorUnit: generationEvent.Unidade.Sigla,
          creatorUser: generationEvent.Usuario.Nome,
          creatorSigla: generationEvent.Usuario.Sigla,
          creationDate: formatDisplayDate(creationDate),
          timeSinceCreation: formatDistanceToNowStrict(creationDate, { addSuffix: true, locale: ptBR }),
        });
      } else {
        setProcessCreationInfo(null);
      }
    } else {
      setProcessCreationInfo(null);
    }
  }, [rawProcessData]);

  return processCreationInfo;
}
