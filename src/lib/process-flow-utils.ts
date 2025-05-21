
import { type Andamento, type ProcessedAndamento, type Connection, type ProcessedFlowData, type Atributo } from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// SVG and layout constants
const NODE_RADIUS = 18; 
const HORIZONTAL_SPACING_BASE = 70; 
const VERTICAL_LANE_SPACING = 100;  
const INITIAL_X_OFFSET = 200; 
const INITIAL_Y_OFFSET = 60; 

// Color palette for task types
const TASK_TYPE_COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))',   
  'hsl(var(--chart-3))',   
  'hsl(var(--chart-4))',    
  'hsl(var(--chart-5))',   
  'hsl(var(--primary))', 
  'hsl(var(--accent))',
  'hsl(240 5.9% 10%)', 
  'hsl(0 0% 63%)',     
  'hsl(var(--destructive))',
  'hsl(48 96% 50%)', // Amarelo
  'hsl(180 70% 50%)', // Ciano
  'hsl(300 70% 60%)', // Magenta
  'hsl(270 60% 70%)', // Roxo claro
  'hsl(120 40% 60%)', // Verde suave
];


export function parseCustomDateString(dateString: string): Date {
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart || !timePart) {
    console.warn('Invalid date string format:', dateString);
    return new Date(); 
  }
  const dateComponents = datePart.split('/').map(Number);
  const timeComponents = timePart.split(':').map(Number);

  if (dateComponents.length !== 3 || timeComponents.length !== 3 || 
      dateComponents.some(isNaN) || timeComponents.some(isNaN)) {
    console.warn('Invalid date or time components in:', dateString);
    return new Date(); 
  }
  const [day, month, year] = dateComponents;
  const [hours, minutes, seconds] = timeComponents;
  
  if (year < 1000 || year > 3000) {
    console.warn('Year out of reasonable range:', year, 'in date string:', dateString);
    return new Date(); 
  }
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function formatDisplayDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Data inválida";
  }
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
      const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return a.IdAndamento.localeCompare(b.IdAndamento); 
    });

  const laneMap = new Map<string, number>(); 
  const taskTypeColorMap = new Map<string, string>();
  let laneCount = 0;
  let taskTypeColorIndex = 0;

  globallySortedAndamentos.forEach(andamento => {
    if (!laneMap.has(andamento.Unidade.Sigla)) {
      laneMap.set(andamento.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
    if (!taskTypeColorMap.has(andamento.Tarefa)) {
      taskTypeColorMap.set(andamento.Tarefa, TASK_TYPE_COLORS[taskTypeColorIndex % TASK_TYPE_COLORS.length]);
      taskTypeColorIndex++;
    }
  });
  
  const processedTasksWithChronologicalIndex: ProcessedAndamento[] = globallySortedAndamentos.map((andamento, globalIndex) => {
    const yPos = laneMap.get(andamento.Unidade.Sigla) || INITIAL_Y_OFFSET;
    // X position is primarily based on chronological order.
    const xPos = INITIAL_X_OFFSET + globalIndex * HORIZONTAL_SPACING_BASE + NODE_RADIUS;
    
    return {
      ...andamento,
      globalSequence: globalIndex + 1,
      x: xPos,
      y: yPos,
      color: taskTypeColorMap.get(andamento.Tarefa) || 'hsl(var(--muted))',
      nodeRadius: NODE_RADIUS,
      chronologicalIndex: globalIndex, 
    };
  });

  const connections: Connection[] = [];

  // Build connections based on refined logic
  for (let i = 1; i < processedTasksWithChronologicalIndex.length; i++) {
    const currentTask = processedTasksWithChronologicalIndex[i];
    const prevTask = processedTasksWithChronologicalIndex[i - 1];

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE' && currentTask.Atributos) {
      const originUnitAttr = currentTask.Atributos.find(attr => attr.Nome === 'UNIDADE');
      if (originUnitAttr && originUnitAttr.IdOrigem === prevTask.Unidade.IdUnidade) {
        // This is a handoff: prevTask (in origin unit) connects to currentTask (remessa event, in target unit's lane)
        connections.push({ sourceTask: prevTask, targetTask: currentTask });
      } else if (prevTask.Unidade.IdUnidade === currentTask.Unidade.IdUnidade) {
        // Fallback: if not a clear handoff based on attribute, but same unit, connect sequentially.
        // This might happen if data is slightly different or for other remessa-like events.
        connections.push({ sourceTask: prevTask, targetTask: currentTask });
      }
      // If neither of the above, no direct connection is made from prevTask to this remessa task.
      // Another task might connect to it if it's the next chronological step for *that* task.
    } else if (prevTask.Unidade.IdUnidade === currentTask.Unidade.IdUnidade) {
      // Standard sequential flow within the same unit
      connections.push({ sourceTask: prevTask, targetTask: currentTask });
    }
    // If units are different and it's not a "PROCESSO-REMETIDO-UNIDADE" linking them via attribute,
    // no direct connection is made here. The Git-flow style implies explicit branches/merges.
  }
  
  let svgWidth = INITIAL_X_OFFSET; 
  if (processedTasksWithChronologicalIndex.length > 0) {
    const maxX = Math.max(...processedTasksWithChronologicalIndex.map(t => t.x));
    svgWidth = maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE / 2; 
  } else {
    svgWidth = INITIAL_X_OFFSET * 2; 
  }
  
  const maxLaneY = laneMap.size > 0 ? Math.max(...Array.from(laneMap.values())) : INITIAL_Y_OFFSET;
  const svgHeight = maxLaneY + NODE_RADIUS + INITIAL_Y_OFFSET; // Add padding at the bottom

  return { 
    tasks: processedTasksWithChronologicalIndex, 
    connections, 
    svgWidth, 
    svgHeight, 
    laneMap 
  };
}

