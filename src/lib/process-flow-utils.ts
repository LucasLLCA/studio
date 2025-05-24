
import {
  type Andamento,
  type ProcessedAndamento,
  type Connection,
  // type ProcessoData, // No longer directly used here, ProcessoData handled by page
} from '@/types/process-flow';
import { format, differenceInDays } from 'date-fns';
// import { ptBR } from 'date-fns/locale'; // Not used

export const NODE_RADIUS = 16; // Slightly smaller for a more compact view
const HORIZONTAL_SPACING_BASE = 50; // Reduced for compactness
export const VERTICAL_LANE_SPACING = 90; // Reduced
export const INITIAL_X_OFFSET = NODE_RADIUS + 20; 
export const INITIAL_Y_OFFSET = VERTICAL_LANE_SPACING / 2; 

// Symbolic task colors
export const SYMBOLIC_TASK_COLORS: Record<string, string> = {
  'CONCLUSAO-PROCESSO-UNIDADE': 'hsl(120, 60%, 45%)',     // Verde
  'CONCLUSAO-AUTOMATICA-UNIDADE': 'hsl(120, 60%, 70%)', // Verde claro
  'PROCESSO-REMETIDO-UNIDADE': 'hsl(30, 35%, 40%)',      // Marrom
  'PROCESSO-RECEBIDO-UNIDADE': 'hsl(210, 70%, 55%)',     // Azul
  'REABERTURA-PROCESSO-UNIDADE': 'hsl(270, 50%, 60%)',   // Roxo
  'GERACAO-PROCEDIMENTO': 'hsl(30, 80%, 55%)',          // Laranja
  'ACOES-DIVERSAS-AGRUPADAS': 'hsl(var(--muted))',       // Cinza para nós agrupados
  // Default/Outras Ações will also use DEFAULT_TASK_COLOR
};
const DEFAULT_TASK_COLOR = 'hsl(var(--muted))';         // Cinza
const OPEN_END_NODE_COLOR = 'hsl(var(--destructive))';  // Vermelho para pontas abertas

export const SIGNIFICANT_TASK_TYPES: string[] = [
  'GERACAO-PROCEDIMENTO',
  'PROCESSO-REMETIDO-UNIDADE',
  'PROCESSO-RECEBIDO-UNIDADE',
  'CONCLUSAO-PROCESSO-UNIDADE',
  'CONCLUSAO-AUTOMATICA-UNIDADE',
  'REABERTURA-PROCESSO-UNIDADE',
];


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
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); 
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function processAndamentos(
  andamentosInput: Andamento[], 
  numeroProcesso?: string,
  isSummarized: boolean = false
): ProcessedFlowData {

  if (!andamentosInput || andamentosInput.length === 0) {
    return {
      tasks: [],
      connections: [],
      svgWidth: INITIAL_X_OFFSET * 2,
      svgHeight: INITIAL_Y_OFFSET * 2,
      laneMap: new Map(),
      processNumber: numeroProcesso,
    };
  }

  const globallySortedAndamentos = [...andamentosInput]
    .map((andamento, index) => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
      originalGlobalSequence: index + 1, // Keep original sequence for reference
    }))
    .sort((a, b) => {
      const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.IdAndamento.localeCompare(b.IdAndamento); // Secondary sort for stability
    });

  let displayableAndamentos: Andamento[] = [];

  if (isSummarized) {
    let i = 0;
    while (i < globallySortedAndamentos.length) {
      const currentOriginalAndamento = globallySortedAndamentos[i];
      const isCurrentAnOutraAcao = !SIGNIFICANT_TASK_TYPES.includes(currentOriginalAndamento.Tarefa);

      if (isCurrentAnOutraAcao) {
        const summaryGroup: Andamento[] = [];
        let j = i;
        // Collect consecutive "Outras Ações" in the same unit
        while (
          j < globallySortedAndamentos.length &&
          globallySortedAndamentos[j].Unidade.IdUnidade === currentOriginalAndamento.Unidade.IdUnidade &&
          !SIGNIFICANT_TASK_TYPES.includes(globallySortedAndamentos[j].Tarefa)
        ) {
          summaryGroup.push(globallySortedAndamentos[j]);
          j++;
        }

        if (summaryGroup.length > 1) {
          const firstInGroup = summaryGroup[0];
          const summaryNode: Andamento & { isSummaryNode?: boolean, groupedTasksCount?: number, originalTaskIds?: string[] } = {
            ...firstInGroup, // Base attributes from the first task
            IdAndamento: `${firstInGroup.IdAndamento}-summary-${i}`, // Ensure unique ID
            Tarefa: "ACOES-DIVERSAS-AGRUPADAS",
            Descricao: `[${summaryGroup.length}] ações diversas realizadas nesta unidade.`,
            isSummaryNode: true,
            groupedTasksCount: summaryGroup.length,
            originalTaskIds: summaryGroup.map(t => t.IdAndamento),
            // Retain Atributos from the first task, or clear/summarize as needed. For now, keep first.
            Atributos: firstInGroup.Atributos, 
          };
          displayableAndamentos.push(summaryNode as Andamento);
          i = j; // Move main iterator past the summarized group
        } else {
          // Single "Outra Ação", add it as is
          displayableAndamentos.push(currentOriginalAndamento);
          i++;
        }
      } else {
        // Significant task, add it as is
        displayableAndamentos.push(currentOriginalAndamento);
        i++;
      }
    }
  } else {
    displayableAndamentos = [...globallySortedAndamentos];
  }
  
  const laneMap = new Map<string, number>();
  let laneCount = 0;

  displayableAndamentos.forEach(a => {
    if (!laneMap.has(a.Unidade.Sigla)) {
      laneMap.set(a.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
  });
  
  // Determine the latest task in each unit from the *original* full list for accurate "open end" detection
  const latestOriginalTaskDetailsByUnit = new Map<string, { IdAndamento: string; Tarefa: string; parsedDate: Date }>();
  for (const andamento of globallySortedAndamentos) { // Use original sorted list here
      latestOriginalTaskDetailsByUnit.set(andamento.Unidade.IdUnidade, { 
        IdAndamento: andamento.IdAndamento, 
        Tarefa: andamento.Tarefa,
        parsedDate: andamento.parsedDate 
      });
  }
  
  const currentDate = new Date();

  const processedTasks: ProcessedAndamento[] = displayableAndamentos.map((a, index) => {
    const yPos = laneMap.get(a.Unidade.Sigla) ?? INITIAL_Y_OFFSET;
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE;
    
    let taskColor = SYMBOLIC_TASK_COLORS[a.Tarefa] || DEFAULT_TASK_COLOR;
    let daysOpen: number | undefined = undefined;

    // For "open end" detection, refer to the latest *original* task in the unit
    const latestOriginalInUnit = latestOriginalTaskDetailsByUnit.get(a.Unidade.IdUnidade);

    // An item in displayableAndamentos is an "open end" if it's the *representation* of the latest original task in its unit
    // AND that original task was not a concluding or remitting one.
    // If 'a' is a summary node, we check if its *last original task* was the latest in unit.
    const isEffectivelyLatestInUnit = (a as ProcessedAndamento).isSummaryNode ? 
      ((a as ProcessedAndamento).originalTaskIds?.includes(latestOriginalInUnit?.IdAndamento ?? "")) 
      : a.IdAndamento === latestOriginalInUnit?.IdAndamento;

    if (isEffectivelyLatestInUnit && latestOriginalInUnit) {
        if (latestOriginalInUnit.Tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE' &&
            latestOriginalInUnit.Tarefa !== 'CONCLUSAO-AUTOMATICA-UNIDADE' &&
            latestOriginalInUnit.Tarefa !== 'PROCESSO-REMETIDO-UNIDADE') {
            taskColor = OPEN_END_NODE_COLOR;
            // Days open should be calculated from the date of the actual latest original task
            daysOpen = differenceInDays(currentDate, latestOriginalInUnit.parsedDate);
        }
    }
    
    // Cast 'a' to include potential summary properties for type safety
    const castedA = a as Andamento & { isSummaryNode?: boolean; groupedTasksCount?: number; originalTaskIds?: string[], originalGlobalSequence?: number };

    return {
      ...castedA,
      parsedDate: castedA.parsedDate || parseCustomDateString(castedA.DataHora), // Ensure parsedDate
      globalSequence: index + 1, // This is the sequence in the (potentially summarized) displayed list
      originalGlobalSequence: castedA.originalGlobalSequence || index + 1, // Fallback if not present
      x: xPos,
      y: yPos,
      color: taskColor,
      nodeRadius: NODE_RADIUS,
      chronologicalIndex: globallySortedAndamentos.findIndex(ogA => ogA.IdAndamento === castedA.IdAndamento), // Find original index
      daysOpen: daysOpen,
      isSummaryNode: castedA.isSummaryNode ?? false,
      groupedTasksCount: castedA.groupedTasksCount,
      originalTaskIds: castedA.originalTaskIds,
    };
  });

  const connections: Connection[] = [];
  const latestTaskInLane = new Map<string, ProcessedAndamento>(); 

  for (let i = 0; i < processedTasks.length; i++) {
    const currentTask = processedTasks[i];
    const prevTask = i > 0 ? processedTasks[i-1] : null;

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const senderUnitAttribute = currentTask.Atributos?.find(attr => attr.Nome === "UNIDADE");
      const senderUnitId = senderUnitAttribute?.IdOrigem;

      if (senderUnitId) {
        const lastActionInSenderLane = latestTaskInLane.get(senderUnitId);
        if (lastActionInSenderLane) {
          connections.push({ sourceTask: lastActionInSenderLane, targetTask: currentTask });
        }
      }
      latestTaskInLane.set(currentTask.Unidade.IdUnidade, currentTask);
    } else if (prevTask) {
      // General case: connect if in the same unit, or if current task is a reception from previous unit's remittance
      // This simple connection logic might need refinement if PROCESSO-RECEBIDO needs special handling
      // For now, connect to previous if in same unit
      if (prevTask.Unidade.IdUnidade === currentTask.Unidade.IdUnidade) {
         connections.push({ sourceTask: prevTask, targetTask: currentTask });
      }
      latestTaskInLane.set(currentTask.Unidade.IdUnidade, currentTask);
    } else {
      // First task in the (displayable) list
      latestTaskInLane.set(currentTask.Unidade.IdUnidade, currentTask);
    }
  }
  
  const maxX = processedTasks.length > 0 ? Math.max(...processedTasks.map(t => t.x)) : INITIAL_X_OFFSET;
  const calculatedSvgHeight = (laneMap.size || 1) * VERTICAL_LANE_SPACING + INITIAL_Y_OFFSET;

  return {
    tasks: processedTasks,
    connections,
    svgWidth: maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE, 
    svgHeight: Math.max(calculatedSvgHeight, INITIAL_Y_OFFSET * 2),
    laneMap,
    processNumber: numeroProcesso,
  };
}
