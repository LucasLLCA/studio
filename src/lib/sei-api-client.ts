'use server';

import type {
  ProcessoData,
  ApiError,
  ProcessSummaryResponse,
  LoginCredentials,
  ClientLoginResponse,
  UnidadeFiltro,
  SEILoginApiResponse,
  UnidadeAberta,
  DocumentosResponse
} from '@/types/process-flow';

const API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "http://127.0.0.1:8000";

export interface HealthCheckResponse {
  isOnline: boolean;
  status: 'online' | 'offline' | 'error';
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Login na API SEI via backend proxy
 */
export async function loginToSEI(credentials: LoginCredentials): Promise<ClientLoginResponse> {
  if (!credentials || !credentials.usuario || !credentials.senha || !credentials.orgao) {
    return { success: false, error: "Credenciais de login incompletas.", status: 400 };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/sei/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        usuario: credentials.usuario,
        senha: credentials.senha,
        orgao: credentials.orgao,
      }),
      cache: 'no-store',
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = responseText;
      }

      // Backend returns 401 with plain string detail for auth failures
      if (response.status === 401) {
        const message = typeof errorDetails === 'string'
          ? errorDetails
          : (errorDetails as any)?.detail || (errorDetails as any)?.Message || `Falha no login. Status: ${response.status}`;
        return { success: false, error: `Falha na autenticação: ${message}`, details: errorDetails, status: response.status };
      }

      const errorMessage = (errorDetails as any)?.detail || (errorDetails as any)?.Message || `Falha no login. Status: ${response.status}`;
      return { success: false, error: errorMessage, details: errorDetails, status: response.status };
    }

    const data = JSON.parse(responseText) as SEILoginApiResponse;

    const idUnidadeAtualFromAPI = data.Login?.IdUnidadeAtual;
    const nomeUsuarioFromAPI =
      data.Login?.Nome ||
      (data as { Nome?: string }).Nome ||
      (data as { Usuario?: { Nome?: string } }).Usuario?.Nome;

    if (!data.Token) {
      return { success: false, error: "Token não retornado pela API de login.", details: data, status: 500 };
    }

    const unidades: UnidadeFiltro[] = (data.Unidades || []).map(ua => ({
      Id: ua.Id,
      Sigla: ua.Sigla,
      Descricao: ua.Descricao,
    }));

    const tokenToReturn = typeof data.Token === 'string' ? data.Token : String(data.Token);
    const idUnidadeAtual = idUnidadeAtualFromAPI;

    return {
      success: true,
      token: tokenToReturn,
      unidades,
      idUnidadeAtual,
      nomeUsuario: nomeUsuarioFromAPI
    };

  } catch (error) {
    return {
      success: false,
      error: "Erro de conexão ao tentar fazer login.",
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca andamentos de um processo via backend proxy
 */
export async function fetchProcessData(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessoData | ApiError> {
  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar andamentos.", status: 400 };
  }

  if (!token || token === 'undefined' || token === 'null') {
    return { error: "Token de autenticação inválido", status: 401 };
  }

  const url = `${API_BASE_URL}/sei/andamentos/${encodeURIComponent(protocoloProcedimento)}?id_unidade=${encodeURIComponent(unidadeId)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-SEI-Token': token,
        'accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }
      return {
        error: `Falha ao buscar andamentos do processo: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();
    return data as ProcessoData;
  } catch (error) {
    return {
      error: "Erro ao conectar com o serviço para buscar andamentos do processo.",
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca unidades abertas para um processo via backend proxy
 */
export async function fetchOpenUnits(
  token: string,
  protocoloProcedimento: string,
  unidadeOrigemConsulta: string
): Promise<{unidades: UnidadeAberta[], linkAcesso?: string} | ApiError> {
  if (!protocoloProcedimento || !unidadeOrigemConsulta) {
    return { error: "Número do processo e unidade de origem são obrigatórios.", status: 400 };
  }

  if (!token || token === 'undefined' || token === 'null') {
    return { error: "Token de autenticação inválido", status: 401 };
  }

  const url = `${API_BASE_URL}/sei/unidades-abertas/${encodeURIComponent(protocoloProcedimento)}?id_unidade=${encodeURIComponent(unidadeOrigemConsulta)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-SEI-Token': token,
        'accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }
      return {
        error: `Falha ao buscar unidades com processo aberto: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json() as { UnidadesProcedimentoAberto?: UnidadeAberta[], LinkAcesso?: string };

    return {
      unidades: data.UnidadesProcedimentoAberto || [],
      linkAcesso: data.LinkAcesso
    };
  } catch (error) {
    return {
      error: "Erro ao conectar com o serviço para consultar unidades abertas.",
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca resumo do processo via backend (already uses backend)
 */
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

  if (!token || token === 'undefined' || token === 'null') {
    return { error: "Token de autenticação inválido", status: 401 };
  }

  const formattedProcessNumber = protocoloProcedimento.replace(/[.\/-]/g, "");
  const summaryApiUrl = `${API_BASE_URL}/processo/resumo-completo/${formattedProcessNumber}?id_unidade=${encodeURIComponent(unidadeId)}`;

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
      let userFriendlyError = `Erro ${response.status} ao buscar resumo do processo.`;

      try {
        errorDetails = await response.json();
        if (errorDetails && typeof (errorDetails as any).detail === 'string') {
          userFriendlyError = (errorDetails as any).detail;
        } else if (errorDetails && typeof (errorDetails as any).message === 'string') {
          userFriendlyError = (errorDetails as any).message;
        }
      } catch (e) {
        const textError = await response.text().catch(() => `Resposta não é JSON nem texto.`);
        errorDetails = textError;
        if (typeof textError === 'string' && textError.length > 0 && textError.length < 200) {
           userFriendlyError = textError;
        }
      }

      if (response.status === 401) {
         userFriendlyError = `Não autorizado a buscar resumo do processo. Verifique o token e id_unidade. (API Resumo)`;
      } else if (response.status === 404) {
        userFriendlyError = `Resumo não encontrado para o processo ${protocoloProcedimento} na unidade ${unidadeId}.`;
      } else if (response.status === 500) {
        userFriendlyError = `Erro interno no servidor da API de resumo ao processar ${protocoloProcedimento}.`;
      }

      return {
        error: userFriendlyError,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();

    if (data && data.resumo && data.resumo.resumo_combinado && typeof data.resumo.resumo_combinado.resposta_ia === 'string') {
      const summaryText = data.resumo.resumo_combinado.resposta_ia;
      return { summary: summaryText };
    } else {
      return { error: "Formato da resposta do resumo do processo inesperado da API.", details: data, status: 500 };
    }
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

/**
 * Busca documentos do processo via backend proxy
 */
export async function fetchDocuments(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<DocumentosResponse | ApiError> {
  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar documentos.", status: 400 };
  }

  if (!token || token === 'undefined' || token === 'null') {
    return { error: "Token de autenticação inválido", status: 401 };
  }

  const url = `${API_BASE_URL}/sei/documentos/${encodeURIComponent(protocoloProcedimento)}?id_unidade=${encodeURIComponent(unidadeId)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-SEI-Token': token,
        'accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }
      return {
        error: `Falha ao buscar documentos do processo: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();
    return data as DocumentosResponse;
  } catch (error) {
    return {
      error: "Erro ao conectar com o serviço para buscar documentos do processo.",
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca resumo de um documento via backend (already uses backend)
 */
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

  if (!token || token === 'undefined' || token === 'null') {
    return { error: "Token de autenticação inválido", status: 401 };
  }

  const summaryApiUrl = `${API_BASE_URL}/processo/resumo-documento/${documentoFormatado}?id_unidade=${encodeURIComponent(unidadeId)}`;

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
      let userFriendlyError = `Erro ${response.status} ao buscar resumo do documento ${documentoFormatado}.`;

      try {
        errorDetails = await response.json();
         if (errorDetails && typeof (errorDetails as any).detail === 'string') {
          userFriendlyError = (errorDetails as any).detail;
        } else if (errorDetails && typeof (errorDetails as any).message === 'string') {
          userFriendlyError = (errorDetails as any).message;
        }
      } catch (e) {
        const textError = await response.text().catch(() => `Resposta não é JSON nem texto.`);
        errorDetails = textError;
        if (typeof textError === 'string' && textError.length > 0 && textError.length < 200) {
           userFriendlyError = textError;
        }
      }

      if (response.status === 401) {
         userFriendlyError = `Não autorizado a buscar resumo do documento. Verifique o token e id_unidade. (API Resumo)`;
      } else if (response.status === 404) {
        userFriendlyError = `Resumo não encontrado para o documento ${documentoFormatado} na unidade ${unidadeId}.`;
      } else if (response.status === 500) {
        userFriendlyError = `Erro interno no servidor da API de resumo ao processar documento ${documentoFormatado}.`;
      }

      return {
        error: userFriendlyError,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();

    if (data && data.resumo && data.resumo.resumo && typeof data.resumo.resumo.resposta_ia === 'string') {
      const summaryText = data.resumo.resumo.resposta_ia;
      return { summary: summaryText };
    } else {
      return { error: "Formato da resposta do resumo do documento inesperado da API.", details: data, status: 500 };
    }
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

/**
 * Invalida o cache proxy de um processo no backend
 */
export async function invalidateProcessCache(
  protocoloProcedimento: string
): Promise<{ success: boolean; keysDeleted?: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/sei/cache/${encodeURIComponent(protocoloProcedimento)}`, {
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

/**
 * Verifica saúde da API SEI via backend proxy
 */
export async function checkSEIApiHealth(): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/sei/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const data = await response.json();

    if (data.online) {
      return {
        isOnline: true,
        status: 'online',
        responseTime,
        timestamp
      };
    } else {
      return {
        isOnline: false,
        status: 'offline',
        responseTime,
        error: `API SEI respondeu com status ${data.status_code}`,
        timestamp
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isOnline: false,
          status: 'offline',
          responseTime,
          error: 'Timeout: API não respondeu em 10 segundos',
          timestamp
        };
      }

      let cleanError = 'Serviço indisponível';
      if (error.message.toLowerCase().includes('econnreset')) {
        cleanError = 'Conexão resetada pelo servidor';
      } else if (error.message.toLowerCase().includes('failed to fetch') || error.message.toLowerCase().includes('load failed')) {
        cleanError = 'Serviço indisponível';
      } else if (error.message.toLowerCase().includes('timeout')) {
        cleanError = 'Timeout na conexão';
      } else if (error.message.toLowerCase().includes('network')) {
        cleanError = 'Erro de rede';
      }

      return {
        isOnline: false,
        status: 'error',
        responseTime,
        error: cleanError,
        timestamp
      };
    }

    return {
      isOnline: false,
      status: 'error',
      responseTime,
      error: 'Erro desconhecido ao verificar API',
      timestamp
    };
  }
}

/**
 * Verifica saúde da API de Resumos (backend)
 */
export async function checkSummaryApiHealth(): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  const timestamp = new Date();

  if (!API_BASE_URL) {
    return {
      isOnline: false,
      status: 'error',
      error: 'API Base URL não configurada',
      timestamp
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store'
      });
    } catch (e) {
      response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store'
      });
    }

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      isOnline: true,
      status: 'online',
      responseTime,
      timestamp
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isOnline: false,
          status: 'offline',
          responseTime,
          error: 'Timeout: API não respondeu em 10 segundos',
          timestamp
        };
      }

      let cleanError = 'Serviço indisponível';
      if (error.message.toLowerCase().includes('econnreset')) {
        cleanError = 'Conexão resetada pelo servidor';
      } else if (error.message.toLowerCase().includes('failed to fetch') || error.message.toLowerCase().includes('load failed')) {
        cleanError = 'Serviço indisponível';
      } else if (error.message.toLowerCase().includes('timeout')) {
        cleanError = 'Timeout na conexão';
      } else if (error.message.toLowerCase().includes('network')) {
        cleanError = 'Erro de rede';
      }

      return {
        isOnline: false,
        status: 'error',
        responseTime,
        error: cleanError,
        timestamp
      };
    }

    return {
      isOnline: false,
      status: 'error',
      responseTime,
      error: 'Erro desconhecido ao verificar API de resumo',
      timestamp
    };
  }
}
