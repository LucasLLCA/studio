
'use server';

import type { ProcessoData, Andamento, ProcessoInfo } from '@/types/process-flow';

// Ensure these are set in your .env.local or server environment variables
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

async function fetchAndamentosPage(
  protocoloProcedimento: string,
  unidadeId: string,
  token: string,
  pagina: number
): Promise<ProcessoData | ApiError> {
  const encodedProtocolo = encodeURIComponent(protocoloProcedimento);
  const url = `${SEI_API_BASE_URL}/unidades/${unidadeId}/procedimentos/andamentos?protocolo_procedimento=${encodedProtocolo}&sinal_atributos=S&pagina=${pagina}`;
  
  console.log(`[SEI API] Tentando buscar URL (página ${pagina}): ${url}`);
  
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
      return { error: `Falha ao buscar dados do processo (página ${pagina}): ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json();
    if (data && data.Andamentos && Array.isArray(data.Andamentos) && data.Info) {
      // Add NumeroProcesso to Info if it's missing but was used in the query
      if (!data.Info.NumeroProcesso && protocoloProcedimento) {
        data.Info.NumeroProcesso = protocoloProcedimento;
      }
      return data as ProcessoData;
    } else {
      console.error("Estrutura de dados inválida recebida da API (página ${pagina}), mesmo com status OK:", data);
      return { 
        error: "Formato de dados inesperado recebido da API.", 
        details: data, 
        status: response.status === 200 ? 500 : response.status 
      };
    }
  } catch (error) {
    console.error(`Erro ao buscar dados do processo (página ${pagina}):`, error);
    return { error: `Erro ao conectar com o serviço de dados do processo (página ${pagina}).`, details: error instanceof Error ? error.message : String(error), status: 500 };
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

  // Fetch first page
  const firstPageResult = await fetchAndamentosPage(protocoloProcedimento, unidadeId, token, 1);
  if ('error' in firstPageResult) {
    return firstPageResult;
  }

  const allAndamentos: Andamento[] = [...firstPageResult.Andamentos];
  const firstPageInfo: ProcessoInfo = firstPageResult.Info;

  if (firstPageInfo.TotalPaginas && firstPageInfo.TotalPaginas > 1) {
    console.log(`[SEI API] Total de páginas para buscar: ${firstPageInfo.TotalPaginas}`);
    for (let i = 2; i <= firstPageInfo.TotalPaginas; i++) {
      const subsequentPageResult = await fetchAndamentosPage(protocoloProcedimento, unidadeId, token, i);
      if ('error' in subsequentPageResult) {
        // Optionally, return partial data with a warning, or fail completely
        // For now, fail completely if any page fails after the first
        console.error(`Erro ao buscar página ${i}. Retornando erro.`, subsequentPageResult);
        return { 
            error: `Falha ao buscar todos os andamentos. Erro na página ${i}: ${subsequentPageResult.error}`, 
            details: subsequentPageResult.details, 
            status: subsequentPageResult.status 
        };
      }
      allAndamentos.push(...subsequentPageResult.Andamentos);
      console.log(`[SEI API] Página ${i} buscada. Total de andamentos acumulados: ${allAndamentos.length}`);
    }
  }
  
  // Construct the final ProcessoData object with all andamentos
  const finalProcessoData: ProcessoData = {
    Info: {
      Pagina: 1, // Consolidated result
      TotalPaginas: 1, // Consolidated result
      QuantidadeItens: allAndamentos.length,
      TotalItens: firstPageInfo.TotalItens, // Grand total from the API
      NumeroProcesso: firstPageInfo.NumeroProcesso || protocoloProcedimento,
    },
    Andamentos: allAndamentos,
  };

  return finalProcessoData;
}
