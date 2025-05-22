
import {
  type Andamento,
  type ProcessedAndamento,
  type Connection,
  type ProcessoData,
} from '@/types/process-flow';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NODE_RADIUS = 18;
const HORIZONTAL_SPACING_BASE = 40; // Reduzido para gráfico mais compacto
const VERTICAL_LANE_SPACING = 100;
const INITIAL_X_OFFSET = 200;
const INITIAL_Y_OFFSET = 60;

// Cores simbólicas para tipos de tarefa (HSL format)
const SYMBOLIC_TASK_COLORS: Record<string, string> = {
  'CONCLUSAO-PROCESSO-UNIDADE': 'hsl(120, 60%, 45%)', // Verde
  'CONCLUSAO-AUTOMATICA-UNIDADE': 'hsl(120, 60%, 70%)', // Verde claro
  'PROCESSO-REMETIDO-UNIDADE': 'hsl(30, 35%, 40%)', // Marrom
  'PROCESSO-RECEBIDO-UNIDADE': 'hsl(210, 70%, 55%)', // Azul
  'REABERTURA-PROCESSO-UNIDADE': 'hsl(270, 50%, 60%)', // Roxo
  'GERACAO-PROCEDIMENTO': 'hsl(30, 80%, 55%)', // Laranja
  // Adicione outros mapeamentos específicos conforme necessário
};
const DEFAULT_TASK_COLOR = 'hsl(var(--muted))'; // Cinza para demais ações
const OPEN_END_NODE_COLOR = 'hsl(var(--destructive))'; // Vermelho para pontas não concluídas/remetidas

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
  return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

export function processAndamentos(andamentosInput: Andamento[]): ProcessedFlowData {
  if (!andamentosInput || andamentosInput.length === 0) {
    return {
      tasks: [],
      connections: [],
      svgWidth: INITIAL_X_OFFSET,
      svgHeight: INITIAL_Y_OFFSET,
      laneMap: new Map(),
    };
  }

  const globallySortedAndamentos = [...andamentosInput]
    .map((andamento, index) => ({
      ...andamento,
      parsedDate: parseCustomDateString(andamento.DataHora),
      originalIndexInInput: index, // Manter para referência se necessário
    }))
    .sort((a, b) => {
      const dateDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      // Se as datas forem iguais, usar IdAndamento para uma ordem estável
      return a.IdAndamento.localeCompare(b.IdAndamento);
    });

  const laneMap = new Map<string, number>();
  let laneCount = 0;

  globallySortedAndamentos.forEach(a => {
    if (!laneMap.has(a.Unidade.Sigla)) {
      laneMap.set(a.Unidade.Sigla, INITIAL_Y_OFFSET + laneCount * VERTICAL_LANE_SPACING);
      laneCount++;
    }
  });

  // Identificar a última tarefa em cada unidade
  const latestTaskDetailsByUnit = new Map<string, { IdAndamento: string; Tarefa: string }>();
  for (const andamento of globallySortedAndamentos) {
      latestTaskDetailsByUnit.set(andamento.Unidade.IdUnidade, { IdAndamento: andamento.IdAndamento, Tarefa: andamento.Tarefa });
  }

  const processedTasks: ProcessedAndamento[] = globallySortedAndamentos.map((a, index) => {
    const yPos = laneMap.get(a.Unidade.Sigla) ?? INITIAL_Y_OFFSET;
    const xPos = INITIAL_X_OFFSET + index * HORIZONTAL_SPACING_BASE + NODE_RADIUS;
    
    let taskColor = SYMBOLIC_TASK_COLORS[a.Tarefa] || DEFAULT_TASK_COLOR;
    const latestInUnit = latestTaskDetailsByUnit.get(a.Unidade.IdUnidade);

    if (latestInUnit && latestInUnit.IdAndamento === a.IdAndamento) {
        // É a última tarefa desta unidade
        if (a.Tarefa !== 'CONCLUSAO-PROCESSO-UNIDADE' &&
            a.Tarefa !== 'CONCLUSAO-AUTOMATICA-UNIDADE' &&
            a.Tarefa !== 'PROCESSO-REMETIDO-UNIDADE') {
            taskColor = OPEN_END_NODE_COLOR;
        }
    }

    return {
      ...a,
      globalSequence: index + 1,
      x: xPos,
      y: yPos,
      color: taskColor,
      nodeRadius: NODE_RADIUS,
      chronologicalIndex: index,
    };
  });

  const connections: Connection[] = [];
  const latestTaskInLane = new Map<string, ProcessedAndamento>(); // Rastreia a última tarefa *processada* em cada lane

  for (let i = 0; i < processedTasks.length; i++) {
    const currentTask = processedTasks[i];
    const performingUnitId = currentTask.Unidade.IdUnidade;

    if (currentTask.Tarefa === 'PROCESSO-REMETIDO-UNIDADE') {
      const senderUnitAttr = currentTask.Atributos?.find(attr => attr.Nome === "UNIDADE");
      const senderUnitId = senderUnitAttr?.IdOrigem; // Este é o IdUnidade da unidade REMETENTE

      if (senderUnitId) {
        const lastActionInSenderLane = latestTaskInLane.get(senderUnitId);
        if (lastActionInSenderLane) {
          connections.push({ sourceTask: lastActionInSenderLane, targetTask: currentTask });
        }
      }
      // A currentTask (remessa) atualiza o 'latestTaskInLane' para sua própria unidade (a de destino)
      latestTaskInLane.set(performingUnitId, currentTask);
    } else {
      // Para outras tarefas, conecta-se da última tarefa na *mesma* lane
      const lastActionInThisLane = latestTaskInLane.get(performingUnitId);
      if (lastActionInThisLane) {
         connections.push({ sourceTask: lastActionInThisLane, targetTask: currentTask });
      }
      latestTaskInLane.set(performingUnitId, currentTask);
    }
  }
  
  const maxX = processedTasks.length > 0 ? Math.max(...processedTasks.map(t => t.x)) : INITIAL_X_OFFSET;
  const maxY = laneMap.size > 0 ? Math.max(...Array.from(laneMap.values())) : INITIAL_Y_OFFSET;

  return {
    tasks: processedTasks,
    connections,
    svgWidth: maxX + NODE_RADIUS + HORIZONTAL_SPACING_BASE, // Adiciona um pouco de padding à direita
    svgHeight: maxY + NODE_RADIUS + VERTICAL_LANE_SPACING / 2, // Adiciona um pouco de padding abaixo
    laneMap,
  };
}
