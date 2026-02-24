import type {
  ProcessoData,
  ApiError,
  ProcessSummaryResponse,
  DocumentosResponse,
} from '@/types/process-flow';
import { getApiBaseUrl, validateToken, fetchWithErrorHandling, extractUserFriendlyError } from './fetch-utils';
import { stripProcessNumber } from '@/lib/utils';

export async function fetchProcessData(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string,
  parcial: boolean = false
): Promise<ProcessoData | ApiError> {
  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar andamentos.", status: 400 };
  }

  const tokenError = validateToken(token);
  if (tokenError) return tokenError;

  const parcialParam = parcial ? '&parcial=true' : '';
  const url = `${getApiBaseUrl()}/sei/andamentos/${encodeURIComponent(stripProcessNumber(protocoloProcedimento))}?id_unidade=${encodeURIComponent(unidadeId)}${parcialParam}`;

  return fetchWithErrorHandling<ProcessoData>(
    url,
    {
      method: 'GET',
      headers: {
        'X-SEI-Token': token,
        'accept': 'application/json',
      },
    },
    'Falha ao buscar andamentos do processo'
  );
}

export async function fetchProcessSummary(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (!protocoloProcedimento) {
    return { error: "Número do processo é obrigatório para buscar o resumo.", status: 400 };
  }
  if (!unidadeId) {
    return { error: "ID da Unidade é obrigatório para buscar o resumo.", status: 400 };
  }

  const tokenError = validateToken(token);
  if (tokenError) return tokenError;

  const cleanProcessNumber = stripProcessNumber(protocoloProcedimento);
  const summaryApiUrl = `${getApiBaseUrl()}/processo/resumo-completo/${cleanProcessNumber}?id_unidade=${encodeURIComponent(unidadeId)}`;

  try {
    const response = await fetch(summaryApiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-SEI-Token': token,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        const textError = await response.text().catch(() => `Resposta não é JSON nem texto.`);
        errorDetails = textError;
      }

      const userFriendlyError = extractUserFriendlyError(errorDetails, response.status, `buscar resumo do processo ${protocoloProcedimento}`);
      return { error: userFriendlyError, details: errorDetails, status: response.status };
    }

    const data = await response.json();

    if (data?.resumo?.resumo_combinado && typeof data.resumo.resumo_combinado.resposta_ia === 'string') {
      return { summary: data.resumo.resumo_combinado.resposta_ia };
    }
    return { error: "Formato da resposta do resumo do processo inesperado da API.", details: data, status: 500 };
  } catch (error) {
    let errorMessage = "Falha na requisição para a API de resumo do processo.";
    if (error instanceof TypeError && (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("load failed"))) {
      errorMessage = `Não foi possível conectar à API de resumo. Verifique se o serviço está disponível.`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage, details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function fetchDocumentSummary(
  token: string,
  documentoFormatado: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (!documentoFormatado) {
    return { error: "Número do documento é obrigatório para buscar o resumo.", status: 400 };
  }
  if (!unidadeId) {
    return { error: "ID da Unidade é obrigatório para buscar o resumo do documento.", status: 400 };
  }

  const tokenError = validateToken(token);
  if (tokenError) return tokenError;

  const summaryApiUrl = `${getApiBaseUrl()}/processo/resumo-documento/${documentoFormatado}?id_unidade=${encodeURIComponent(unidadeId)}`;

  try {
    const response = await fetch(summaryApiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-SEI-Token': token,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        const textError = await response.text().catch(() => `Resposta não é JSON nem texto.`);
        errorDetails = textError;
      }

      const userFriendlyError = extractUserFriendlyError(errorDetails, response.status, `buscar resumo do documento ${documentoFormatado}`);
      return { error: userFriendlyError, details: errorDetails, status: response.status };
    }

    const data = await response.json();

    if (data?.resumo?.resumo && typeof data.resumo.resumo.resposta_ia === 'string') {
      return { summary: data.resumo.resumo.resposta_ia };
    }
    return { error: "Formato da resposta do resumo do documento inesperado da API.", details: data, status: 500 };
  } catch (error) {
    let errorMessage = "Falha na requisição para a API de resumo do documento.";
    if (error instanceof TypeError && (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("load failed"))) {
      errorMessage = `Não foi possível conectar à API de resumo. Verifique se o serviço está disponível.`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage, details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function fetchDocuments(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string,
  parcial: boolean = false
): Promise<DocumentosResponse | ApiError> {
  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar documentos.", status: 400 };
  }

  const tokenError = validateToken(token);
  if (tokenError) return tokenError;

  const parcialParam = parcial ? '&parcial=true' : '';
  const url = `${getApiBaseUrl()}/sei/documentos/${encodeURIComponent(stripProcessNumber(protocoloProcedimento))}?id_unidade=${encodeURIComponent(unidadeId)}${parcialParam}`;

  return fetchWithErrorHandling<DocumentosResponse>(
    url,
    {
      method: 'GET',
      headers: {
        'X-SEI-Token': token,
        'accept': 'application/json',
      },
    },
    'Falha ao buscar documentos do processo'
  );
}

export async function invalidateProcessCache(
  protocoloProcedimento: string
): Promise<{ success: boolean; keysDeleted?: number }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/sei/cache/${encodeURIComponent(stripProcessNumber(protocoloProcedimento))}`, {
      method: 'DELETE',
      headers: { 'accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return { success: true, keysDeleted: data.keys_deleted };
  } catch {
    return { success: false };
  }
}
