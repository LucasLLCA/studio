
'use server';

import type { ProcessoData, ApiError, ProcessSummaryResponse, LoginCredentials, ClientLoginResponse, UnidadeFiltro, SEILoginApiResponse, UnidadeAberta } from '@/types/process-flow';

const SEI_API_BASE_URL = process.env.NEXT_PUBLIC_SEI_API_BASE_URL;
const SUMMARY_API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "http://127.0.0.1:8000";

export interface HealthCheckResponse {
  isOnline: boolean;
  status: 'online' | 'offline' | 'error';
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

// This function now requires credentials to be passed in.
async function getAuthToken(credentials: LoginCredentials): Promise<string | ApiError> {
  if (!SEI_API_BASE_URL) {
    console.error("[SEI API Auth] SEI API_BASE_URL environment variable is not set.");
    return { error: "Configuração do servidor incompleta: API Base URL não definida.", status: 500 };
  }
  if (!credentials || !credentials.usuario || !credentials.senha || !credentials.orgao) {
    console.error("[SEI API Auth] Credentials not provided to getAuthToken.");
    return { error: "Credenciais de autenticação não fornecidas.", status: 400 };
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
      console.error(`[SEI API Auth] Authentication failed with provided credentials: ${response.status}`, errorDetails);
      if (response.status === 401 && errorDetails && typeof (errorDetails as any).Message === 'string') {
        return { error: `Falha na autenticação: ${(errorDetails as any).Message}`, details: errorDetails, status: response.status };
      }
      return { error: `Falha na autenticação com a API SEI: ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json() as SEILoginApiResponse;
    if (!data.Token) {
      console.error("[SEI API Auth] Token not found in authentication response:", data);
      return { error: "Token não encontrado na resposta da autenticação da API SEI.", details: data, status: 500 };
    }
    console.log(`[SEI API Auth] Auth token obtained successfully.`);
    return data.Token;
  } catch (error) {
    console.error("[SEI API Auth] Error fetching auth token:", error);
    return { error: "Erro ao conectar com o serviço de autenticação da API SEI.", details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function loginToSEI(credentials: LoginCredentials): Promise<ClientLoginResponse> {
  if (!SEI_API_BASE_URL) {
    return { success: false, error: "Configuração do servidor incompleta: API Base URL não definida.", status: 500 };
  }
  if (!credentials || !credentials.usuario || !credentials.senha || !credentials.orgao) {
    return { success: false, error: "Credenciais de login incompletas.", status: 400 };
  }

  console.log(`[SEI Login Action] Attempting login for user: ${credentials.usuario}, orgao: ${credentials.orgao}`);
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
    
    console.log("[SEI Login Action] Login API response status:", response.status);
    const responseText = await response.text(); 
    // console.log("[SEI Login Action] Login API response text:", responseText); // Can be very verbose

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = responseText;
      }
      console.error(`[SEI Login Action] Login failed: ${response.status}`, errorDetails);
      const errorMessage = (errorDetails as any)?.Message || `Falha no login. Status: ${response.status}`;
      return { success: false, error: errorMessage, details: errorDetails, status: response.status };
    }

    const data = JSON.parse(responseText) as SEILoginApiResponse;
    console.log("[SEI Login Action] Raw login API response data (parsed):", JSON.stringify(data, null, 2));
    console.log("[SEI Login Action] Attempting to access data.Unidades. Value:", data.Unidades);


    if (!data.Token) {
      console.error("[SEI Login Action] Token not returned by login API, even though response was ok. Data:", data);
      return { success: false, error: "Token não retornado pela API de login.", details: data, status: 500 };
    }
    console.log("[SEI Login Action] Login successful, token received.");
    

    const unidades: UnidadeFiltro[] = (data.Unidades || []).map(ua => ({
      Id: ua.Id,
      Sigla: ua.Sigla,
      Descricao: ua.Descricao,
    }));

    if (!data.Unidades || unidades.length === 0) {
        console.warn("[SEI Login Action] Login successful, but no Unidades returned by the API or the array was empty. Raw data.Unidades (after potential undefined):", data.Unidades, "Mapped unidades count:", unidades.length);
    } else {
        console.log(`[SEI Login Action] Mapped ${unidades.length} unidades de acesso.`);
    }

    return { success: true, token: data.Token, unidades };

  } catch (error) {
    console.error("[SEI Login Action] Error during login:", error);
    return { success: false, error: "Erro de conexão ao tentar fazer login.", details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}


async function fetchAndamentosApiCall(
  credentials: LoginCredentials,
  protocoloProcedimento: string,
  unidadeId: string,
  pagina: number,
  quantidade: number
): Promise<ProcessoData | ApiError> {
  const tokenResult = await getAuthToken(credentials);
  if (typeof tokenResult !== 'string') {
    return tokenResult;
  }
  const token = tokenResult;

  const encodedProtocolo = encodeURIComponent(protocoloProcedimento);
  const url = `${SEI_API_BASE_URL}/unidades/${unidadeId}/procedimentos/andamentos?protocolo_procedimento=${encodedProtocolo}&sinal_atributos=S&pagina=${pagina}&quantidade=${quantidade}`;

  console.log(`[SEI API Andamentos] Tentando buscar URL: ${url}`);

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
      console.error(`[SEI API Andamentos] Falha ao buscar dados do processo (URL: ${url}, Status: ${response.status})`, errorDetails);
      return { error: `Falha ao buscar dados do processo na API SEI (pagina ${pagina}, quantidade ${quantidade}): ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json();
    if (data && data.Info && (data.Andamentos !== undefined || (quantidade === 0 && data.Andamentos === undefined))) {
      if (!data.Info.NumeroProcesso && protocoloProcedimento) {
        data.Info.NumeroProcesso = protocoloProcedimento;
      }
      if (quantidade > 0 && !Array.isArray(data.Andamentos)) {
         console.warn(`[SEI API Andamentos] 'Andamentos' não é um array na resposta para ${protocoloProcedimento}, mas quantidade=${quantidade} > 0. Tratando como lista vazia. Resposta:`, data);
        data.Andamentos = [];
      } else if (data.Andamentos === undefined && quantidade === 0) {
        data.Andamentos = [];
      }
      return data as ProcessoData;
    } else {
      console.error(`[SEI API Andamentos] Estrutura de dados inválida recebida da API SEI (pagina ${pagina}, quantidade ${quantidade}), mesmo com status OK:`, data);
      return {
        error: "Formato de dados inesperado recebido da API de andamentos SEI.",
        details: data,
        status: response.status === 200 ? 500 : response.status
      };
    }
  } catch (error) {
    console.error(`[SEI API Andamentos] Erro ao buscar dados do processo (pagina ${pagina}, quantidade ${quantidade}):`, error);
    return { error: `Erro ao conectar com o serviço de dados do processo da API SEI (pagina ${pagina}, quantidade ${quantidade}).`, details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function fetchProcessDataFromSEI(
  credentials: LoginCredentials,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessoData | ApiError> {
  if (!SEI_API_BASE_URL) {
    console.error("[SEI API Andamentos] SEI API Base URL environment variable is not set.");
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
  }
   if (!credentials) {
    return { error: "Credenciais de autenticação são obrigatórias.", status: 401 };
  }
  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar andamentos.", status: 400 };
  }

  console.log(`[SEI API Andamentos] Etapa 1: Buscando contagem total de itens para o processo ${protocoloProcedimento}`);
  const countResponse = await fetchAndamentosApiCall(credentials, protocoloProcedimento, unidadeId, 1, 0);

  if ('error' in countResponse) {
    console.error("[SEI API Andamentos] Erro ao buscar contagem de itens:", countResponse);
    return countResponse;
  }

  const totalItens = countResponse.Info?.TotalItens;

  if (typeof totalItens !== 'number' || totalItens < 0) {
    console.error("[SEI API Andamentos] TotalItens não é um número válido ou está ausente na resposta da contagem:", countResponse.Info);
    return { error: "Não foi possível obter a contagem total de andamentos da API SEI.", details: countResponse.Info, status: 500 };
  }

  if (totalItens === 0) {
    console.log(`[SEI API Andamentos] Processo ${protocoloProcedimento} não possui andamentos registrados na unidade ${unidadeId} (API SEI).`);
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

  console.log(`[SEI API Andamentos] Etapa 2: Buscando todos os ${totalItens} andamentos para o processo ${protocoloProcedimento}`);
  const allItemsResponse = await fetchAndamentosApiCall(credentials, protocoloProcedimento, unidadeId, 1, totalItens);

  if ('error' in allItemsResponse) {
     console.error("[SEI API Andamentos] Erro ao buscar todos os andamentos:", allItemsResponse);
    return allItemsResponse;
  }

  const finalProcessoData: ProcessoData = {
    Info: {
      Pagina: 1,
      TotalPaginas: 1,
      QuantidadeItens: allItemsResponse.Andamentos?.length || 0,
      TotalItens: totalItens,
      NumeroProcesso: allItemsResponse.Info?.NumeroProcesso || protocoloProcedimento,
    },
    Andamentos: allItemsResponse.Andamentos || [],
  };

  return finalProcessoData;
}

export async function fetchOpenUnitsForProcess(
  credentials: LoginCredentials,
  protocoloProcedimento: string,
  unidadeOrigemConsulta: string
): Promise<UnidadeAberta[] | ApiError> {
  if (!SEI_API_BASE_URL) {
    console.error("[SEI API Consulta] SEI API Base URL environment variable is not set.");
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
  }
   if (!credentials) {
    return { error: "Credenciais de autenticação são obrigatórias.", status: 401 };
  }
  if (!protocoloProcedimento || !unidadeOrigemConsulta) {
    return { error: "Número do processo e unidade de origem da consulta são obrigatórios para unidades abertas.", status: 400 };
  }

  const tokenResult = await getAuthToken(credentials);
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
  }).toString();

  const url = `${SEI_API_BASE_URL}/unidades/${unidadeOrigemConsulta}/procedimentos/consulta?${queryParams}`;

  console.log(`[SEI API Consulta] Tentando buscar URL para unidades abertas: ${url}`);

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
      console.error(`[SEI API Consulta] Falha ao buscar unidades abertas (URL: ${url}, Status: ${response.status})`, errorDetails);
      return { error: `Falha ao buscar unidades com processo aberto na API SEI: ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json() as { UnidadesProcedimentoAberto?: UnidadeAberta[] };


    if (data && data.UnidadesProcedimentoAberto) {
      return data.UnidadesProcedimentoAberto;
    } else if (data && !data.UnidadesProcedimentoAberto) {
      return [];
    } else {
      console.error("[SEI API Consulta] Estrutura de dados inválida recebida da API de consulta SEI:", data);
      return { error: "Formato de dados inesperado da API de consulta SEI.", details: data, status: 500 };
    }
  } catch (error) {
    console.error("[SEI API Consulta] Erro ao buscar unidades abertas:", error);
    return { error: "Erro ao conectar com o serviço de consulta de processo da API SEI.", details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function fetchProcessSummary(
  credentials: LoginCredentials,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (!protocoloProcedimento) {
    return { error: "Número do processo é obrigatório para buscar o resumo.", status: 400 };
  }
  if (!unidadeId) {
    return { error: "ID da Unidade é obrigatório para buscar o resumo.", status: 400 };
  }
  if (!credentials) {
    return { error: "Credenciais de autenticação são obrigatórias para buscar o resumo.", status: 401 };
  }

  const tokenResult = await getAuthToken(credentials);
  if (typeof tokenResult !== 'string') {
    console.error("[Summary API - Process] Falha ao obter token para API de resumo do processo:", tokenResult.error);
    return { error: `Falha ao autenticar para buscar resumo do processo: ${tokenResult.error}`, status: tokenResult.status || 401, details: tokenResult.details };
  }
  const token = tokenResult;

  const formattedProcessNumber = protocoloProcedimento.replace(/[.\/-]/g, "");
  
  const summaryApiUrl = `${SUMMARY_API_BASE_URL}/processo/resumo-completo/${formattedProcessNumber}?token=${encodeURIComponent(token)}&id_unidade=${encodeURIComponent(unidadeId)}`;

  if (!process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL) {
    console.warn("[Summary API - Process] NEXT_PUBLIC_SUMMARY_API_BASE_URL não está definida. Usando fallback.");
  }
  console.log(`[Summary API - Process] Buscando resumo de processo: ${summaryApiUrl}`);

  try {
    const response = await fetch(summaryApiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
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
        userFriendlyError = `Resumo não encontrado para o processo ${protocoloProcedimento} na unidade ${unidadeId}. Verifique os dados ou se há um resumo disponível.`;
      } else if (response.status === 500) {
        userFriendlyError = `Erro interno no servidor da API de resumo ao processar ${protocoloProcedimento}.`;
      }

      console.error(`[Summary API - Process] Falha ao buscar resumo (URL: ${summaryApiUrl}, Status: ${response.status})`, errorDetails);
      return {
        error: userFriendlyError,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();

    if (data && data.resumo && data.resumo.resumo_combinado && typeof data.resumo.resumo_combinado.resposta_ia === 'string') {
      const summaryText = data.resumo.resumo_combinado.resposta_ia;
      console.log(`[Summary API - Process] Resumo do processo obtido para ${protocoloProcedimento}. Tamanho: ${summaryText.length}`);
      return { summary: summaryText };
    } else {
      console.error("[Summary API - Process] Formato da resposta do resumo do processo inesperado:", data);
      return { error: "Formato da resposta do resumo do processo inesperado da API.", details: data, status: 500 };
    }
  } catch (error) {
    console.error("[Summary API - Process] Erro na requisição de resumo do processo:", error);
    let errorMessage = "Falha na requisição para a API de resumo do processo.";
     if (error instanceof TypeError && (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("load failed"))) {
        errorMessage = `Não foi possível conectar à API de resumo. Verifique se o serviço está disponível.`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { error: errorMessage, details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

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
    
    // Usar um endpoint simples que não requer autenticação para verificar se a API está respondendo
    const response = await fetch(`${SEI_API_BASE_URL}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // A API está online se responder com qualquer status HTTP 
    // Mesmo 404, 401, 405 indicam que a API está funcionando
    // Apenas 500+ indicam problemas reais do servidor
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
      
      // Tratar diferentes tipos de erro de conexão
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
    
    // Tentar o endpoint /health primeiro, se não existir, tentar a raiz
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
      // Se /health falhar, tentar a raiz da API
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

    // A API está online se responder com qualquer status HTTP
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
      
      // Tratar diferentes tipos de erro de conexão
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


export async function fetchDocumentSummary(
  credentials: LoginCredentials,
  documentoFormatado: string, // This is the 8-9 digit document number
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (!documentoFormatado) {
    return { error: "Número do documento é obrigatório para buscar o resumo.", status: 400 };
  }
  if (!unidadeId) {
    return { error: "ID da Unidade é obrigatório para buscar o resumo do documento.", status: 400 };
  }
  if (!credentials) {
    return { error: "Credenciais de autenticação são obrigatórias para buscar o resumo do documento.", status: 401 };
  }

  const tokenResult = await getAuthToken(credentials);
  if (typeof tokenResult !== 'string') {
    console.error("[Summary API - Document] Falha ao obter token para API de resumo do documento:", tokenResult.error);
    return { error: `Falha ao autenticar para buscar resumo do documento: ${tokenResult.error}`, status: tokenResult.status || 401, details: tokenResult.details };
  }
  const token = tokenResult;
  
  const summaryApiUrl = `${SUMMARY_API_BASE_URL}/processo/resumo-documento/${documentoFormatado}?token=${encodeURIComponent(token)}&id_unidade=${encodeURIComponent(unidadeId)}`;

  if (!process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL) {
    console.warn("[Summary API - Document] NEXT_PUBLIC_SUMMARY_API_BASE_URL não está definida. Usando fallback.");
  }
  console.log(`[Summary API - Document] Buscando resumo de documento: ${summaryApiUrl}`);

  try {
    const response = await fetch(summaryApiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
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
      
      console.error(`[Summary API - Document] Falha ao buscar resumo (URL: ${summaryApiUrl}, Status: ${response.status})`, errorDetails);
      return {
        error: userFriendlyError,
        details: errorDetails,
        status: response.status
      };
    }

    const data = await response.json();

    // Path to summary is data.resumo.resumo.resposta_ia
    if (data && data.resumo && data.resumo.resumo && typeof data.resumo.resumo.resposta_ia === 'string') {
      const summaryText = data.resumo.resumo.resposta_ia;
      console.log(`[Summary API - Document] Resumo do documento ${documentoFormatado} obtido. Tamanho: ${summaryText.length}`);
      return { summary: summaryText };
    } else {
      console.error("[Summary API - Document] Formato da resposta do resumo do documento inesperado:", data);
      return { error: "Formato da resposta do resumo do documento inesperado da API.", details: data, status: 500 };
    }
  } catch (error) {
    console.error("[Summary API - Document] Erro na requisição de resumo do documento:", error);
    let errorMessage = "Falha na requisição para a API de resumo do documento.";
     if (error instanceof TypeError && (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("load failed"))) {
        errorMessage = `Não foi possível conectar à API de resumo. Verifique se o serviço está disponível.`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { error: errorMessage, details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
