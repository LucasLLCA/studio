
'use server';

import type { ProcessoData, Andamento, ProcessoInfo } from '@/types/process-flow';

const SEI_API_BASE_URL = process.env.NEXT_PUBLIC_SEI_API_BASE_URL;
const SEI_API_USER = process.env.SEI_API_USER;
const SEI_API_PASSWORD = process.env.SEI_API_PASSWORD;
const SEI_API_ORGAO = process.env.SEI_API_ORGAO;

interface AuthTokenResponse {
  Token: string;
  Login?: {
    IdLogin?: string;
  };
}

interface ApiError {
  error: string;
  details?: any;
  status?: number;
}

async function getAuthToken(): Promise<string | ApiError> {
  if (!SEI_API_BASE_URL || !SEI_API_USER || !SEI_API_PASSWORD || !SEI_API_ORGAO) {
    console.error("SEI API environment variables are not set.");
    return { error: "Configuração do servidor incompleta para acessar a API.", status: 500 };
  }

  try {
    const response = await fetch(`${SEI_API_BASE_URL}/orgaos/usuarios/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Usuario: SEI_API_USER,
        Senha: SEI_API_PASSWORD,
        Orgao: SEI_API_ORGAO,
      }),
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }
      console.error(`Authentication failed: ${response.status}`, errorDetails);
      return { error: `Falha na autenticação: ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json() as AuthTokenResponse;
    if (!data.Token) {
      console.error("Token not found in authentication response:", data);
      return { error: "Token não encontrado na resposta da autenticação.", details: data, status: 500 };
    }
    console.log(`[SEI API] Token de autenticação obtido (início): ${data.Token.substring(0, 20)}...`);
    return data.Token;
  } catch (error) {
    console.error("Error fetching auth token:", error);
    return { error: "Erro ao conectar com o serviço de autenticação.", details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

async function fetchAndamentosApiCall(
  protocoloProcedimento: string,
  unidadeId: string,
  token: string,
  pagina: number,
  quantidade: number
): Promise<ProcessoData | ApiError> {
  const encodedProtocolo = encodeURIComponent(protocoloProcedimento);
  const url = `${SEI_API_BASE_URL}/unidades/${unidadeId}/procedimentos/andamentos?protocolo_procedimento=${encodedProtocolo}&sinal_atributos=S&pagina=${pagina}&quantidade=${quantidade}`;
  
  console.log(`[SEI API] Tentando buscar URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }
      console.error(`Falha ao buscar dados do processo (URL: ${url}, Status: ${response.status})`, errorDetails);
      return { error: `Falha ao buscar dados do processo (pagina ${pagina}, quantidade ${quantidade}): ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json();
     // Mesmo com status OK, precisamos validar a estrutura mínima esperada.
    if (data && data.Info && (data.Andamentos || quantidade === 0)) { // Se quantidade é 0, Andamentos pode não vir ou ser vazio.
      // Add NumeroProcesso to Info if it's missing but was used in the query
      if (!data.Info.NumeroProcesso && protocoloProcedimento) {
        data.Info.NumeroProcesso = protocoloProcedimento;
      }
       // Garante que Andamentos seja um array, mesmo que vazio, se não presente e quantidade > 0
      if (quantidade > 0 && !Array.isArray(data.Andamentos)) {
        data.Andamentos = [];
      }
      return data as ProcessoData;
    } else {
      console.error(`Estrutura de dados inválida recebida da API (pagina ${pagina}, quantidade ${quantidade}), mesmo com status OK:`, data);
      return { 
        error: "Formato de dados inesperado recebido da API.", 
        details: data, 
        status: response.status === 200 ? 500 : response.status 
      };
    }
  } catch (error) {
    console.error(`Erro ao buscar dados do processo (pagina ${pagina}, quantidade ${quantidade}):`, error);
    return { error: `Erro ao conectar com o serviço de dados do processo (pagina ${pagina}, quantidade ${quantidade}).`, details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function fetchProcessDataFromSEI(
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessoData | ApiError> {
  if (!SEI_API_BASE_URL) {
    console.error("SEI API Base URL environment variable is not set.");
    return { error: "Configuração do servidor incompleta para acessar a API.", status: 500 };
  }
  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios.", status: 400 };
  }

  const tokenResult = await getAuthToken();
  if (typeof tokenResult !== 'string') {
    return tokenResult; // This is an ApiError object from getAuthToken
  }
  const token = tokenResult;

  // Primeira chamada: obter a contagem total de itens
  console.log(`[SEI API] Etapa 1: Buscando contagem total de itens para o processo ${protocoloProcedimento}`);
  const countResponse = await fetchAndamentosApiCall(protocoloProcedimento, unidadeId, token, 1, 0);
  
  if ('error' in countResponse) {
    console.error("[SEI API] Erro ao buscar contagem de itens:", countResponse);
    return countResponse;
  }

  const totalItens = countResponse.Info?.TotalItens;

  if (typeof totalItens !== 'number' || totalItens < 0) {
    console.error("[SEI API] TotalItens não é um número válido ou está ausente na resposta da contagem:", countResponse.Info);
    return { error: "Não foi possível obter a contagem total de andamentos da API.", details: countResponse.Info, status: 500 };
  }
  
  if (totalItens === 0) {
    console.log(`[SEI API] Processo ${protocoloProcedimento} não possui andamentos registrados.`);
    return {
      Info: {
        ...countResponse.Info,
        Pagina: 1,
        TotalPaginas: 1, // Ou 0, dependendo da preferência
        QuantidadeItens: 0,
        TotalItens: 0,
        NumeroProcesso: countResponse.Info?.NumeroProcesso || protocoloProcedimento,
      },
      Andamentos: [],
    };
  }

  // Segunda chamada: buscar todos os itens
  console.log(`[SEI API] Etapa 2: Buscando todos os ${totalItens} andamentos para o processo ${protocoloProcedimento}`);
  const allItemsResponse = await fetchAndamentosApiCall(protocoloProcedimento, unidadeId, token, 1, totalItens);

  if ('error' in allItemsResponse) {
     console.error("[SEI API] Erro ao buscar todos os andamentos:", allItemsResponse);
    return allItemsResponse;
  }
  
  // Construir o objeto ProcessoData final com todos os andamentos
  const finalProcessoData: ProcessoData = {
    Info: {
      Pagina: 1, // Resultado consolidado
      TotalPaginas: 1, // Resultado consolidado
      QuantidadeItens: allItemsResponse.Andamentos?.length || 0,
      TotalItens: totalItens, // Total real da API
      NumeroProcesso: allItemsResponse.Info?.NumeroProcesso || protocoloProcedimento,
    },
    Andamentos: allItemsResponse.Andamentos || [],
  };

  return finalProcessoData;
}
