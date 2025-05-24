
'use server';

import type { ProcessoData } from '@/types/process-flow';

// Ensure these are set in your .env.local or server environment variables
const SEI_API_BASE_URL = process.env.NEXT_PUBLIC_SEI_API_BASE_URL;
const SEI_API_USER = process.env.SEI_API_USER;
const SEI_API_PASSWORD = process.env.SEI_API_PASSWORD;
const SEI_API_ORGAO = process.env.SEI_API_ORGAO;

interface AuthTokenResponse {
  Token: string;
  // Include other fields if needed, based on the actual response structure
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

  const encodedProtocolo = encodeURIComponent(protocoloProcedimento);
  const url = `${SEI_API_BASE_URL}/unidades/${unidadeId}/procedimentos/andamentos?protocolo_procedimento=${encodedProtocolo}&sinal_atributos=S&pagina=1`;
  
  console.log(`[SEI API] Tentando buscar URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
       let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }
      console.error(`Falha ao buscar dados do processo (URL: ${url}): ${response.status}`, errorDetails);
      return { error: `Falha ao buscar dados do processo: ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json();
    // Basic validation for ProcessoData structure
    if (data && data.Andamentos && Array.isArray(data.Andamentos) && data.Info) {
      return data as ProcessoData;
    } else {
      console.error("Estrutura de dados inválida recebida da API, mesmo com status OK:", data);
      return { error: "Formato de dados inesperado recebido da API.", details: data, status: response.status === 200 ? 500 : response.status };
    }

  } catch (error) {
    console.error("Erro ao buscar dados do processo:", error);
    return { error: "Erro ao conectar com o serviço de dados do processo.", details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
