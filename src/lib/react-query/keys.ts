/**
 * Factory de Query Keys para React Query
 *
 * Padrão hierárquico para garantir invalidação eficiente:
 * - ['openUnits'] -> todas as queries de unidades abertas
 * - ['openUnits', processo] -> todas as queries de um processo específico
 * - ['openUnits', processo, unidade] -> query específica
 */

export const queryKeys = {
  // Unidades em aberto de um processo
  openUnits: {
    all: ['openUnits'] as const,
    byProcess: (processo: string) => ['openUnits', processo] as const,
    detail: (processo: string, unidade: string) =>
      ['openUnits', processo, unidade] as const,
  },

  // Dados do processo (andamentos)
  processData: {
    all: ['processData'] as const,
    byProcess: (processo: string) => ['processData', processo] as const,
    detail: (processo: string, unidade: string) =>
      ['processData', processo, unidade] as const,
  },

  // Documentos do processo
  documents: {
    all: ['documents'] as const,
    byProcess: (processo: string) => ['documents', processo] as const,
    paginated: (
      processo: string,
      unidade: string,
      page: number,
      pageSize: number
    ) => ['documents', processo, unidade, page, pageSize] as const,
  },

  // Resumos de processo (IA)
  processSummary: {
    all: ['processSummary'] as const,
    detail: (processo: string, unidade: string) =>
      ['processSummary', processo, unidade] as const,
  },

  // Resumos de documento (IA)
  documentSummary: {
    all: ['documentSummary'] as const,
    detail: (documento: string, unidade: string) =>
      ['documentSummary', documento, unidade] as const,
  },

  // Health checks
  health: {
    seiApi: ['health', 'sei-api'] as const,
    summaryApi: ['health', 'summary-api'] as const,
  },
} as const;

/**
 * Helper type para extrair query keys
 */
export type QueryKeys = typeof queryKeys;

/**
 * Helper para debug de query keys
 */
export function getQueryKeyString(key: readonly unknown[]): string {
  return JSON.stringify(key);
}
