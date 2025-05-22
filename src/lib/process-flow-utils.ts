
import {
  type Andamento,
  type ProcessedAndamento,
  type Connection,
  type ProcessoData,
} from '@/types/process-flow';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NODE_RADIUS = 18;
const HORIZONTAL_SPACING_BASE = 70; // Increased for more space
export const VERTICAL_LANE_SPACING = 100;
// INITIAL_X_OFFSET is the padding for the first node *within the SVG drawing area*
// The lane labels will be outside this SVG area.
export const INITIAL_X_OFFSET = NODE_RADIUS + 30; // e.g., 18 + 30 = 48px from SVG left edge
export const INITIAL_Y_OFFSET = VERTICAL_LANE_SPACING / 2; // Center of the first lane

const SYMBOLIC_TASK_COLORS: Record<string, string> = {
  'CONCLUSAO-PROCESSO-UNIDADE': 'hsl(120, 60%, 45%)',     // Verde
  'CONCLUSAO-AUTOMATICA-UNIDADE': 'hsl(120, 60%, 70%)', // Verde claro
  'PROCESSO-REMETIDO-UNIDADE': 'hsl(30, 35%, 40%)',      // Marrom
  'PROCESSO-RECEBIDO-UNIDADE': 'hsl(210, 70%, 55%)',     // Azul
  'REABERTURA-PROCESSO-UNIDADE': 'hsl(270, 50%, 60%)',   // Roxo
  'GERACAO-PROCEDIMENTO': 'hsl(30, 80%, 55%)',          // Laranja
  // Default for other actions:
};
const DEFAULT_TASK_COLOR = 'hsl(var(--muted))';         // Cinza (usado se TaskType não estiver em SYMBOLIC_TASK_COLORS)
const OPEN_END_NODE_COLOR = 'hsl(var(--destructive))';  // Vermelho

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

interface ProcessedFlowData {
  tasks: ProcessedAndamento[];
  connections: Connection[];
  svgWidth: number;
  svgHeight: number;
  laneMap: Map<string, number>;
}

export function processAndamentos(andamentosInput: Andamento[]): ProcessedFlowData {
  if (!andamentosInput || andamentosInput.length === 0) {
    return {
      tasks: [],
      connections: [],
      svgWidth: INITIAL_X_OFFSET * 2,
      svgHeight: INITIAL_Y_OFFSET * 2,
      laneMap: new Map(),
    };
  }

  const globallySortedAndamentos = [...andamentosInput]
    .map((andamento, index) => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
      originalIndexInInput: index, 
    }))
    .sort((a, b) => {
      const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.IdAndamento.localeCompare(b.IdAndamento); // Stable sort for same timestamp
    });

  const laneMap = new Map<string, number>();
  let laneCount = 0;

  globallySortedAndamentos.forEach(a => {
    if (!laneMap.has(a.Unidade.Sigla)) {
      laneMap.set(a.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
  });
  
  const latestTaskDetailsByUnit = new Map<string, { IdAndamento: string; Tarefa: string; parsedDate: Date }>();
  for (const andamento of globallySortedAndamentos) {
      latestTaskDetailsByUnit.set(andamento.Unidade.IdUnidade, { 
        IdAndamento: andamento.IdAndamento, 
        Tarefa: andamento.Tarefa,
        parsedDate: andamento.parsedDate 
      });
  }
  
  const currentDate = new Date();

  const processedTasks: ProcessedAndamento[] = globallySortedAndamentos.map((a, index) => {
    const yPos = laneMap.get(a.Unidade.Sigla) ?? INITIAL_Y_OFFSET;
    // X position is now based on global sequence for chronological layout
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE;
    
    let taskColor = SYMBOLIC_TASK_COLORS[a.Tarefa] || DEFAULT_TASK_COLOR;
    let daysOpen: number | undefined = undefined;

    const latestInUnit = latestTaskDetailsByUnit.get(a.Unidade.IdUnidade);
    if (latestInUnit && latestInUnit.IdAndamento === a.IdAndamento) {
        if (a.Tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE' &&
            a.Tarefa !== 'CONCLUSAO-AUTOMATICA-UNIDADE' &&
            a.Tarefa !== 'PROCESSO-REMETIDO-UNIDADE') { // Check if it's an open end
            taskColor = OPEN_END_NODE_COLOR;
            daysOpen = differenceInDays(currentDate, a.parsedDate);
        }
    }

    return {
      ...a,
      globalSequence: index + 1,
      x: xPos,
      y: yPos,
      color: taskColor,
      nodeRadius: NODE_RADIUS,
      chronologicalIndex: index,
      daysOpen: daysOpen,
    };
  });

  const connections: Connection[] = [];
  const latestTaskInLane = new Map<string, ProcessedAndamento>(); // Key: UnitID, Value: Latest task in that unit's lane

  for (let i = 0; i < processedTasks.length; i++) {
    const currentTask = processedTasks[i];
    const performingUnitId = currentTask.Unidade.IdUnidade; // The unit where this task node is placed

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const senderUnitAttr = currentTask.Atributos?.find(attr => attr.Nome === "UNIDADE");
      const senderUnitId = senderUnitAttr?.IdOrigem; // This is the IdUnidade of the SENDER unit

      if (senderUnitId) {
        const lastActionInSenderLane = latestTaskInLane.get(senderUnitId);
        if (lastActionInSenderLane) {
          // Connect from the sender's last task to this remittance task (which is in the target's lane)
          connections.push({ sourceTask: lastActionInSenderLane, targetTask: currentTask });
        }
      }
      // This remittance task becomes the latest in ITS OWN (target) lane
      latestTaskInLane.set(performingUnitId, currentTask);

    } else {
      // For other tasks, connect from the latest task in the *same* lane (performing unit)
      const lastActionInThisLane = latestTaskInLane.get(performingUnitId);
      if (lastActionInThisLane && lastActionInThisLane.globalSequence < currentTask.globalSequence) {
         connections.push({ sourceTask: lastActionInThisLane, targetTask: currentTask });
      }
      latestTaskInLane.set(performingUnitId, currentTask);
    }
  }
  
  const maxX = processedTasks.length > 0 ? Math.max(...processedTasks.map(t => t.x)) : INITIAL_X_OFFSET;
  // The svgHeight needs to accommodate all lanes
  const calculatedSvgHeight = (laneMap.size || 1) * VERTICAL_LANE_SPACING + INITIAL_Y_OFFSET;


  return {
    tasks: processedTasks,
    connections,
    svgWidth: maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE, 
    svgHeight: Math.max(calculatedSvgHeight, INITIAL_Y_OFFSET * 2),
    laneMap,
  };
}
