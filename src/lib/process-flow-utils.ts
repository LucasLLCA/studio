import { type Andamento, type ProcessedAndamento, type Connection, type ProcessedFlowData } from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function parseCustomDateString(dateString: string): Date {
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart || !timePart) {
    console.warn('Invalid date string format:', dateString);
    return new Date(); // Return current date as fallback or handle error appropriately
  }
  const dateComponents = datePart.split('/').map(Number);
  const timeComponents = timePart.split(':').map(Number);

  if (dateComponents.length !== 3 || timeComponents.length !== 3) {
    console.warn('Invalid date or time components in:', dateString);
    return new Date(); // Fallback
  }
  const [day, month, year] = dateComponents;
  const [hours, minutes, seconds] = timeComponents;
  
  // Month is 0-indexed in JavaScript Date
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function formatDisplayDate(date: Date): string {
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function processAndamentos(andamentos: Andamento[]): ProcessedFlowData {
  const parsedAndamentos = andamentos
    .map(andamento => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
    }))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()); // Sort chronologically (oldest first)

  const processedTasks: ProcessedAndamento[] = parsedAndamentos.map((andamento, index) => ({
      ...andamento,
      globalSequence: index + 1,
    }));

  const connections: Connection[] = [];

  for (let i = 0; i < processedTasks.length; i++) {
    const currentTask = processedTasks[i];
    // 'PROCESSO-REMETIDO-UNIDADE' indica uma transferência.
    // A tarefa anterior (i-1) é a origem, a tarefa posterior (i+1) é o destino da seta.
    // A própria tarefa 'PROCESSO-REMETIDO-UNIDADE' é o evento de remessa.
    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      if (i > 0 && i < processedTasks.length - 1) {
        const potentialSourceTask = processedTasks[i - 1];
        const potentialTargetTask = processedTasks[i + 1];

        // Confirma que a origem está em uma unidade diferente da unidade de remessa (que é a unidade destino)
        // e que o destino está na mesma unidade da remessa.
        if (potentialSourceTask.Unidade.IdUnidade !== currentTask.Unidade.IdUnidade &&
            potentialTargetTask.Unidade.IdUnidade === currentTask.Unidade.IdUnidade) {
          
          connections.push({
            sourceTaskId: potentialSourceTask.IdAndamento,
            targetTaskId: potentialTargetTask.IdAndamento,
            sourceUnitId: potentialSourceTask.Unidade.IdUnidade,
            targetUnitId: currentTask.Unidade.IdUnidade, // Unidade da tarefa REMETIDO é a unidade de destino
          });
        }
      }
    }
  }

  return { tasks: processedTasks, connections };
}
