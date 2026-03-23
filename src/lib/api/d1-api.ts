/**
 * D-1 API client — fetches pre-loaded andamentos from PostgreSQL (up to 1 day old).
 * Used as a fast primary data source; SEI API reconciles in background.
 */

import type { ProcessoData, Andamento, ProcessoInfo } from '@/types/process-flow';

// ─── D-1 Response Types ───────────────────────────────────────────────────

interface D1Unidade {
  sigla?: string;
  descricao?: string;
}

interface D1Usuario {
  sigla?: string;
  nome?: string;
}

interface D1Atributo {
  Nome: string;
  Valor: string;
}

interface D1Andamento {
  descricao: string;
  tipo_acao?: string;
  data_hora?: string;
  unidade?: D1Unidade;
  usuario?: D1Usuario;
  atributos?: D1Atributo[];
}

export interface D1Response {
  protocolo_formatado?: string;
  tipo_procedimento?: string;
  andamentos: D1Andamento[];
  total_andamentos: number;
  primeiro_andamento?: D1Andamento;
  ultimo_andamento?: D1Andamento;
  data_carga?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const D1_BASE_URL = process.env.NEXT_PUBLIC_D1_API_BASE_URL;

export function isD1Available(): boolean {
  return !!D1_BASE_URL;
}

/**
 * Convert ISO datetime "2025-03-15T14:30:00" → "15/03/2025 14:30:00"
 * (format expected by parseCustomDateString in the frontend)
 */
function isoToCustomDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

// ─── Fetch ────────────────────────────────────────────────────────────────

export async function fetchD1Andamentos(processo: string): Promise<D1Response | null> {
  if (!D1_BASE_URL) return null;

  try {
    const url = `${D1_BASE_URL}/api/v1/processo/${encodeURIComponent(processo)}/andamentos`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Transform D-1 → ProcessoData ────────────────────────────────────────

function transformD1Andamento(d1: D1Andamento, index: number): Andamento {
  const sigla = d1.unidade?.sigla ?? '';
  const nome = d1.usuario?.nome ?? '';

  return {
    IdAndamento: `d1-${index}`,
    Tarefa: d1.tipo_acao ?? '',
    Descricao: d1.descricao,
    DataHora: d1.data_hora ? isoToCustomDate(d1.data_hora) : '',
    Unidade: { IdUnidade: sigla, Sigla: sigla, Descricao: sigla },
    Usuario: { IdUsuario: nome, Sigla: nome, Nome: nome },
    Atributos: d1.atributos?.map(a => ({
      Nome: a.Nome,
      Valor: a.Valor,
      // D-1 has no numeric IDs. For UNIDADE atributos, set IdOrigem to the sigla
      // so the connection logic (which keys by IdUnidade=sigla) can find the sender lane.
      IdOrigem: a.Nome === 'UNIDADE' ? a.Valor : undefined,
    })),
  };
}

export function transformD1ToProcessoData(d1: D1Response): ProcessoData {
  const andamentos = d1.andamentos.map(transformD1Andamento);

  const info: ProcessoInfo = {
    Pagina: 1,
    TotalPaginas: 1,
    QuantidadeItens: andamentos.length,
    TotalItens: d1.total_andamentos,
    NumeroProcesso: d1.protocolo_formatado,
  };

  return { Info: info, Andamentos: andamentos };
}

// ─── Merge D-1 + SEI ─────────────────────────────────────────────────────

/**
 * Normalize a DataHora string for dedup key (strip leading/trailing spaces,
 * collapse internal whitespace). This ensures "15/03/2025 14:30:00" matches
 * regardless of minor formatting differences.
 */
function normalizeDateTime(dt: string): string {
  return dt.trim().replace(/\s+/g, ' ');
}

/**
 * Dedup key uses DataHora + Tarefa + Unidade.Sigla (NOT Descricao).
 * D-1 descriptions contain @PLACEHOLDER@ tokens while SEI has actual values,
 * so descriptions will never match. Tarefa/tipo_acao is identical in both sources.
 */
function dedupKey(a: Andamento): string {
  return `${normalizeDateTime(a.DataHora)}|${a.Tarefa}|${a.Unidade.Sigla}`;
}

/**
 * Merge D-1 data with SEI andamentos.
 * SEI data always wins for matching records (richer: real IDs, Atributos).
 * D-1-only records (older data not yet in SEI page) are appended.
 */
export function mergeD1WithSEI(
  d1Data: ProcessoData,
  seiAndamentos: Andamento[],
  seiTotal: number,
): ProcessoData {
  // Build SEI key set
  const seiKeySet = new Set<string>();
  for (const a of seiAndamentos) {
    seiKeySet.add(dedupKey(a));
  }

  // D-1 andamentos not present in SEI
  const d1Only: Andamento[] = [];
  for (const a of d1Data.Andamentos) {
    if (!seiKeySet.has(dedupKey(a))) {
      d1Only.push(a);
    }
  }

  // Combine: all SEI + D-1-only, then sort by DataHora descending
  const merged = [...seiAndamentos, ...d1Only].sort((a, b) => {
    // Compare using the raw strings (DD/MM/YYYY HH:MM:SS format)
    // Convert to comparable format for sorting
    const parseDate = (dt: string) => {
      const [datePart, timePart] = dt.split(' ');
      if (!datePart) return 0;
      const [dd, mm, yyyy] = datePart.split('/');
      return new Date(`${yyyy}-${mm}-${dd}T${timePart || '00:00:00'}`).getTime();
    };
    return parseDate(b.DataHora) - parseDate(a.DataHora);
  });

  const totalItems = Math.max(seiTotal, d1Data.Info.TotalItens);

  return {
    Info: {
      Pagina: 1,
      TotalPaginas: 1,
      QuantidadeItens: merged.length,
      TotalItens: totalItems,
      NumeroProcesso: d1Data.Info.NumeroProcesso,
    },
    Andamentos: merged,
  };
}
