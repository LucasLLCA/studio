
import {
  type Andamento,
  type ProcessedAndamento,
  type Connection,
  type ProcessoData,
} from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NODE_RADIUS = 18;
const HORIZONTAL_SPACING_BASE = 50; 
const VERTICAL_LANE_SPACING = 100;
const INITIAL_X_OFFSET = 200; 
const INITIAL_Y_OFFSET = 60;

// Cores simbólicas para tipos de tarefa
const SYMBOLIC_TASK_COLORS: Record<string, string> = {
  'CONCLUSAO-PROCESSO-UNIDADE': 'hsl(120, 60%, 45%)', // Verde
  'CONCLUSAO-AUTOMATICA-UNIDADE': 'hsl(120, 60%, 70%)', // Verde claro
  'PROCESSO-REMETIDO-UNIDADE': 'hsl(30, 35%, 40%)', // Marrom
  'PROCESSO-RECEBIDO-UNIDADE': 'hsl(210, 70%, 55%)', // Azul
  'REABERTURA-PROCESSO-UNIDADE': 'hsl(270, 50%, 60%)', // Roxo
  'GERACAO-PROCEDIMENTO': 'hsl(30, 80%, 55%)', // Laranja
  // Adicione outros mapeamentos específicos conforme necessário
};
const DEFAULT_TASK_COLOR = 'hsl(var(--muted))'; // Cinza para demais ações

export function parseCustomDateString(dateString: string): Date {
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart || !timePart) return new Date(); 
  const [day, month, year] = datePart.split('/').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  if ([day, month, year, hours, minutes, seconds].some(isNaN)) return new Date(); 
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function formatDisplayDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Data inválida';
  return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

export function processAndamentos(andamentos: Andamento[]): ProcessedFlowData {
  const globallySortedAndamentos = [...andamentos]
    .map((andamento, index) => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
      originalIndexInInput: index,
    }))
    .sort((a, b) => {
      const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.IdAndamento.localeCompare(b.IdAndamento);
    });

  const laneMap = new Map<string, number>();
  let laneCount = 0;

  globallySortedAndamentos.forEach(a => {
    if (!laneMap.has(a.Unidade.Sigla)) {
      laneMap.set(a.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
  });

  const processedTasks: ProcessedAndamento[] = globallySortedAndamentos.map((a, index) => {
    const yPos = laneMap.get(a.Unidade.Sigla) ?? INITIAL_Y_OFFSET;
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE + NODE_RADIUS;
    const taskColor = SYMBOLIC_TASK_COLORS[a.Tarefa] || DEFAULT_TASK_COLOR;

    return {
      ...a,
      globalSequence: index + 1,
      x: xPos,
      y: yPos,
      color: taskColor,
      nodeRadius: NODE_RADIUS,
      chronologicalIndex: index,
    };
  });

  const connections: Connection[] = [];
  const latestTaskInLane = new Map<string, ProcessedAndamento>();

  for (const currentTask of processedTasks) {
    const performingUnitId = currentTask.Unidade.IdUnidade;

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const senderUnitAttr = currentTask.Atributos?.find(attr => attr.Nome === "UNIDADE");
      const senderUnitId = senderUnitAttr?.IdOrigem;

      if (senderUnitId) {
        const lastActionInSenderLane = latestTaskInLane.get(senderUnitId);
        if (lastActionInSenderLane) {
          connections.push({ sourceTask: lastActionInSenderLane, targetTask: currentTask });
        }
      }
      latestTaskInLane.set(performingUnitId, currentTask); 
    } else {
      const lastActionInThisLane = latestTaskInLane.get(performingUnitId);
      if (lastActionInThisLane) {
         connections.push({ sourceTask: lastActionInThisLane, targetTask: currentTask });
      }
      latestTaskInLane.set(performingUnitId, currentTask);
    }
  }
  
  const maxX = processedTasks.length > 0 ? Math.max(...processedTasks.map(t => t.x)) : INITIAL_X_OFFSET;
  const maxY = laneMap.size > 0 ? Math.max(...Array.from(laneMap.values())) : INITIAL_Y_OFFSET;

  return {
    tasks: processedTasks,
    connections,
    svgWidth: maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE,
    svgHeight: maxY + NODE_RADIUS + VERTICAL_LANE_SPACING / 2,
    laneMap,
  };
}
