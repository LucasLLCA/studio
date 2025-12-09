'use server';

import type { ApiError } from '@/types/process-flow';

const HISTORY_API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "https://api.sei.agentes.sead.pi.gov.br";

export interface SaveHistoryRequest {
  numero_processo: string;
  numero_processo_formatado: string;
  usuario: string;
  caixa_contexto?: string;
}

export interface HistoryItem {
  id: string;
  numero_processo: string;
  numero_processo_formatado: string;
  usuario: string;
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
 * Salva uma pesquisa no histórico
 */
export async function saveSearchHistory(
  data: SaveHistoryRequest
): Promise<SaveHistoryResponse | ApiError> {
  const url = `${HISTORY_API_BASE_URL}/historico`;
  console.log('[DEBUG] Salvando histórico - URL:', url);
  console.log('[DEBUG] Salvando histórico - Dados:', data);

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

    console.log('[DEBUG] Salvando histórico - Status:', response.status);

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
        console.log('[DEBUG] Salvando histórico - Erro JSON:', errorDetails);
      } catch (e) {
        errorDetails = await response.text();
        console.log('[DEBUG] Salvando histórico - Erro texto:', errorDetails);
      }

      return {
        error: `Falha ao salvar histórico: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const result = await response.json();
    console.log('[DEBUG] Salvando histórico - Sucesso:', result);
    return { success: true, message: result.message || 'Histórico salvo com sucesso' };
  } catch (error) {
    console.error('[DEBUG] Salvando histórico - Exceção:', error);
    return {
      error: 'Erro ao conectar com o serviço de histórico',
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca o histórico de pesquisas de um usuário
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
  console.log('[DEBUG] Buscando histórico - URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('[DEBUG] Buscando histórico - Status:', response.status);

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
        console.log('[DEBUG] Buscando histórico - Erro JSON:', errorDetails);
      } catch (e) {
        errorDetails = await response.text();
        console.log('[DEBUG] Buscando histórico - Erro texto:', errorDetails);
      }

      return {
        error: `Falha ao buscar histórico: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();
    console.log('[DEBUG] Buscando histórico - Resposta:', data);

    // A API retorna os dados no formato: { status: "success", data: { pesquisas: [...] } }
    if (data.data && Array.isArray(data.data.pesquisas)) {
      console.log('[DEBUG] Buscando histórico - Array em data.data.pesquisas:', data.data.pesquisas.length, 'itens');
      return data.data.pesquisas as HistoryItem[];
    } else if (Array.isArray(data)) {
      console.log('[DEBUG] Buscando histórico - Array direto:', data.length, 'itens');
      return data as HistoryItem[];
    } else if (data.historico && Array.isArray(data.historico)) {
      console.log('[DEBUG] Buscando histórico - Array em data.historico:', data.historico.length, 'itens');
      return data.historico as HistoryItem[];
    } else {
      console.log('[DEBUG] Buscando histórico - Formato inesperado, retornando vazio');
      return [];
    }
  } catch (error) {
    console.error('[DEBUG] Buscando histórico - Exceção:', error);
    return {
      error: 'Erro ao conectar com o serviço de histórico',
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Deleta (soft delete) uma pesquisa do histórico
 */
export async function deleteSearchHistory(
  id: string
): Promise<DeleteHistoryResponse | ApiError> {
  const url = `${HISTORY_API_BASE_URL}/historico/pesquisa/${id}`;
  console.log('[DEBUG] Deletando histórico - URL:', url);

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('[DEBUG] Deletando histórico - Status:', response.status);

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
        console.log('[DEBUG] Deletando histórico - Erro JSON:', errorDetails);
      } catch (e) {
        errorDetails = await response.text();
        console.log('[DEBUG] Deletando histórico - Erro texto:', errorDetails);
      }

      return {
        error: `Falha ao deletar histórico: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const result = await response.json();
    console.log('[DEBUG] Deletando histórico - Sucesso:', result);
    return { success: true, message: result.message || 'Histórico deletado com sucesso' };
  } catch (error) {
    console.error('[DEBUG] Deletando histórico - Exceção:', error);
    return {
      error: 'Erro ao conectar com o serviço de histórico',
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}
