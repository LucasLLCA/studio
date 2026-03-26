
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

/** Bloco-related task types — these represent cross-unit document signing interactions,
 *  NOT physical process movement. They should use dotted lines, not solid. */
const BLOCO_TASK_TYPES = new Set([
  'DOCUMENTO-INCLUIDO-EM-BLOCO',
  'DOCUMENTO-RETIRADO-DO-BLOCO',
  'PROCESSO-INCLUIDO-EM-BLOCO',
  'BLOCO-DISPONIBILIZACAO',
  'BLOCO-RETORNO',
  'BLOCO-CONCLUSAO',
  'BLOCO-CANCELAMENTO-DISPONIBILIZACAO',
]);

/** Check if a task is a bloco-related cross-unit interaction (signature via bloco). */
function isBlocoRelatedCrossUnit(task: Andamento, blocoOriginUnits: Map<string, string>): boolean {
  // ASSINATURA-DOCUMENTO in a unit different from where the document was included in a bloco
  if (task.Tarefa === 'ASSINATURA-DOCUMENTO') {
    const docId = task.Atributos?.find(a => a.Nome === 'DOCUMENTO')?.Valor;
    if (docId) {
      const originUnitId = blocoOriginUnits.get(docId);
      if (originUnitId && originUnitId !== task.Unidade.IdUnidade) return true;
    }
  }
  // BLOCO-RETORNO is always a cross-unit bloco interaction
  if (task.Tarefa === 'BLOCO-RETORNO') return true;
  return false;
}

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

export function getProcessStatusByDays(days: number) { 
  if (days > 90) {
    return {
      label: "crítico",
      color: "text-foreground",
      description: "alto tempo em aberto"
    };
  }

  if (days > 30) {
    return {
      label: "atenção",
      color: "text-foreground",
      description: "tempo moderado"
    };
  }

  return {
    label: "normal",
    color: "text-foreground",
    description: "dentro do esperado"
  };
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
      // Same exact timestamp: enforce logical order for transfer events.
      // SEI internal order (by IdAndamento creation): REMETIDO → RECEBIDO → CONCLUSAO
      const priority = (tarefa: string) => {
        switch (tarefa) {
          case 'PROCESSO-REMETIDO-UNIDADE':
            return 0;
          case 'PROCESSO-RECEBIDO-UNIDADE':
            return 1;
          case 'CONCLUSAO-AUTOMATICA-UNIDADE':
          case 'CONCLUSAO-PROCESSO-UNIDADE':
            return 2;
          default:
            return 1;
        }
      };
      const pDiff = priority(a.Tarefa) - priority(b.Tarefa);
      if (pDiff !== 0) return pDiff;
      return a.IdAndamento.localeCompare(b.IdAndamento);
    });

  // Post-sort fixup 1: when RECEBIDO appears before its matching REMETIDO
  // within 60s, swap them. Logical order: REMETIDO → RECEBIDO.
  // SEI sometimes records RECEBIDO a few seconds before REMETIDO.
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].Tarefa !== 'PROCESSO-RECEBIDO-UNIDADE') continue;
    const recebidoTime = sorted[i].parsedDate.getTime();
    const recebidoUnit = sorted[i].Unidade.IdUnidade;
    // Look forward for a REMETIDO within 60s whose destination matches this RECEBIDO's unit
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].parsedDate.getTime() - recebidoTime > 60000) break;
      if (sorted[j].Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
        // Check if this REMETIDO's destination unit matches the RECEBIDO's unit
        // REMETIDO is recorded in the DESTINATION unit with UNIDADE attr = SENDER
        // If the REMETIDO is in the same unit as RECEBIDO, it's the matching pair
        if (sorted[j].Unidade.IdUnidade === recebidoUnit) {
          // Move REMETIDO before RECEBIDO
          const [remetido] = sorted.splice(j, 1);
          sorted.splice(i, 0, remetido);
          break;
        }
      }
    }
  }

  // Post-sort fixup 2: when a CONCLUSAO appears before its matching
  // REMETIDO/RECEBIDO within 60s, move it after them.
  // Correct chronological order: REMETIDO → RECEBIDO → CONCLUSAO
  for (let i = 0; i < sorted.length; i++) {
    const tarefa = sorted[i].Tarefa;
    if (tarefa !== 'CONCLUSAO-AUTOMATICA-UNIDADE' && tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE') continue;
    const conclusaoTime = sorted[i].parsedDate.getTime();
    let lastTransferAfter = i;
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j];
      if (candidate.parsedDate.getTime() - conclusaoTime > 60000) break;
      if (candidate.Tarefa === 'PROCESSO-REMETIDO-UNIDADE' ||
          candidate.Tarefa === 'PROCESSO-RECEBIDO-UNIDADE') {
        lastTransferAfter = j;
      }
    }
    if (lastTransferAfter > i) {
      const [conclusao] = sorted.splice(i, 1);
      sorted.splice(lastTransferAfter, 0, conclusao);
      i--;
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

  // Collect units that formally participated in the flow.
  // REMETIDO also activates because a unit that receives a remetimento is part of the flow
  // even if RECEBIDO hasn't arrived yet (e.g., last event in the timeline).
  const FLOW_ACTIVATION_TASKS = new Set([
    'GERACAO-PROCEDIMENTO',
    'PROCESSO-RECEBIDO-UNIDADE',
    'PROCESSO-REMETIDO-UNIDADE',
    'REABERTURA-PROCESSO-UNIDADE',
  ]);
  const activatedUnits = new Set<string>();
  for (const task of processedTasks) {
    if (FLOW_ACTIVATION_TASKS.has(task.Tarefa)) {
      activatedUnits.add(task.Unidade.IdUnidade);
    }
  }

  // Index: first task per bloco/document reference (for independent linking).
  // Scan original andamentos (pre-summarization) so refs inside summary nodes are found.
  const refToOriginalId = new Map<string, string>();
  for (const a of globallySortedAndamentos) {
    const rawDesc = a.Descricao?.replace(/<[^>]*>/g, '') || '';
    const refId = extractReferenceId(rawDesc);
    if (refId && !refToOriginalId.has(refId)) {
      refToOriginalId.set(refId, a.IdAndamento);
    }
  }
  // Map original andamento IDs → their processedTask (handles summary nodes)
  const originalIdToTask = new Map<string, ProcessedAndamento>();
  for (const task of processedTasks) {
    originalIdToTask.set(task.IdAndamento, task);
    if (task.originalTaskIds) {
      for (const origId of task.originalTaskIds) {
        originalIdToTask.set(origId, task);
      }
    }
  }
  const firstByRef = new Map<string, ProcessedAndamento>();
  for (const [refId, origId] of refToOriginalId) {
    const task = originalIdToTask.get(origId);
    if (task) {
      firstByRef.set(refId, task);
    }
  }

  // Track lanes that have been concluded. Orphan activities after a conclusão
  // (e.g., DOCUMENTO-RETIRADO-DO-BLOCO) should not create lane continuity.
  // Only tramitação events (REMETIDO, RECEBIDO, REABERTURA) reactivate a concluded lane.
  const concludedLanes = new Set<string>();

  const LANE_REACTIVATION_TASKS = new Set([
    'PROCESSO-REMETIDO-UNIDADE',
    'PROCESSO-RECEBIDO-UNIDADE',
    'REABERTURA-PROCESSO-UNIDADE',
    'GERACAO-PROCEDIMENTO',
  ]);

  // Build bloco origin map: document ID → unit ID where it was included in a bloco.
  // This lets us trace cross-unit bloco signatures back to the originating unit.
  const blocoOriginUnits = new Map<string, string>();
  const blocoDocToInclusionTask = new Map<string, ProcessedAndamento>();
  for (const task of processedTasks) {
    if (task.Tarefa === 'DOCUMENTO-INCLUIDO-EM-BLOCO') {
      const docId = task.Atributos?.find(a => a.Nome === 'DOCUMENTO')?.Valor;
      if (docId && !blocoOriginUnits.has(docId)) {
        blocoOriginUnits.set(docId, task.Unidade.IdUnidade);
        blocoDocToInclusionTask.set(docId, task);
      }
    }
  }

  for (let i = 0; i < processedTasks.length; i++) {
    const currentTask = processedTasks[i];
    const currentUnitId = currentTask.Unidade.IdUnidade;
    const isBlocoTask = BLOCO_TASK_TYPES.has(currentTask.Tarefa);
    const isCrossUnitBloco = isBlocoRelatedCrossUnit(currentTask, blocoOriginUnits);

    // ── Cross-unit bloco signature: dotted arrow to the inclusion task ──
    if (isCrossUnitBloco) {
      const docId = currentTask.Atributos?.find(a => a.Nome === 'DOCUMENTO')?.Valor;
      const inclusionTask = docId ? blocoDocToInclusionTask.get(docId) : undefined;
      if (inclusionTask) {
        connections.push({ sourceTask: inclusionTask, targetTask: currentTask, style: 'dotted' });
      }
      // Don't update lane state for cross-unit bloco interactions
      continue;
    }

    // ── Bloco operations: dotted link, skip lane continuity ──
    if (isBlocoTask) {
      // Try to link to the document's inclusion task or ref origin
      const refIds: string[] = [];
      if (currentTask.originalTaskIds) {
        for (const origId of currentTask.originalTaskIds) {
          const orig = globallySortedAndamentos.find(a => a.IdAndamento === origId);
          if (orig) {
            const rawDesc = orig.Descricao?.replace(/<[^>]*>/g, '') || '';
            const refId = extractReferenceId(rawDesc);
            if (refId && !refIds.includes(refId)) refIds.push(refId);
          }
        }
      } else {
        const rawDesc = currentTask.Descricao?.replace(/<[^>]*>/g, '') || '';
        const refId = extractReferenceId(rawDesc);
        if (refId) refIds.push(refId);
      }
      // Also check document attributes for bloco tasks
      const docAttr = currentTask.Atributos?.find(a => a.Nome === 'DOCUMENTO')?.Valor;
      if (docAttr) {
        const inclusionTask = blocoDocToInclusionTask.get(docAttr);
        if (inclusionTask && inclusionTask.IdAndamento !== currentTask.IdAndamento) {
          connections.push({ sourceTask: inclusionTask, targetTask: currentTask, style: 'dotted' });
          continue;
        }
      }
      for (const refId of refIds) {
        const origin = firstByRef.get(refId);
        if (origin && origin.IdAndamento !== currentTask.IdAndamento) {
          connections.push({ sourceTask: origin, targetTask: currentTask, style: 'dotted' });
        }
      }
      // If no ref found, try linking to last task in same lane (as dotted)
      if (refIds.length === 0 && !docAttr) {
        const lastInLane = latestTaskInLane.get(currentUnitId);
        if (lastInLane && lastInLane.IdAndamento !== currentTask.IdAndamento) {
          connections.push({ sourceTask: lastInLane, targetTask: currentTask, style: 'dotted' });
        }
      }
      // Bloco tasks don't participate in lane continuity
      continue;
    }

    // ── Standard cross-unit document reference: dotted arrow to origin activity ──
    const isOrphanInConcludedLane = concludedLanes.has(currentUnitId);
    {
      const refIds: string[] = [];
      if (currentTask.originalTaskIds) {
        for (const origId of currentTask.originalTaskIds) {
          const orig = globallySortedAndamentos.find(a => a.IdAndamento === origId);
          if (orig) {
            const rawDesc = orig.Descricao?.replace(/<[^>]*>/g, '') || '';
            const refId = extractReferenceId(rawDesc);
            if (refId && !refIds.includes(refId)) refIds.push(refId);
          }
        }
      } else {
        const rawDesc = currentTask.Descricao?.replace(/<[^>]*>/g, '') || '';
        const refId = extractReferenceId(rawDesc);
        if (refId) refIds.push(refId);
      }
      for (const refId of refIds) {
        const origin = firstByRef.get(refId);
        if (origin &&
            origin.IdAndamento !== currentTask.IdAndamento &&
            (origin.Unidade.IdUnidade !== currentUnitId || isOrphanInConcludedLane)) {
          connections.push({ sourceTask: origin, targetTask: currentTask, style: 'dotted' });
        }
      }
    }

    // REMETIDO sender cross-lane connection runs BEFORE activation check.
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
    }

    // Non-activated unit: skip intra-lane flow connections
    if (!activatedUnits.has(currentUnitId)) {
      if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
        latestTaskInLane.set(currentUnitId, currentTask);
      }
      continue;
    }

    // Reactivate concluded lane on tramitação events
    if (LANE_REACTIVATION_TASKS.has(currentTask.Tarefa)) {
      concludedLanes.delete(currentUnitId);
    }

    // If this lane is concluded, orphan activities don't participate in flow connections.
    if (concludedLanes.has(currentUnitId)) {
      continue;
    }

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const lastActionInOwnLane = latestTaskInLane.get(currentUnitId);
      if (lastActionInOwnLane &&
          lastActionInOwnLane.IdAndamento !== currentTask.IdAndamento &&
          lastActionInOwnLane.Tarefa !== AUTO_CONCLUSION_TASK_TYPE &&
          lastActionInOwnLane.Tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE') {
        connections.push({ sourceTask: lastActionInOwnLane, targetTask: currentTask });
      }

      latestTaskInLane.set(currentUnitId, currentTask);
    } else {
      const lastActionInCurrentLane = latestTaskInLane.get(currentUnitId);
      if (lastActionInCurrentLane) {
          if(lastActionInCurrentLane.IdAndamento !== currentTask.IdAndamento || lastActionInCurrentLane.globalSequence !== currentTask.globalSequence) {
             if (lastActionInCurrentLane.Tarefa !== AUTO_CONCLUSION_TASK_TYPE &&
                 lastActionInCurrentLane.Tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE') {
                connections.push({ sourceTask: lastActionInCurrentLane, targetTask: currentTask });
             }
          }
      }
      latestTaskInLane.set(currentUnitId, currentTask);

      if (currentTask.Tarefa === AUTO_CONCLUSION_TASK_TYPE ||
          currentTask.Tarefa === 'CONCLUSAO-PROCESSO-UNIDADE') {
        concludedLanes.add(currentUnitId);
      }
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

  // ── Post-processing: enforce ONE incoming edge per node, fix orphans ──

  // 1. Deduplicate exact same (source, target) pairs
  const seenConns = new Set<string>();
  const deduped = connections.filter(conn => {
    const k = `${conn.sourceTask.IdAndamento}|${conn.targetTask.IdAndamento}|${conn.sourceTask.globalSequence}|${conn.targetTask.globalSequence}`;
    if (seenConns.has(k)) return false;
    seenConns.add(k);
    return true;
  });

  // 2. Keep only ONE incoming edge per target node (prefer solid over dotted).
  // Exception: REMETIDO nodes that land in an unconcluded lane keep BOTH the
  // sender connection (actual tramitação) AND the own-lane continuity connection.
  const bestIncoming = new Map<string, Connection>();
  // Extra connections for REMETIDO nodes with lane continuity
  const extraRemetidoConns: Connection[] = [];

  for (const conn of deduped) {
    const targetKey = `${conn.targetTask.IdAndamento}|${conn.targetTask.globalSequence}`;
    const existing = bestIncoming.get(targetKey);
    if (!existing) {
      bestIncoming.set(targetKey, conn);
    } else {
      const existingIsSolid = !existing.style;
      const newIsSolid = !conn.style;

      // For REMETIDO targets: keep BOTH sender and own-lane connections if both solid
      if (conn.targetTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE' && newIsSolid && existingIsSolid) {
        const existingIsSender = existing.sourceTask.Unidade.IdUnidade !== conn.targetTask.Unidade.IdUnidade;
        const newIsSender = conn.sourceTask.Unidade.IdUnidade !== conn.targetTask.Unidade.IdUnidade;
        if (existingIsSender !== newIsSender) {
          // One is sender, one is own-lane — keep both
          extraRemetidoConns.push(conn);
          continue;
        }
      }

      // Prefer solid over dotted
      if (newIsSolid && !existingIsSolid) {
        bestIncoming.set(targetKey, conn);
      }
      // If both same type, keep the one with closest source
      else if (newIsSolid === existingIsSolid) {
        const existingDist = Math.abs(conn.targetTask.globalSequence - existing.sourceTask.globalSequence);
        const newDist = Math.abs(conn.targetTask.globalSequence - conn.sourceTask.globalSequence);
        if (newDist < existingDist) {
          bestIncoming.set(targetKey, conn);
        }
      }
    }
  }
  const singleIncomingConns = [...Array.from(bestIncoming.values()), ...extraRemetidoConns];

  // 3. Fix orphan nodes: every non-first node should have at least one incoming edge.
  // Build set of nodes that have incoming edges.
  const nodesWithIncoming = new Set<string>();
  for (const conn of singleIncomingConns) {
    nodesWithIncoming.add(`${conn.targetTask.IdAndamento}|${conn.targetTask.globalSequence}`);
  }

  const firstTaskKey = processedTasks.length > 0
    ? `${processedTasks[0].IdAndamento}|${processedTasks[0].globalSequence}`
    : '';

  for (let i = 1; i < processedTasks.length; i++) {
    const task = processedTasks[i];
    const taskKey = `${task.IdAndamento}|${task.globalSequence}`;
    if (nodesWithIncoming.has(taskKey)) continue;

    // Orphan node — try to infer a connection
    let linkedSource: ProcessedAndamento | null = null;
    let linkedStyle: 'dotted' | undefined = 'dotted';

    // Strategy A: bloco task → link to DOCUMENTO-INCLUIDO-EM-BLOCO via document attr
    if (BLOCO_TASK_TYPES.has(task.Tarefa) || isBlocoRelatedCrossUnit(task, blocoOriginUnits)) {
      const docId = task.Atributos?.find(a => a.Nome === 'DOCUMENTO')?.Valor;
      if (docId) {
        linkedSource = blocoDocToInclusionTask.get(docId) ?? null;
      }
    }

    // Strategy B: signature in a foreign unit → link to document origin
    if (!linkedSource && task.Tarefa === 'ASSINATURA-DOCUMENTO') {
      const docId = task.Atributos?.find(a => a.Nome === 'DOCUMENTO')?.Valor;
      if (docId) {
        // Find the task that generated or included this document
        const generationTask = processedTasks.find(t =>
          t.globalSequence < task.globalSequence &&
          (t.Tarefa === 'GERACAO-DOCUMENTO' || t.Tarefa === 'DOCUMENTO-INCLUIDO-EM-BLOCO') &&
          t.Atributos?.some(a => a.Nome === 'DOCUMENTO' && a.Valor === docId)
        );
        if (generationTask) linkedSource = generationTask;
      }
    }

    // Strategy C: BLOCO-RETORNO → link to last BLOCO-DISPONIBILIZACAO in a different unit
    if (!linkedSource && task.Tarefa === 'BLOCO-RETORNO') {
      const lastDisp = [...processedTasks].reverse().find(t =>
        t.globalSequence < task.globalSequence &&
        t.Tarefa === 'BLOCO-DISPONIBILIZACAO' &&
        t.Unidade.IdUnidade !== task.Unidade.IdUnidade
      );
      if (lastDisp) linkedSource = lastDisp;
    }

    // Strategy D: fallback — link to the chronologically previous node (dotted)
    if (!linkedSource) {
      linkedSource = processedTasks[i - 1];
    }

    if (linkedSource) {
      singleIncomingConns.push({ sourceTask: linkedSource, targetTask: task, style: linkedStyle });
      nodesWithIncoming.add(taskKey);
    }
  }

  return {
    tasks: processedTasks,
    connections: singleIncomingConns,
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

/**
 * Derives open units from the andamentos timeline without needing the
 * /sei/unidades-abertas endpoint.
 *
 * A unit is considered "em aberto" when:
 *   1. It was activated in the flow (GERACAO, RECEBIDO, or REABERTURA)
 *   2. Its last significant flow activity is NOT a conclusion (manual or automatic)
 *
 * The UsuarioAtribuicao is approximated using the user from the last activity
 * in each open unit.
 */
export function deriveOpenUnitsFromAndamentos(
  andamentos: Andamento[]
): UnidadeAberta[] {
  if (!andamentos || andamentos.length === 0) return [];

  const sorted = [...andamentos]
    .map(a => ({ ...a, parsedDate: parseCustomDateString(a.DataHora) }))
    .sort((a, b) => {
      const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (timeDiff !== 0) return timeDiff;
      // SEI internal order (by IdAndamento creation): REMETIDO → RECEBIDO → CONCLUSAO
      const priority = (tarefa: string) => {
        switch (tarefa) {
          case 'PROCESSO-REMETIDO-UNIDADE':
            return 0;
          case 'PROCESSO-RECEBIDO-UNIDADE':
            return 1;
          case 'CONCLUSAO-AUTOMATICA-UNIDADE':
          case 'CONCLUSAO-PROCESSO-UNIDADE':
            return 2;
          default:
            return 1;
        }
      };
      return priority(a.Tarefa) - priority(b.Tarefa);
    });

  const FLOW_ACTIVATION_TASKS = new Set([
    'GERACAO-PROCEDIMENTO',
    'PROCESSO-RECEBIDO-UNIDADE',
    'PROCESSO-REMETIDO-UNIDADE',
    'REABERTURA-PROCESSO-UNIDADE',
  ]);
  const CONCLUSION_TYPES = new Set([
    'CONCLUSAO-PROCESSO-UNIDADE',
    'CONCLUSAO-AUTOMATICA-UNIDADE',
  ]);

  const activatedUnits = new Set<string>();
  const lastSignificantByUnit = new Map<string, (typeof sorted)[number]>();
  const lastActivityByUnit = new Map<string, (typeof sorted)[number]>();

  for (const a of sorted) {
    if (FLOW_ACTIVATION_TASKS.has(a.Tarefa)) {
      activatedUnits.add(a.Unidade.IdUnidade);
    }
    if (activatedUnits.has(a.Unidade.IdUnidade)) {
      lastActivityByUnit.set(a.Unidade.IdUnidade, a);
      if (SIGNIFICANT_TASK_TYPES.includes(a.Tarefa)) {
        lastSignificantByUnit.set(a.Unidade.IdUnidade, a);
      }
    }
  }

  const openUnits: UnidadeAberta[] = [];
  for (const [unitId, lastSignificant] of lastSignificantByUnit) {
    if (!CONCLUSION_TYPES.has(lastSignificant.Tarefa)) {
      const lastAny = lastActivityByUnit.get(unitId) || lastSignificant;
      openUnits.push({
        Unidade: {
          IdUnidade: lastSignificant.Unidade.IdUnidade,
          Sigla: lastSignificant.Unidade.Sigla,
          Descricao: lastSignificant.Unidade.Descricao,
        },
        UsuarioAtribuicao: {
          IdUsuario: lastAny.Usuario.IdUsuario,
          Sigla: lastAny.Usuario.Sigla,
          Nome: lastAny.Usuario.Nome,
        },
      });
    }
  }

  return openUnits;

  
}
