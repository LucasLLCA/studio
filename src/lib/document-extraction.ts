import type { Documento } from '@/types/process-flow';

const EXTRACTION_PATTERNS = [
  // Padrão original (8-9 dígitos isolados) - mais confiável
  { name: 'isolado', regex: /\b(\d{8,9})\b/, priority: 1 },

  // Com prefixos comuns (DOC, DOCUMENTO, ANEXO, etc.)
  { name: 'prefixo_doc', regex: /(?:DOC|DOCUMENTO|ANEXO|PROCESS)[O]?[:\s#-]*(\d{7,18})/i, priority: 2 },

  // Protocolo ou número de processo
  { name: 'protocolo', regex: /(?:PROTOCOLO|PROCESSO|SEI)[:\s#-]*(\d{7,10})/i, priority: 2 },

  // Entre parênteses ou colchetes
  { name: 'parenteses', regex: /[\(\[](\d{7,10})[\)\]]/, priority: 3 },

  // Precedido por "nº", "n°", "num", "número"
  { name: 'numero', regex: /(?:n[ºo°]?|num|número)[:\s]*(\d{7,10})/i, priority: 3 },

  // Qualquer sequência de 7-10 dígitos (menos confiável)
  { name: 'generico', regex: /(\d{7,10})(?=\s|$|[^\d])/g, priority: 4 }
];

/**
 * Extracts a document number from a task description string using
 * prioritized regex patterns. Returns `null` when no valid number is found.
 */
export function extractDocumentNumber(descricao: string): string | null {
  let bestMatch: string | null = null;
  let bestPriority = 999;

  for (const pattern of EXTRACTION_PATTERNS) {
    const matches = pattern.regex.global
      ? [...descricao.matchAll(pattern.regex)]
      : [descricao.match(pattern.regex)];

    for (const match of matches) {
      if (match && match[1] && pattern.priority < bestPriority) {
        const number = match[1];

        // Rejeitar números muito pequenos (menos de 7 dígitos)
        if (number.length < 7) continue;

        // Rejeitar números muito grandes (mais de 12 dígitos)
        if (number.length > 12) continue;

        // Rejeitar padrões óbvios de data (formato YYYYMMDD ou DDMMYYYY)
        if (number.length === 8) {
          const year = parseInt(number.substring(0, 4));
          const year2 = parseInt(number.substring(4, 8));
          if ((year >= 1990 && year <= 2030) || (year2 >= 1990 && year2 <= 2030)) {
            continue;
          }
        }

        bestMatch = number;
        bestPriority = pattern.priority;
      }
    }
  }

  return bestMatch;
}

/**
 * Finds a document in the list that matches the given document number.
 * Checks exact match and substring containment in both directions.
 */
export function findMatchedDocument(docNumber: string, documents: Documento[]): Documento | null {
  return documents.find(doc =>
    doc.DocumentoFormatado === docNumber ||
    doc.Numero === docNumber ||
    doc.DocumentoFormatado.includes(docNumber) ||
    docNumber.includes(doc.DocumentoFormatado)
  ) || null;
}
