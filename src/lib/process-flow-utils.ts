
import { type Andamento, type ProcessedAndamento, type Connection, type ProcessedFlowData } from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// SVG and layout constants
const NODE_RADIUS = 18; 
const HORIZONTAL_SPACING_BASE = 130; 
const VERTICAL_LANE_SPACING = 100;  
const INITIAL_X_OFFSET = 200; // Increased to give more space for lane labels on the left
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
  // Add more from theme if needed, or fallback colors
  'hsl(240 5.9% 10%)', // dark gray as fallback
  'hsl(0 0% 63%)',     // medium gray as fallback
];


export function parseCustomDateString(dateString: string): Date {
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart || !timePart) {
    console.warn('Invalid date string format:', dateString);
    return new Date(); // Fallback to current date
  }
  const dateComponents = datePart.split('/').map(Number);
  const timeComponents = timePart.split(':').map(Number);

  if (dateComponents.length !== 3 || timeComponents.length !== 3 || 
      dateComponents.some(isNaN) || timeComponents.some(isNaN)) {
    console.warn('Invalid date or time components in:', dateString);
    return new Date(); // Fallback
  }
  const [day, month, year] = dateComponents;
  const [hours, minutes, seconds] = timeComponents;
  
  // Validate year to prevent issues with excessively large/small years if data is odd
  if (year < 1000 || year > 3000) {
    console.warn('Year out of reasonable range:', year, 'in date string:', dateString);
    return new Date(); // Fallback
  }
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function formatDisplayDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "Data inválida";
  }
  return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }); // Added seconds for more precision
}

export function processAndamentos(andamentos: Andamento[]): ProcessedFlowData {
  const globallySortedAndamentos = [...andamentos] // Create a copy before sorting
    .map(andamento => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
    }))
    .sort((a, b) => {
      const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      // Secondary sort by IdAndamento for stable ordering of simultaneous events
      return a.IdAndamento.localeCompare(b.IdAndamento);
    });

  const laneMap = new Map<string, number>(); // Unidade.Sigla -> laneY
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
  
  const processedTasks: ProcessedAndamento[] = globallySortedAndamentos.map((andamento, index) => {
    const yPos = laneMap.get(andamento.Unidade.Sigla) || INITIAL_Y_OFFSET;
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE + NODE_RADIUS;
    
    return {
      ...andamento,
      globalSequence: index + 1, // This is now the true global sequence
      x: xPos,
      y: yPos,
      color: taskTypeColorMap.get(andamento.Tarefa) || 'hsl(var(--muted))',
      nodeRadius: NODE_RADIUS,
    };
  });

  const connections: Connection[] = [];
  for (let i = 0; i < processedTasks.length - 1; i++) {
    connections.push({
      sourceTask: processedTasks[i],
      targetTask: processedTasks[i + 1],
    });
  }

  let svgWidth = INITIAL_X_OFFSET; // Start with offset for labels
  if (processedTasks.length > 0) {
    const maxX = Math.max(...processedTasks.map(t => t.x));
    svgWidth = maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE / 2; // Add some padding
  } else {
    svgWidth = INITIAL_X_OFFSET * 2; // Default width if no tasks
  }
  
  const maxLaneY = laneMap.size > 0 ? Math.max(...Array.from(laneMap.values())) : INITIAL_Y_OFFSET;
  const svgHeight = maxLaneY + NODE_RADIUS + INITIAL_Y_OFFSET;


  return { tasks: processedTasks, connections, svgWidth, svgHeight, laneMap };
}
