
import {
  type Andamento,
  type ProcessedAndamento,
  type Connection,
  type UnidadeAberta,
  ProcessedFlowData,
} from '@/types/process-flow';
import { differenceInDays } from 'date-fns';

export const MARKER_COLORS = {
  unsignedOficio: { fill: 'hsl(var(--warning))', stroke: 'hsl(var(--warning-foreground))', text: 'hsl(var(--warning-foreground))' },
  signedOficio:   { fill: 'hsl(var(--success))', stroke: 'hsl(var(--success-foreground))' },
  document:       { fill: 'hsl(var(--warning))', stroke: '#000' },
  restricted:     { fill: '#94a3b8', stroke: '#64748b' },
} as const;

export const NODE_RADIUS = 18;
const HORIZONTAL_SPACING_BASE = 60; 
export const VERTICAL_LANE_SPACING = 100;
export const INITIAL_X_OFFSET = NODE_RADIUS + 30; 
export const INITIAL_Y_OFFSET = VERTICAL_LANE_SPACING / 2; 

export const SYMBOLIC_TASK_COLORS: Record<string, string> = {
  'GERACAO-PROCEDIMENTO': 'hsl(30, 80%, 55%)',          // Laranja - geração
  'REABERTURA-PROCESSO-UNIDADE': 'hsl(30, 80%, 55%)',   // Laranja - reabertura
  'CONCLUSAO-PROCESSO-UNIDADE': 'hsl(var(--success))',   // Verde - conclusão manual
  'CONCLUSAO-AUTOMATICA-UNIDADE': 'hsl(var(--success))', // Verde - conclusão automática
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

const AUTO_CONCLUSION_TASK_TYPE = 'CONCLUSAO-AUTOMATICA-UNIDADE';

const BLOCO_REF_RE = /\bbloco\s+(\d+)/i;
const DOC_REF_RE = /\bdocumento\s+(?:\w+\s+)*?(\d{6,})/i;

function extractReferenceId(descricao: string): string | null {
  const blocoMatch = descricao.match(BLOCO_REF_RE);
  if (blocoMatch) return `bloco:${blocoMatch[1]}`;
  const docMatch = descricao.match(DOC_REF_RE);
  if (docMatch) return `doc:${docMatch[1]}`;
  return null;
}

const getDateHourMinuteKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const buildAutoConclusionSummaryGroupKey = (andamento: AndamentoInternal): string => {
  const userKey = andamento.Usuario.IdUsuario || andamento.Usuario.Sigla || 'unknown-user';
  const unitKey = andamento.Unidade.IdUnidade;
  const dateHourMinuteKey = getDateHourMinuteKey(andamento.parsedDate);
  return `${userKey}|${unitKey}|${dateHourMinuteKey}`;
};


export function parseCustomDateString(dateString: string): Date {
  const [datePart, timePart] = dateString.split(' ');
  if (!datePart || !timePart) return new Date(); 
  const [day, month, year] = datePart.split('/').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  if ([day, month, year, hours, minutes, seconds].some(isNaN)) return new Date();
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

export function formatDisplayDate(date: Date, includeSeconds: boolean = true): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Data inválida';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (includeSeconds) {
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
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
  isSummarized: boolean = false,
  isPartialData: boolean = false
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
  
  const sorted = [...andamentosInput]
    .map((andamento, index) => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
      originalGlobalSequence: index + 1,
    }) as AndamentoInternal)
    .sort((a, b) => {
      const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (timeDiff !== 0) return timeDiff;
      // Same exact timestamp: enforce logical order for transfer events
      const priority = (tarefa: string) => {
        switch (tarefa) {
          case 'CONCLUSAO-AUTOMATICA-UNIDADE':
          case 'CONCLUSAO-PROCESSO-UNIDADE':
            return 0;
          case 'PROCESSO-REMETIDO-UNIDADE':
            return 1;
          case 'PROCESSO-RECEBIDO-UNIDADE':
            return 2;
          default:
            return 1;
        }
      };
      const pDiff = priority(a.Tarefa) - priority(b.Tarefa);
      if (pDiff !== 0) return pDiff;
      return a.IdAndamento.localeCompare(b.IdAndamento);
    });

  // Post-sort fixup: when a RECEBIDO appears before its matching
  // REMETIDO/CONCLUSÃO within 60s, move the earlier events before it.
  // This only reorders transfer events; regular events stay in place.
  const TRANSFER_TYPES = new Set([
    'CONCLUSAO-AUTOMATICA-UNIDADE',
    'CONCLUSAO-PROCESSO-UNIDADE',
    'PROCESSO-REMETIDO-UNIDADE',
    'PROCESSO-RECEBIDO-UNIDADE',
  ]);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].Tarefa !== 'PROCESSO-RECEBIDO-UNIDADE') continue;
    const recebidoTime = sorted[i].parsedDate.getTime();
    // Collect transfer events that follow within 60s and should precede recebido
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j];
      if (candidate.parsedDate.getTime() - recebidoTime > 60000) break;
      if (candidate.Tarefa === 'PROCESSO-REMETIDO-UNIDADE' ||
          candidate.Tarefa === 'CONCLUSAO-AUTOMATICA-UNIDADE' ||
          candidate.Tarefa === 'CONCLUSAO-PROCESSO-UNIDADE') {
        // Move this event before the recebido
        sorted.splice(j, 1);
        sorted.splice(i, 0, candidate);
        // Don't advance i — re-check from same position since we inserted
      }
    }
  }

  const globallySortedAndamentos: AndamentoInternal[] = sorted
    .map((andamento, sortedIndex) => ({
      ...andamento,
      trueChronologicalOrderIndex: sortedIndex,
    }));

  let displayableAndamentos_intermediate: AndamentoInternal[] = [];

  if (isSummarized) {
    const autoConclusionGroupsByKey = new Map<string, AndamentoInternal[]>();
    globallySortedAndamentos.forEach(andamento => {
      if (andamento.Tarefa !== AUTO_CONCLUSION_TASK_TYPE) return;
      const key = buildAutoConclusionSummaryGroupKey(andamento);
      const existingGroup = autoConclusionGroupsByKey.get(key) || [];
      existingGroup.push(andamento);
      autoConclusionGroupsByKey.set(key, existingGroup);
    });

    const groupedAutoConclusionsByAndamentoId = new Map<string, { firstId: string; tasks: AndamentoInternal[] }>();
    autoConclusionGroupsByKey.forEach(group => {
      if (group.length <= 1) return;

      const sortedGroup = [...group].sort(
        (a, b) => a.trueChronologicalOrderIndex - b.trueChronologicalOrderIndex
      );
      const firstId = sortedGroup[0].IdAndamento;
      sortedGroup.forEach(andamento => {
        groupedAutoConclusionsByAndamentoId.set(andamento.IdAndamento, {
          firstId,
          tasks: sortedGroup,
        });
      });
    });

    let i = 0;
    while (i < globallySortedAndamentos.length) {
      const currentOriginalAndamento = globallySortedAndamentos[i];
      const autoConclusionGroup = groupedAutoConclusionsByAndamentoId.get(currentOriginalAndamento.IdAndamento);

      if (autoConclusionGroup) {
        if (currentOriginalAndamento.IdAndamento === autoConclusionGroup.firstId) {
          const firstInGroup = autoConclusionGroup.tasks[0];
          const summaryNode: AndamentoInternal = {
            ...firstInGroup,
            IdAndamento: `${firstInGroup.IdAndamento}-auto-summary-${i}`,
            Descricao: `[${autoConclusionGroup.tasks.length}] conclusões automáticas realizadas nesta unidade na mesma data/hora.`,
            isSummaryNode: true,
            groupedTasksCount: autoConclusionGroup.tasks.length,
            originalTaskIds: autoConclusionGroup.tasks.map(t => t.IdAndamento),
          };
          displayableAndamentos_intermediate.push(summaryNode);
        }
        i++;
        continue;
      }

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

  // Collect units that formally participated in the flow (created, received, or reopened the processo).
  // Actions from other units (e.g. "Bloco retornado") are independent and should not have connections.
  const FLOW_ACTIVATION_TASKS = new Set([
    'GERACAO-PROCEDIMENTO',
    'PROCESSO-RECEBIDO-UNIDADE',
    'REABERTURA-PROCESSO-UNIDADE',
  ]);
  const activatedUnits = new Set<string>();
  for (const task of processedTasks) {
    if (FLOW_ACTIVATION_TASKS.has(task.Tarefa)) {
      activatedUnits.add(task.Unidade.IdUnidade);
    }
  }

  // Index: first task per bloco/document reference (for independent linking)
  const firstByRef = new Map<string, ProcessedAndamento>();
  for (const task of processedTasks) {
    const rawDesc = task.Descricao?.replace(/<[^>]*>/g, '') || '';
    const refId = extractReferenceId(rawDesc);
    if (refId && !firstByRef.has(refId)) {
      firstByRef.set(refId, task);
    }
  }

  // When showing partial data (first + last pages), find the gap boundary
  // so we don't draw misleading connections across the missing middle pages.
  const partialGap = isPartialData ? detectPartialDataGap(processedTasks) : null;

  for (let i = 0; i < processedTasks.length; i++) {
    const currentTask = processedTasks[i];

    // If we just crossed the partial-data gap, reset lane tracking
    // so no connections bridge the first-page and last-page halves.
    if (partialGap && i > 0) {
      const prevTask = processedTasks[i - 1];
      if (prevTask.x <= partialGap.leftX && currentTask.x >= partialGap.rightX) {
        latestTaskInLane.clear();
      }
    }

    // Non-activated unit: link via bloco/document reference (dotted arrow)
    if (!activatedUnits.has(currentTask.Unidade.IdUnidade)) {
      const rawDesc = currentTask.Descricao?.replace(/<[^>]*>/g, '') || '';
      const refId = extractReferenceId(rawDesc);
      if (refId) {
        const origin = firstByRef.get(refId);
        if (origin && origin.IdAndamento !== currentTask.IdAndamento) {
          connections.push({ sourceTask: origin, targetTask: currentTask, style: 'dotted' });
        }
      }
      continue;
    }

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
             // Do not draw a connection if the last action was a conclusion (manual or automatic).
             if (lastActionInCurrentLane.Tarefa !== AUTO_CONCLUSION_TASK_TYPE &&
                 lastActionInCurrentLane.Tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE') {
                connections.push({ sourceTask: lastActionInCurrentLane, targetTask: currentTask });
             }
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
          taskColor = OPEN_END_NODE_COLOR;
          daysOpen = differenceInDays(currentDate, latestOriginalInThisUnit.parsedDate);
        }
      }
    }
    
    task.color = taskColor;
    task.daysOpen = daysOpen;
  });
  
  const maxX = processedTasks.length > 0 ? Math.max(...processedTasks.map(t => t.x)) : INITIAL_X_OFFSET;
  const calculatedSvgHeight = (laneMap.size || 1) * VERTICAL_LANE_SPACING + INITIAL_Y_OFFSET;

  // Deduplicate connections — same (source, target) pair can be pushed more than once
  // when summary nodes or remetido tasks share IdAndamento values across iterations.
  const seenConns = new Set<string>();
  const uniqueConnections = connections.filter(conn => {
    const k = `${conn.sourceTask.IdAndamento}|${conn.targetTask.IdAndamento}|${conn.sourceTask.globalSequence}|${conn.targetTask.globalSequence}`;
    if (seenConns.has(k)) return false;
    seenConns.add(k);
    return true;
  });

  return {
    tasks: processedTasks,
    connections: uniqueConnections,
    svgWidth: maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE, 
    svgHeight: Math.max(calculatedSvgHeight, INITIAL_Y_OFFSET * 2),
    laneMap,
    processNumber: numeroProcesso,
  };
}

/** Detect the largest date gap in a set of tasks, used to show partial data breaks. */
export function detectPartialDataGap(
  tasks: ProcessedAndamento[]
): { leftX: number; rightX: number } | null {
  if (tasks.length < 4) return null;

  const sortedByX = [...tasks].sort((a, b) => a.x - b.x);
  let maxDateGapMs = 0;
  let gapIdx = -1;

  for (let i = 0; i < sortedByX.length - 1; i++) {
    const dateGap =
      sortedByX[i + 1].parsedDate.getTime() - sortedByX[i].parsedDate.getTime();
    if (dateGap > maxDateGapMs) {
      maxDateGapMs = dateGap;
      gapIdx = i;
    }
  }

  if (gapIdx < 0) return null;

  const totalSpan =
    sortedByX[sortedByX.length - 1].parsedDate.getTime() -
    sortedByX[0].parsedDate.getTime();
  const avgGap =
    sortedByX.length > 1 ? totalSpan / (sortedByX.length - 1) : 0;

  if (avgGap <= 0 || maxDateGapMs <= avgGap * 2) return null;

  return {
    leftX: sortedByX[gapIdx].x,
    rightX: sortedByX[gapIdx + 1].x,
  };
}

export function findOpenTaskForUnit(
  tasks: ProcessedAndamento[] | undefined,
  unitId: string
): ProcessedAndamento | undefined {
  if (!tasks) return undefined;
  return tasks
    .filter(task => task.Unidade.IdUnidade === unitId && typeof task.daysOpen === 'number' && task.daysOpen >= 0)
    .sort((a, b) => b.globalSequence - a.globalSequence)[0];
}
