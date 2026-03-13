/**
 * Productivity task groupings for SEI andamentos.
 * Each group maps to a distinct type of work that can receive its own hour-cost coefficient.
 */

export interface TaskGroup {
  key: string;
  label: string;
  tasks: string[];
}

export const TASK_GROUPS: TaskGroup[] = [
  {
    key: 'criacao',
    label: 'Criação de Documentos',
    tasks: [
      'GERACAO-DOCUMENTO',
      'ARQUIVO-ANEXADO',
      'RECEBIMENTO-DOCUMENTO',
    ],
  },
  {
    key: 'assinatura',
    label: 'Assinatura e Validação',
    tasks: [
      'ASSINATURA-DOCUMENTO',
      'CANCELAMENTO-ASSINATURA',
      'LIBERACAO-ASSINATURA-EXTERNA',
      'DOCUMENTO-CIENCIA',
      'PROCESSO-CIENCIA',
    ],
  },
  {
    key: 'tramitacao',
    label: 'Tramitação',
    tasks: [
      'PROCESSO-REMETIDO-UNIDADE',
      'PROCESSO-RECEBIDO-UNIDADE',
      'CONCLUSAO-PROCESSO-UNIDADE',
      'REABERTURA-PROCESSO-UNIDADE',
    ],
  },
  {
    key: 'blocos',
    label: 'Gestão de Blocos',
    tasks: [
      'DOCUMENTO-INCLUIDO-EM-BLOCO',
      'DOCUMENTO-RETIRADO-DO-BLOCO',
      'PROCESSO-INCLUIDO-EM-BLOCO',
      'BLOCO-DISPONIBILIZACAO',
      'BLOCO-RETORNO',
      'BLOCO-CONCLUSAO',
      'BLOCO-CANCELAMENTO-DISPONIBILIZACAO',
    ],
  },
  {
    key: 'edicao',
    label: 'Edição e Manutenção',
    tasks: [
      'CANCELAMENTO-DOCUMENTO',
      'EXCLUSAO-DOCUMENTO',
      'ALTERACAO-NIVEL-ACESSO-DOCUMENTO',
      'ALTERACAO-NIVEL-ACESSO-PROCESSO',
      'ALTERACAO-TIPO-PROCESSO',
      'PROCESSO-ALTERACAO-ORDEM-ARVORE',
      'ATUALIZACAO-ANDAMENTO',
    ],
  },
  {
    key: 'abertura',
    label: 'Abertura e Atribuição',
    tasks: [
      'GERACAO-PROCEDIMENTO',
      'PROCESSO-ATRIBUIDO',
    ],
  },
  {
    key: 'comunicacao',
    label: 'Acesso e Comunicação',
    tasks: [
      'ACESSO-EXTERNO-SISTEMA',
      'ENVIO-EMAIL',
    ],
  },
  {
    key: 'automatico',
    label: 'Automático',
    tasks: [
      'CONCLUSAO-AUTOMATICA-UNIDADE',
    ],
  },
];

/** Maps each raw task type to its group key. Unknown tasks go to "outros". */
const taskToGroupMap: Map<string, string> = new Map();
for (const group of TASK_GROUPS) {
  for (const task of group.tasks) {
    taskToGroupMap.set(task, group.key);
  }
}

export function getGroupKeyForTask(task: string): string {
  return taskToGroupMap.get(task) ?? 'outros';
}

/** Returns the tooltip text listing tasks in a group. */
export function getGroupTooltip(group: TaskGroup): string {
  return group.tasks.map(t => `• ${t}`).join('\n');
}
