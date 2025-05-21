
import { type Andamento, type ProcessedAndamento, type Connection, type ProcessedFlowData } from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// SVG and layout constants
const NODE_RADIUS = 18; // Aumentado para melhor visibilidade
const HORIZONTAL_SPACING_BASE = 130; // Aumentado para mais espaço horizontal
const VERTICAL_LANE_SPACING = 100;  // Aumentado para mais espaço vertical entre raias
const INITIAL_X_OFFSET = 300; // Ajustado para novo espaçamento e labels das raias
const INITIAL_Y_OFFSET = 60; // Ajustado para novo espaçamento

// Cores inspiradas na imagem de referência e no tema atual
// Prioriza o uso de variáveis de tema para consistência light/dark.
const UNIT_COLORS = [
  'hsl(var(--primary))',   // Azul principal (semelhante ao "Master" da imagem)
  'hsl(var(--chart-4))',   // Tema claro: Azulado / Tema escuro: Roxo (semelhante ao "Develop")
  'hsl(var(--chart-2))',   // Tema claro: Verde-azulado / Tema escuro: Verde (semelhante ao "Feature")
  'hsl(var(--accent))',    // Tema claro: Verde pálido / Tema escuro: Verde pálido (outra opção para "Feature")
  'hsl(var(--chart-3))',   // Tema claro: Azul suave / Tema escuro: Laranja (para variedade)
  'hsl(var(--chart-1))',   // Semelhante ao primário, outra opção de azul
  'hsl(var(--chart-5))',   // Tema claro: Esverdeado / Tema escuro: Rosado (para variedade)
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
    // X position increases with global sequence. ConsiderINITIAL_X_OFFSET for lane labels.
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
    // Consider the initial offset for lane labels when calculating width
    svgWidth = maxX + NODE_RADIUS + INITIAL_X_OFFSET / 2; // Add some padding
  } else {
    svgWidth = 2 * INITIAL_X_OFFSET;
  }
  
  // Ensure minimum height for all lanes to be visible
  const maxLaneY = Math.max(...Array.from(laneMap.values()), INITIAL_Y_OFFSET);
  svgHeight = maxLaneY + NODE_RADIUS + INITIAL_Y_OFFSET; // Add padding


  return { tasks: processedTasks, connections, svgWidth, svgHeight, laneMap };
}
