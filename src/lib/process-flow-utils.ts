
import {
  type Andamento,
  type ProcessedAndamento,
  type Connection,
  type UnidadeAberta,
} from '@/types/process-flow';
import { differenceInDays } from 'date-fns';

export const NODE_RADIUS = 18; 
const HORIZONTAL_SPACING_BASE = 60; 
export const VERTICAL_LANE_SPACING = 100;
export const INITIAL_X_OFFSET = NODE_RADIUS + 30; 
export const INITIAL_Y_OFFSET = VERTICAL_LANE_SPACING / 2; 

export const SYMBOLIC_TASK_COLORS: Record<string, string> = {
  'CONCLUSAO-PROCESSO-UNIDADE': 'hsl(120, 60%, 45%)',     // Verde
  'CONCLUSAO-AUTOMATICA-UNIDADE': 'hsl(120, 60%, 70%)', // Verde claro
  'PROCESSO-REMETIDO-UNIDADE': 'hsl(30, 35%, 40%)',      // Marrom
  'PROCESSO-RECEBIDO-UNIDADE': 'hsl(210, 70%, 55%)',     // Azul
  'REABERTURA-PROCESSO-UNIDADE': 'hsl(270, 50%, 60%)',   // Roxo
  'GERACAO-PROCEDIMENTO': 'hsl(30, 80%, 55%)',          // Laranja
  'ACOES-DIVERSAS-AGRUPADAS': 'hsl(var(--muted))',       // Cinza para nós agrupados
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

interface AndamentoInternal extends Andamento {
  parsedDate: Date;
  originalGlobalSequence: number; 
  trueChronologicalOrderIndex: number; 
  isSummaryNode?: boolean;
  groupedTasksCount?: number;
  originalTaskIds?: string[];
}

export function processAndamentos(
  andamentosInput: Andamento[], 
  openUnitsInProcess: UnidadeAberta[] | null,
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
  
  const globallySortedAndamentos: AndamentoInternal[] = [...andamentosInput]
    .map((andamento, index) => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
      originalGlobalSequence: index + 1, 
    }))
    .sort((a, b) => {
      const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.IdAndamento.localeCompare(b.IdAndamento); 
    })
    .map((andamento, sortedIndex) => ({
      ...andamento,
      trueChronologicalOrderIndex: sortedIndex,
    }));

  let displayableAndamentos_intermediate: AndamentoInternal[] = [];

  if (isSummarized) {
    let i = 0;
    while (i < globallySortedAndamentos.length) {
      const currentOriginalAndamento = globallySortedAndamentos[i];
      const isCurrentAnOutraAcao = !SIGNIFICANT_TASK_TYPES.includes(currentOriginalAndamento.Tarefa);

      if (isCurrentAnOutraAcao) {
        const summaryGroup: AndamentoInternal[] = [];
        let j = i;
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
          const summaryNode: AndamentoInternal = {
            ...firstInGroup, 
            IdAndamento: `${firstInGroup.IdAndamento}-summary-${i}`, 
            Tarefa: "ACOES-DIVERSAS-AGRUPADAS",
            Descricao: `[${summaryGroup.length}] ações diversas realizadas nesta unidade.`,
            isSummaryNode: true,
            groupedTasksCount: summaryGroup.length,
            originalTaskIds: summaryGroup.map(t => t.IdAndamento),
          };
          displayableAndamentos_intermediate.push(summaryNode);
          i = j; 
        } else {
          displayableAndamentos_intermediate.push(currentOriginalAndamento);
          i++;
        }
      } else {
        displayableAndamentos_intermediate.push(currentOriginalAndamento);
        i++;
      }
    }
  } else {
    displayableAndamentos_intermediate = [...globallySortedAndamentos];
  }
  
  const laneMap = new Map<string, number>();
  let laneCount = 0;

  displayableAndamentos_intermediate.forEach(a => {
    if (!laneMap.has(a.Unidade.Sigla)) {
      laneMap.set(a.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
  });
  
  const processedTasks: ProcessedAndamento[] = displayableAndamentos_intermediate.map((a, index) => {
    const yPos = laneMap.get(a.Unidade.Sigla) ?? INITIAL_Y_OFFSET;
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE;
    
    return {
      ...a,
      globalSequence: index + 1, 
      x: xPos,
      y: yPos,
      nodeRadius: NODE_RADIUS,
    } as ProcessedAndamento; 
  });
  
  const connections: Connection[] = [];
  const latestTaskInLane = new Map<string, ProcessedAndamento>(); 

  for (let i = 0; i < processedTasks.length; i++) {
    const currentTask = processedTasks[i];

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const senderUnitAttribute = currentTask.Atributos?.find(attr => attr.Nome === "UNIDADE");
      const senderUnitId = senderUnitAttribute?.IdOrigem;

      if (senderUnitId) {
        const lastActionInSenderLane = latestTaskInLane.get(senderUnitId);
        if (lastActionInSenderLane) {
           if (lastActionInSenderLane.IdAndamento !== currentTask.IdAndamento || lastActionInSenderLane.globalSequence !== currentTask.globalSequence) {
             connections.push({ sourceTask: lastActionInSenderLane, targetTask: currentTask });
          }
        }
      }
      latestTaskInLane.set(currentTask.Unidade.IdUnidade, currentTask);
    } else { 
      const lastActionInCurrentLane = latestTaskInLane.get(currentTask.Unidade.IdUnidade);
      if (lastActionInCurrentLane) { 
          if(lastActionInCurrentLane.IdAndamento !== currentTask.IdAndamento || lastActionInCurrentLane.globalSequence !== currentTask.globalSequence) {
             connections.push({ sourceTask: lastActionInCurrentLane, targetTask: currentTask });
          }
      }
      latestTaskInLane.set(currentTask.Unidade.IdUnidade, currentTask);
    }
  }

  const latestOriginalTaskDetailsByUnit = new Map<string, AndamentoInternal>();
  for (const andamento of globallySortedAndamentos) { 
      latestOriginalTaskDetailsByUnit.set(andamento.Unidade.IdUnidade, andamento);
  }
  const currentDate = new Date();
  const openUnitIdsFromApi = new Set(
    openUnitsInProcess?.map(u => u.Unidade.IdUnidade) || []
  );

  processedTasks.forEach(task => {
    let taskColor = SYMBOLIC_TASK_COLORS[task.Tarefa] || DEFAULT_TASK_COLOR;
    let daysOpen: number | undefined = undefined;

    const unitOfThisTask = task.Unidade.IdUnidade;

    if (openUnitIdsFromApi.has(unitOfThisTask)) {
      const latestOriginalInThisUnit = latestOriginalTaskDetailsByUnit.get(unitOfThisTask);

      if (latestOriginalInThisUnit) {
        let isEffectivelyTheLatestActionInUnit = false;
        if (task.isSummaryNode && task.originalTaskIds) {
          isEffectivelyTheLatestActionInUnit = task.originalTaskIds.includes(latestOriginalInThisUnit.IdAndamento);
        } else {
          isEffectivelyTheLatestActionInUnit = task.IdAndamento === latestOriginalInThisUnit.IdAndamento;
        }

        if (isEffectivelyTheLatestActionInUnit) {
          if (latestOriginalInThisUnit.Tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE' &&
              latestOriginalInThisUnit.Tarefa !== 'CONCLUSAO-AUTOMATICA-UNIDADE' &&
              latestOriginalInThisUnit.Tarefa !== 'PROCESSO-REMETIDO-UNIDADE') {
            taskColor = OPEN_END_NODE_COLOR;
            daysOpen = differenceInDays(currentDate, latestOriginalInThisUnit.parsedDate);
          }
        }
      }
    }
    
    task.color = taskColor;
    task.daysOpen = daysOpen;
  });
  
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

