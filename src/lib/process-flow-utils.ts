import { type Andamento, type ProcessedAndamento } from '@/types/process-flow';
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

export function processAndamentos(andamentos: Andamento[]): ProcessedAndamento[] {
  return andamentos
    .map(andamento => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
    }))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()) // Sort chronologically (oldest first)
    .map((andamento, index) => ({
      ...andamento,
      globalSequence: index + 1,
    }));
}
