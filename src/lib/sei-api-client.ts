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
import { AUTH_CONFIG } from '@/config/constants';

const SEI_API_BASE_URL = process.env.NEXT_PUBLIC_SEI_API_BASE_URL;
const SUMMARY_API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "http://127.0.0.1:8000";

export interface HealthCheckResponse {
  isOnline: boolean;
  status: 'online' | 'offline' | 'error';
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

// Cache de tokens com expiração
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Resolve um token de autenticação de forma unificada
 * Aceita tanto um token direto quanto credenciais
 */
async function resolveToken(tokenOrCredentials: string | LoginCredentials): Promise<string | ApiError> {
  // Se já é uma string, retorna diretamente
  if (typeof tokenOrCredentials === 'string') {
    if (!tokenOrCredentials || tokenOrCredentials === 'undefined' || tokenOrCredentials === 'null') {
      return { error: "Token de autenticação inválido", status: 401 };
    }
    return tokenOrCredentials;
  }

  // Se são credenciais, faz login
  const credentials = tokenOrCredentials;

  if (!credentials || !credentials.usuario || !credentials.senha || !credentials.orgao) {
    return { error: "Credenciais de autenticação não fornecidas.", status: 400 };
  }

  // Verificar cache
  const cacheKey = `${credentials.usuario}-${credentials.orgao}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  // Fazer login
  if (!SEI_API_BASE_URL) {
    return { error: "Configuração do servidor incompleta: API Base URL não definida.", status: 500 };
  }

  try {
    const response = await fetch(`${SEI_API_BASE_URL}/orgaos/usuarios/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        Usuario: credentials.usuario,
        Senha: credentials.senha,
        Orgao: credentials.orgao,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }

      if (response.status === 401 && errorDetails && typeof (errorDetails as any).Message === 'string') {
        return { error: `Falha na autenticação: ${(errorDetails as any).Message}`, details: errorDetails, status: response.status };
      }
      return { error: `Falha na autenticação com a API SEI: ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json() as SEILoginApiResponse;

    if (!data.Token) {
      return { error: "Token não encontrado na resposta da autenticação da API SEI.", details: data, status: 500 };
    }

    // Armazenar token no cache
    const expiresAt = Date.now() + AUTH_CONFIG.TOKEN_CACHE_DURATION_MS;
    tokenCache.set(cacheKey, { token: data.Token, expiresAt });

    return data.Token;
  } catch (error) {
    return {
      error: "Erro ao conectar com o serviço de autenticação da API SEI.",
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Função de login separada para obter token + unidades
 */
export async function loginToSEI(credentials: LoginCredentials): Promise<ClientLoginResponse> {
  if (!SEI_API_BASE_URL) {
    return { success: false, error: "Configuração do servidor incompleta: API Base URL não definida.", status: 500 };
  }

  if (!credentials || !credentials.usuario || !credentials.senha || !credentials.orgao) {
    return { success: false, error: "Credenciais de login incompletas.", status: 400 };
  }

  try {
    const response = await fetch(`${SEI_API_BASE_URL}/orgaos/usuarios/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        Usuario: credentials.usuario,
        Senha: credentials.senha,
        Orgao: credentials.orgao,
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

      const errorMessage = (errorDetails as any)?.Message || `Falha no login. Status: ${response.status}`;
      return { success: false, error: errorMessage, details: errorDetails, status: response.status };
    }

    const data = JSON.parse(responseText) as SEILoginApiResponse;

    // CORREÇÃO: IdUnidadeAtual vem em data.Login.IdUnidadeAtual, não em data.IdUnidadeAtual
    const idUnidadeAtualFromAPI = data.Login?.IdUnidadeAtual;

    console.log('[DEBUG] Resposta da API SEI no login:', {
      hasToken: !!data.Token,
      hasLogin: !!data.Login,
      hasIdUnidadeAtual: !!idUnidadeAtualFromAPI,
      idUnidadeAtual: idUnidadeAtualFromAPI,
      unidadesCount: data.Unidades?.length || 0
    });

    if (!data.Token) {
      return { success: false, error: "Token não retornado pela API de login.", details: data, status: 500 };
    }

    const unidades: UnidadeFiltro[] = (data.Unidades || []).map(ua => ({
      Id: ua.Id,
      Sigla: ua.Sigla,
      Descricao: ua.Descricao,
    }));

    const tokenToReturn = typeof data.Token === 'string' ? data.Token : String(data.Token);

    // Usar o IdUnidadeAtual da API (de dentro de Login)
    const idUnidadeAtual = idUnidadeAtualFromAPI;

    console.log('[DEBUG] IdUnidadeAtual determinado:', {
      fromAPI: idUnidadeAtualFromAPI,
      final: idUnidadeAtual
    });

    return { 
      success: true, 
      token: tokenToReturn, 
      unidades,
      idUnidadeAtual 
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
 * Busca andamentos de um processo - VERSÃO UNIFICADA
 * Aceita token string OU credenciais
 */
export async function fetchProcessData(
  tokenOrCredentials: string | LoginCredentials,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessoData | ApiError> {
  if (!SEI_API_BASE_URL) {
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
  }

  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar andamentos.", status: 400 };
  }

  const tokenResult = await resolveToken(tokenOrCredentials);
  if (typeof tokenResult !== 'string') {
    return tokenResult;
  }
  const token = tokenResult;

  // Etapa 1: Buscar contagem total
  const countResponse = await fetchAndamentosCall(token, protocoloProcedimento, unidadeId, 1, 0);
  if ('error' in countResponse) {
    return countResponse;
  }

  const totalItens = countResponse.Info?.TotalItens;
  if (typeof totalItens !== 'number' || totalItens < 0) {
    return { error: "Não foi possível obter a contagem total de andamentos da API SEI.", details: countResponse.Info, status: 500 };
  }

  if (totalItens === 0) {
    return {
      Info: {
        ...countResponse.Info,
        Pagina: 1,
        TotalPaginas: 1,
        QuantidadeItens: 0,
        TotalItens: 0,
        NumeroProcesso: countResponse.Info?.NumeroProcesso || protocoloProcedimento,
      },
      Andamentos: [],
    };
  }

  // Etapa 2: Buscar todos os andamentos
  const allItemsResponse = await fetchAndamentosCall(token, protocoloProcedimento, unidadeId, 1, totalItens);
  if ('error' in allItemsResponse) {
    return allItemsResponse;
  }

  return {
    Info: {
      Pagina: 1,
      TotalPaginas: 1,
      QuantidadeItens: allItemsResponse.Andamentos?.length || 0,
      TotalItens: totalItens,
      NumeroProcesso: allItemsResponse.Info?.NumeroProcesso || protocoloProcedimento,
    },
    Andamentos: allItemsResponse.Andamentos || [],
  };
}

/**
 * Função auxiliar interna para chamadas de andamentos
 */
async function fetchAndamentosCall(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string,
  pagina: number,
  quantidade: number
): Promise<ProcessoData | ApiError> {
  const queryParams = new URLSearchParams({
    protocolo_procedimento: protocoloProcedimento,
    sinal_atributos: 'S',
    sinal_resumo: 'N',
    sinal_datas_protocolo: 'N',
    sinal_unidade_origem: 'N',
    pagina: pagina.toString(),
    quantidade: quantidade.toString()
  });

  const url = `${SEI_API_BASE_URL}/unidades/${unidadeId}/procedimentos/andamentos?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token,
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
        error: `Falha ao buscar dados do processo na API SEI (pagina ${pagina}, quantidade ${quantidade}): ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();

    if (data && data.Info && (data.Andamentos !== undefined || (quantidade === 0 && data.Andamentos === undefined))) {
      if (!data.Info.NumeroProcesso && protocoloProcedimento) {
        data.Info.NumeroProcesso = protocoloProcedimento;
      }

      if (quantidade > 0 && !Array.isArray(data.Andamentos)) {
        data.Andamentos = [];
      } else if (data.Andamentos === undefined && quantidade === 0) {
        data.Andamentos = [];
      }

      return data as ProcessoData;
    } else {
      return {
        error: "Formato de dados inesperado recebido da API de andamentos SEI.",
        details: data,
        status: response.status === 200 ? 500 : response.status
      };
    }
  } catch (error) {
    return {
      error: `Erro ao conectar com o serviço de dados do processo da API SEI (pagina ${pagina}, quantidade ${quantidade}).`,
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca unidades abertas para um processo - VERSÃO UNIFICADA
 */
export async function fetchOpenUnits(
  tokenOrCredentials: string | LoginCredentials,
  protocoloProcedimento: string,
  unidadeOrigemConsulta: string
): Promise<{unidades: UnidadeAberta[], linkAcesso?: string} | ApiError> {
  if (!SEI_API_BASE_URL) {
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
  }

  if (!protocoloProcedimento || !unidadeOrigemConsulta) {
    return { error: "Número do processo e unidade de origem da consulta são obrigatórios para unidades abertas.", status: 400 };
  }

  const tokenResult = await resolveToken(tokenOrCredentials);
  if (typeof tokenResult !== 'string') {
    return tokenResult;
  }
  const token = tokenResult;

  const queryParams = new URLSearchParams({
    protocolo_procedimento: protocoloProcedimento,
    sinal_unidades_procedimento_aberto: 'S',
    sinal_completo: 'N',
    sinal_assuntos: 'N',
    sinal_interessados: 'N',
    sinal_observacoes: 'N',
    sinal_andamento_geracao: 'N',
    sinal_andamento_conclusao: 'N',
    sinal_ultimo_andamento: 'N',
    sinal_procedimentos_relacionados: 'N',
    sinal_procedimentos_anexados: 'N',
  });

  const url = `${SEI_API_BASE_URL}/unidades/${unidadeOrigemConsulta}/procedimentos/consulta?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token,
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
        error: `Falha ao buscar unidades com processo aberto na API SEI: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json() as { UnidadesProcedimentoAberto?: UnidadeAberta[], LinkAcesso?: string };

    if (data && data.UnidadesProcedimentoAberto) {
      return {
        unidades: data.UnidadesProcedimentoAberto,
        linkAcesso: data.LinkAcesso
      };
    } else if (data && !data.UnidadesProcedimentoAberto) {
      return {
        unidades: [],
        linkAcesso: data.LinkAcesso
      };
    } else {
      return { error: "Formato de dados inesperado da API de consulta SEI.", details: data, status: 500 };
    }
  } catch (error) {
    return {
      error: "Erro ao conectar com o serviço de consulta de processo da API SEI.",
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca resumo do processo - VERSÃO UNIFICADA
 */
export async function fetchProcessSummary(
  tokenOrCredentials: string | LoginCredentials,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (!protocoloProcedimento) {
    return { error: "Número do processo é obrigatório para buscar o resumo.", status: 400 };
  }

  if (!unidadeId) {
    return { error: "ID da Unidade é obrigatório para buscar o resumo.", status: 400 };
  }

  const tokenResult = await resolveToken(tokenOrCredentials);
  if (typeof tokenResult !== 'string') {
    return tokenResult;
  }
  const token = tokenResult;

  const formattedProcessNumber = protocoloProcedimento.replace(/[.\/-]/g, "");
  const summaryApiUrl = `${SUMMARY_API_BASE_URL}/processo/resumo-completo/${formattedProcessNumber}?id_unidade=${encodeURIComponent(unidadeId)}`;

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
 * Busca documentos do processo - VERSÃO UNIFICADA
 */
export async function fetchDocuments(
  tokenOrCredentials: string | LoginCredentials,
  protocoloProcedimento: string,
  unidadeId: string,
  pagina: number = 1,
  quantidade: number = 10
): Promise<DocumentosResponse | ApiError> {
  if (!SEI_API_BASE_URL) {
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
  }

  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar documentos.", status: 400 };
  }

  const tokenResult = await resolveToken(tokenOrCredentials);
  if (typeof tokenResult !== 'string') {
    return tokenResult;
  }
  const token = tokenResult;

  const queryParams = new URLSearchParams({
    protocolo_procedimento: protocoloProcedimento,
    pagina: pagina.toString(),
    quantidade: quantidade.toString(),
    sinal_completo: 'S'
  });

  const url = `${SEI_API_BASE_URL}/unidades/${unidadeId}/procedimentos/documentos?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token,
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
        error: `Falha ao buscar documentos do processo na API SEI: ${response.status}`,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();

    if (data && data.Info && Array.isArray(data.Documentos)) {
      return data as DocumentosResponse;
    } else {
      return {
        error: "Formato de dados inesperado recebido da API de documentos SEI.",
        details: data,
        status: response.status === 200 ? 500 : response.status
      };
    }
  } catch (error) {
    return {
      error: `Erro ao conectar com o serviço de documentos da API SEI.`,
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * Busca resumo de um documento específico - VERSÃO UNIFICADA
 */
export async function fetchDocumentSummary(
  tokenOrCredentials: string | LoginCredentials,
  documentoFormatado: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (!documentoFormatado) {
    return { error: "Número do documento é obrigatório para buscar o resumo.", status: 400 };
  }

  if (!unidadeId) {
    return { error: "ID da Unidade é obrigatório para buscar o resumo do documento.", status: 400 };
  }

  const tokenResult = await resolveToken(tokenOrCredentials);
  if (typeof tokenResult !== 'string') {
    return tokenResult;
  }
  const token = tokenResult;

  const summaryApiUrl = `${SUMMARY_API_BASE_URL}/processo/resumo-documento/${documentoFormatado}?id_unidade=${encodeURIComponent(unidadeId)}`;

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
 * Verifica saúde da API SEI
 */
export async function checkSEIApiHealth(): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  const timestamp = new Date();

  if (!SEI_API_BASE_URL) {
    return {
      isOnline: false,
      status: 'error',
      error: 'SEI API Base URL não configurada',
      timestamp
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${SEI_API_BASE_URL}/orgaos?pagina=1&quantidade=10`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
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
        error: `API respondeu com status ${response.status}`,
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
 * Verifica saúde da API de Resumos
 */
export async function checkSummaryApiHealth(): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  const timestamp = new Date();

  if (!SUMMARY_API_BASE_URL) {
    return {
      isOnline: false,
      status: 'error',
      error: 'Summary API Base URL não configurada',
      timestamp
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(`${SUMMARY_API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store'
      });
    } catch (e) {
      response = await fetch(`${SUMMARY_API_BASE_URL}/`, {
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
