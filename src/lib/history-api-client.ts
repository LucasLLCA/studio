'use server';

import type { ApiError } from '@/types/process-flow';

const HISTORY_API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "https://api.sei.agentes.sead.pi.gov.br";

export interface SaveHistoryRequest {
  numero_processo: string;
  numero_processo_formatado: string;
  usuario: string;
  id_unidade?: string;
  caixa_contexto?: string;
}

export interface HistoryItem {
  id: string;
  numero_processo: string;
  numero_processo_formatado: string;
  usuario: string;
  id_unidade?: string;
  caixa_contexto?: string;
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
}

export interface SaveHistoryResponse {
  success: boolean;
  message?: string;
}

export interface DeleteHistoryResponse {
  success: boolean;
  message?: string;
}

/**
 * Salva uma pesquisa no historico
 */
export async function saveSearchHistory(
  data: SaveHistoryRequest
): Promise<SaveHistoryResponse | ApiError> {
  const url = `${HISTORY_API_BASE_URL}/historico`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      return {
        error: `Falha ao salvar historico: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const result = await response.json();
    return { success: true, message: result.message || 'Historico salvo com sucesso' };
  } catch (error) {
    console.error('Erro ao salvar historico:', error);
    return {
      error: 'Erro ao conectar com o servico de historico',
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca o historico de pesquisas de um usuario
 */
export async function getSearchHistory(
  usuario: string,
  limit: number = 20,
  offset: number = 0,
  incluirDeletados: boolean = false
): Promise<HistoryItem[] | ApiError> {
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    incluir_deletados: incluirDeletados.toString()
  });

  const url = `${HISTORY_API_BASE_URL}/historico/${encodeURIComponent(usuario)}?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      return {
        error: `Falha ao buscar historico: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();

    // A API retorna os dados no formato: { status: "success", data: { pesquisas: [...] } }
    if (data.data && Array.isArray(data.data.pesquisas)) {
      return data.data.pesquisas as HistoryItem[];
    } else if (Array.isArray(data)) {
      return data as HistoryItem[];
    } else if (data.historico && Array.isArray(data.historico)) {
      return data.historico as HistoryItem[];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Erro ao buscar historico:', error);
    return {
      error: 'Erro ao conectar com o servico de historico',
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Deleta (soft delete) uma pesquisa do historico
 */
export async function deleteSearchHistory(
  id: string
): Promise<DeleteHistoryResponse | ApiError> {
  const url = `${HISTORY_API_BASE_URL}/historico/pesquisa/${id}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }

      return {
        error: `Falha ao deletar historico: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const result = await response.json();
    return { success: true, message: result.message || 'Historico deletado com sucesso' };
  } catch (error) {
    console.error('Erro ao deletar historico:', error);
    return {
      error: 'Erro ao conectar com o servico de historico',
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}
