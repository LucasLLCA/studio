
import { type Andamento, type ProcessedAndamento, type Connection, type ProcessedFlowData } from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// SVG and layout constants
const NODE_RADIUS = 18; // Aumentado para melhor visibilidade
const HORIZONTAL_SPACING_BASE = 130; // Aumentado para mais espaço horizontal
const VERTICAL_LANE_SPACING = 100;  // Aumentado para mais espaço vertical entre raias
const INITIAL_X_OFFSET = 60; // Ajustado para novo espaçamento
const INITIAL_Y_OFFSET = 60; // Ajustado para novo espaçamento

// Cores mais nítidas e distintas do tema
const UNIT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(207 86% 50%)', // Um azul mais forte se necessário
  'hsl(125 37% 50%)', // Um verde mais forte se necessário
];


export function parseCustomDateString(dateString: string): Date {
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart || !timePart) {
    console.warn('Invalid date string format:', dateString);
    return new Date();
  }
  const dateComponents = datePart.split('/').map(Number);
  const timeComponents = timePart.split(':').map(Number);

  if (dateComponents.length !== 3 || timeComponents.length !== 3) {
    console.warn('Invalid date or time components in:', dateString);
    return new Date();
  }
  const [day, month, year] = dateComponents;
  const [hours, minutes, seconds] = timeComponents;
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function formatDisplayDate(date: Date): string {
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function processAndamentos(andamentos: Andamento[]): ProcessedFlowData {
  const globallySortedAndamentos = andamentos
    .map(andamento => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
    }))
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  const laneMap = new Map<string, number>(); // Unidade.Sigla -> laneY
  const unitColorMap = new Map<string, string>();
  let laneCount = 0;
  let colorIndex = 0;

  // Assign Y positions (lanes) to Unidades
  globallySortedAndamentos.forEach(andamento => {
    if (!laneMap.has(andamento.Unidade.Sigla)) {
      laneMap.set(andamento.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
    if (!unitColorMap.has(andamento.Unidade.Sigla)) {
      unitColorMap.set(andamento.Unidade.Sigla, UNIT_COLORS[colorIndex % UNIT_COLORS.length]);
      colorIndex++;
    }
  });
  
  const processedTasks: ProcessedAndamento[] = globallySortedAndamentos.map((andamento, index) => {
    const yPos = laneMap.get(andamento.Unidade.Sigla) || INITIAL_Y_OFFSET;
    // X position increases with global sequence.
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE + NODE_RADIUS;
    
    return {
      ...andamento,
      globalSequence: index + 1,
      x: xPos,
      y: yPos,
      color: unitColorMap.get(andamento.Unidade.Sigla) || 'hsl(var(--muted))',
      nodeRadius: NODE_RADIUS, // Passar o raio para o objeto da tarefa
    };
  });

  const connections: Connection[] = [];
  for (let i = 0; i < processedTasks.length - 1; i++) {
    connections.push({
      sourceTask: processedTasks[i],
      targetTask: processedTasks[i + 1],
    });
  }

  let svgWidth = 0;
  let svgHeight = 0;

  if (processedTasks.length > 0) {
    const maxX = Math.max(...processedTasks.map(t => t.x));
    const maxY = Math.max(...processedTasks.map(t => t.y));
    svgWidth = maxX + NODE_RADIUS + INITIAL_X_OFFSET; // Add padding
    svgHeight = maxY + NODE_RADIUS + INITIAL_Y_OFFSET; // Add padding
  } else {
    svgWidth = 2 * INITIAL_X_OFFSET;
    svgHeight = 2 * INITIAL_Y_OFFSET;
  }
  
  // Ensure minimum height for all lanes to be visible even if last task is not in the lowest lane
  const maxLaneY = Math.max(...Array.from(laneMap.values()), INITIAL_Y_OFFSET);
  svgHeight = Math.max(svgHeight, maxLaneY + NODE_RADIUS + INITIAL_Y_OFFSET);


  return { tasks: processedTasks, connections, svgWidth, svgHeight, laneMap };
}

