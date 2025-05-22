
import {
  type Andamento,
  type ProcessedAndamento,
  type Connection,
  type ProcessedFlowData,
} from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NODE_RADIUS = 18;
const HORIZONTAL_SPACING_BASE = 60; // Reduced for compactness
const VERTICAL_LANE_SPACING = 100;
const INITIAL_X_OFFSET = 200; // Increased to give lane labels more space
const INITIAL_Y_OFFSET = 60;

// Enhanced color palette for better visual distinction by TaskType
const TASK_TYPE_COLORS = [
  'hsl(var(--chart-1))', // Soft Blue
  'hsl(var(--chart-2))', // Pale Green
  'hsl(var(--chart-3))', // Muted Blue/Gray
  'hsl(var(--chart-4))', // Tealish
  'hsl(var(--chart-5))', // Lavender
  'hsl(var(--primary))', // Primary theme color (another blue)
  'hsl(var(--accent))',  // Accent theme color (another green)
  'hsl(25, 85%, 55%)',   // Orange
  'hsl(300, 70%, 60%)',  // Purple
  'hsl(0, 75%, 60%)',    // Red (distinct from destructive)
  'hsl(60, 70%, 45%)',   // Dark Yellow / Olive
  'hsl(180, 50%, 50%)',  // Cyan
  'hsl(330, 65%, 65%)',  // Pink
  'hsl(200, 60%, 55%)',  // Steel Blue
  'hsl(90, 50%, 55%)',   // Lime Green
];


export function parseCustomDateString(dateString: string): Date {
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart || !timePart) return new Date(); // Fallback for invalid format
  const [day, month, year] = datePart.split('/').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  if ([day, month, year, hours, minutes, seconds].some(isNaN)) return new Date(); // Fallback
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function formatDisplayDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Data inválida';
  return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

export function processAndamentos(andamentos: Andamento[]): ProcessedFlowData {
  // Sort andamentos chronologically (ascending by date, then by ID for tie-breaking)
  const globallySortedAndamentos = [...andamentos]
    .map((andamento, index) => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
      originalIndexInInput: index, // Keep original index if needed later
    }))
    .sort((a, b) => {
      const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.IdAndamento.localeCompare(b.IdAndamento); // Secondary sort for stability
    });

  const laneMap = new Map<string, number>(); // Unidade.Sigla -> Y-coordinate
  const taskTypeColorMap = new Map<string, string>(); // Tarefa -> color
  let laneCount = 0;
  let colorIdx = 0;

  // Determine Y positions for lanes and colors for task types
  globallySortedAndamentos.forEach(a => {
    if (!laneMap.has(a.Unidade.Sigla)) {
      laneMap.set(a.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
    if (!taskTypeColorMap.has(a.Tarefa)) {
      taskTypeColorMap.set(a.Tarefa, TASK_TYPE_COLORS[colorIdx % TASK_TYPE_COLORS.length]);
      colorIdx++;
    }
  });

  // Process tasks to assign coordinates and other properties
  const processedTasks: ProcessedAndamento[] = globallySortedAndamentos.map((a, index) => {
    const yPos = laneMap.get(a.Unidade.Sigla) ?? INITIAL_Y_OFFSET; // Fallback Y
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE + NODE_RADIUS;
    return {
      ...a,
      globalSequence: index + 1,
      x: xPos,
      y: yPos,
      color: taskTypeColorMap.get(a.Tarefa) || 'hsl(var(--muted))',
      nodeRadius: NODE_RADIUS,
      chronologicalIndex: index,
    };
  });

  const connections: Connection[] = [];
  const latestTaskInLane = new Map<string, ProcessedAndamento>(); // UnitID -> Last ProcessedAndamento in that lane

  for (const currentTask of processedTasks) {
    const performingUnitId = currentTask.Unidade.IdUnidade; // This is the unit where the task node is placed

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const senderUnitAttr = currentTask.Atributos?.find(a => a.Nome === "UNIDADE");
      const senderUnitId = senderUnitAttr?.IdOrigem; // Actual SENDER unit ID

      if (senderUnitId) {
        const lastActionInSenderLane = latestTaskInLane.get(senderUnitId);
        if (lastActionInSenderLane) {
          // Connect from the SENDER's last action to this REMIT action.
          // The REMIT action node (currentTask) is in the TARGET's lane.
          connections.push({ sourceTask: lastActionInSenderLane, targetTask: currentTask });
        }
      }
      // This REMIT action becomes the latest in its (TARGET) lane.
      latestTaskInLane.set(performingUnitId, currentTask);

    } else {
      // For all other task types (including GERACAO-PROCEDIMENTO, CONCLUSAO, etc.)
      const lastActionInThisLane = latestTaskInLane.get(performingUnitId);
      if (lastActionInThisLane) {
        // If there was a previous task in this same lane, connect them.
        connections.push({ sourceTask: lastActionInThisLane, targetTask: currentTask });
      }
      // This current task becomes the latest in its lane.
      latestTaskInLane.set(performingUnitId, currentTask);
    }
  }
  
  const maxX = processedTasks.length > 0 ? Math.max(...processedTasks.map(t => t.x)) : INITIAL_X_OFFSET;
  const maxY = laneMap.size > 0 ? Math.max(...Array.from(laneMap.values())) : INITIAL_Y_OFFSET;

  return {
    tasks: processedTasks,
    connections,
    svgWidth: maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE, // Add more padding at the end
    svgHeight: maxY + NODE_RADIUS + VERTICAL_LANE_SPACING / 2, // Add some padding below last lane
    laneMap,
  };
}
