
import { type Andamento, type ProcessedAndamento, type Connection, type ProcessedFlowData } from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// SVG and layout constants
const NODE_RADIUS = 18; 
const HORIZONTAL_SPACING_BASE = 90; 
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
      originalIndexInInput: index, // Preserve original index if needed later
    }))
    .sort((a, b) => {
      const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      // Secondary sort by IdAndamento for stable ordering if timestamps are identical
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
  
  const processedTasks: ProcessedAndamento[] = globallySortedAndamentos.map((andamento, globalIndex) => {
    const yPos = laneMap.get(andamento.Unidade.Sigla) || INITIAL_Y_OFFSET;
    // Assign X position based on global chronological sequence
    const xPos = INITIAL_X_OFFSET + globalIndex * HORIZONTAL_SPACING_BASE + NODE_RADIUS;
    
    return {
      ...andamento,
      globalSequence: globalIndex + 1, // Global sequence starts from 1
      x: xPos,
      y: yPos,
      color: taskTypeColorMap.get(andamento.Tarefa) || 'hsl(var(--muted))',
      nodeRadius: NODE_RADIUS,
    };
  });

  const connections: Connection[] = [];
  const processedTasksWithOriginalIndex = processedTasks.map((task, index) => ({ ...task, chronologicalIndex: index }));

  for (let i = 0; i < processedTasksWithOriginalIndex.length; i++) {
    const sourceTask = processedTasksWithOriginalIndex[i];

    if (sourceTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const targetUnitAttr = sourceTask.Atributos?.find(attr => attr.Nome === 'UNIDADE');
      if (targetUnitAttr?.IdOrigem) {
        const targetUnitId = targetUnitAttr.IdOrigem;
        // Find the first subsequent task in the target unit, using chronologicalIndex for searching forward
        let foundTarget = false;
        for (let j = sourceTask.chronologicalIndex + 1; j < processedTasksWithOriginalIndex.length; j++) {
          const potentialTarget = processedTasksWithOriginalIndex[j];
          if (potentialTarget.Unidade.IdUnidade === targetUnitId) {
            connections.push({ sourceTask, targetTask: potentialTarget });
            foundTarget = true;
            break; 
          }
        }
        // if (!foundTarget) { console.warn(`No target found for remetido ${sourceTask.IdAndamento} to unit ${targetUnitId}`); }
      }
    } else {
      // Not a "PROCESSO-REMETIDO-UNIDADE" task
      // Connect to immediate chronological successor if it exists and is in the same unit
      if (i + 1 < processedTasksWithOriginalIndex.length) {
        const nextTask = processedTasksWithOriginalIndex[i+1];
        if (sourceTask.Unidade.IdUnidade === nextTask.Unidade.IdUnidade) {
          connections.push({ sourceTask, targetTask: nextTask });
        }
      }
    }
  }

  let svgWidth = INITIAL_X_OFFSET; 
  if (processedTasks.length > 0) {
    const maxX = Math.max(...processedTasks.map(t => t.x));
    svgWidth = maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE / 2; 
  } else {
    svgWidth = INITIAL_X_OFFSET * 2; 
  }
  
  const maxLaneY = laneMap.size > 0 ? Math.max(...Array.from(laneMap.values())) : INITIAL_Y_OFFSET;
  const svgHeight = maxLaneY + NODE_RADIUS + INITIAL_Y_OFFSET;

  return { tasks: processedTasks, connections, svgWidth, svgHeight, laneMap };
}
