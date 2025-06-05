
'use server';

import type { ProcessoData, ConsultaProcessoResponse, UnidadeAberta, ApiError, ProcessSummaryResponse } from '@/types/process-flow';

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


async function getAuthToken(): Promise<string | ApiError> {
  if (!SEI_API_BASE_URL || !SEI_API_USER || !SEI_API_PASSWORD || !SEI_API_ORGAO) {
    console.error("[SEI API Auth] SEI API environment variables are not set.");
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
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
      cache: 'no-store', 
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = await response.text();
      }
      console.error(`[SEI API Auth] Authentication failed: ${response.status}`, errorDetails);
      return { error: `Falha na autenticação com a API SEI: ${response.status}`, details: errorDetails, status: response.status };
    }

    const data = await response.json() as AuthTokenResponse;
    if (!data.Token) {
      console.error("[SEI API Auth] Token not found in authentication response:", data);
      return { error: "Token não encontrado na resposta da autenticação da API SEI.", details: data, status: 500 };
    }
    console.log(`[SEI API Auth] Token de autenticação obtido (início): ${data.Token.substring(0, 20)}...`);
    return data.Token;
  } catch (error) {
    console.error("[SEI API Auth] Error fetching auth token:", error);
    return { error: "Erro ao conectar com o serviço de autenticação da API SEI.", details: error instanceof Error ? error.message : String(error), status: 500 };
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
  
  console.log(`[SEI API Andamentos] Tentando buscar URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
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
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessoData | ApiError> {
  if (!SEI_API_BASE_URL) {
    console.error("[SEI API Andamentos] SEI API Base URL environment variable is not set.");
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
  }
  if (!protocoloProcedimento || !unidadeId) {
    return { error: "Número do processo e unidade são obrigatórios para buscar andamentos.", status: 400 };
  }

  const tokenResult = await getAuthToken();
  if (typeof tokenResult !== 'string') {
    return tokenResult; 
  }
  const token = tokenResult;

  console.log(`[SEI API Andamentos] Etapa 1: Buscando contagem total de itens para o processo ${protocoloProcedimento}`);
  const countResponse = await fetchAndamentosApiCall(protocoloProcedimento, unidadeId, token, 1, 0);
  
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
  const allItemsResponse = await fetchAndamentosApiCall(protocoloProcedimento, unidadeId, token, 1, totalItens);

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
  protocoloProcedimento: string,
  unidadeOrigemConsulta: string
): Promise<UnidadeAberta[] | ApiError> {
  if (!SEI_API_BASE_URL) {
    console.error("[SEI API Consulta] SEI API Base URL environment variable is not set.");
    return { error: "Configuração do servidor incompleta para acessar a API SEI.", status: 500 };
  }
  if (!protocoloProcedimento || !unidadeOrigemConsulta) {
    return { error: "Número do processo e unidade de origem da consulta são obrigatórios para unidades abertas.", status: 400 };
  }

  const tokenResult = await getAuthToken();
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
        'Content-Type': 'application/json',
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

    const data = await response.json() as ConsultaProcessoResponse;

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
  protocoloProcedimento: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (!protocoloProcedimento) {
    return { error: "Número do processo é obrigatório para buscar o resumo.", status: 400 };
  }

  const formattedProcessNumber = protocoloProcedimento.replace(/[.\/-]/g, "");
  // A URL da API de resumo deve vir de uma variável de ambiente para flexibilidade
  const summaryApiUrl = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL}/resumo_completo/${formattedProcessNumber}`
    : `http://127.0.0.1:8000/resumo_completo/${formattedProcessNumber}`; // Fallback para desenvolvimento

  if (!process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL) {
    console.warn("[Summary API] NEXT_PUBLIC_SUMMARY_API_BASE_URL não está definida. Usando fallback http://127.0.0.1:8000");
  }
  
  console.log(`[Summary API] Buscando resumo de: ${summaryApiUrl}`);

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
        if (errorDetails && typeof errorDetails.detail === 'string') {
          userFriendlyError = errorDetails.detail;
        }
      } catch (e) {
        errorDetails = await response.text().catch(() => `Resposta não é JSON nem texto.`);
        if (typeof errorDetails === 'string' && errorDetails.length > 0 && errorDetails.length < 200) {
           userFriendlyError = errorDetails; // Use a resposta textual se for curta e informativa
        }
      }
      
      if (response.status === 404) {
        userFriendlyError = `Resumo não encontrado para o processo ${protocoloProcedimento}. Verifique o número ou se há um resumo disponível.`;
      } else if (response.status === 500) {
        userFriendlyError = `Erro interno no servidor da API de resumo ao processar ${protocoloProcedimento}.`;
      }
      
      console.error(`[Summary API] Falha ao buscar resumo (URL: ${summaryApiUrl}, Status: ${response.status})`, errorDetails);
      return { 
        error: userFriendlyError, 
        details: errorDetails, 
        status: response.status 
      };
    }

    const data = await response.json();

    if (data && data.resumo && data.resumo.resumo_combinado && typeof data.resumo.resumo_combinado.resposta_ia === 'string') {
      const summaryText = data.resumo.resumo_combinado.resposta_ia;
      console.log(`[Summary API] Resumo obtido para ${protocoloProcedimento}. Tamanho: ${summaryText.length}`);
      return { summary: summaryText };
    } else {
      console.error("[Summary API] Formato da resposta do resumo inesperado:", data);
      return { error: "Formato da resposta do resumo inesperado da API.", details: data, status: 500 };
    }
  } catch (error) {
    console.error("[Summary API] Erro na requisição de resumo:", error);
    let errorMessage = "Falha na requisição para a API de resumo.";
    if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
        errorMessage = "Não foi possível conectar à API de resumo. Verifique se o serviço está rodando e acessível no endereço configurado, e se as configurações de CORS da API de resumo permitem esta origem.";
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { error: errorMessage, details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
