/**
 * Server Actions para API SEI
 *
 * Este arquivo mantém a interface pública original para compatibilidade com o código existente.
 * A implementação foi refatorada e consolidada em src/lib/sei-api-client.ts
 */

'use server';

import type {
  ProcessoData,
  ApiError,
  ProcessSummaryResponse,
  LoginCredentials,
  ClientLoginResponse,
  UnidadeAberta,
  DocumentosResponse,
  SessionTokenAuth
} from '@/types/process-flow';

import {
  loginToSEI as loginToSEIImpl,
  fetchProcessData,
  fetchOpenUnits,
  fetchProcessSummary as fetchProcessSummaryImpl,
  fetchDocuments,
  fetchDocumentSummary as fetchDocumentSummaryImpl,
  checkSEIApiHealth as checkSEIApiHealthImpl,
  checkSummaryApiHealth as checkSummaryApiHealthImpl,
  type HealthCheckResponse
} from '@/lib/sei-api-client';

export type { HealthCheckResponse };

/**
 * Login na API SEI
 */
export async function loginToSEI(credentials: LoginCredentials): Promise<ClientLoginResponse> {
  return loginToSEIImpl(credentials);
}

/**
 * Obtém token de autenticação
 * @deprecated Use diretamente o sessionToken do hook usePersistedAuth
 */
export async function getAuthToken(auth: LoginCredentials | SessionTokenAuth): Promise<string | ApiError> {
  if ('sessionToken' in auth) {
    const token = auth.sessionToken;

    // Validação do token
    if (!token || token === 'undefined' || token === 'null') {
      return { error: "Token de autenticação inválido", status: 401 };
    }

    // Se o token contém dados corrompidos, retorna erro
    if (typeof token === 'string' && token.startsWith('{') && token.includes('usuario')) {
      return { error: "Token corrompido detectado. Faça login novamente.", status: 401 };
    }

    return token;
  }

  // Se são credenciais, retorna erro pois essa função não deve fazer login
  return { error: "Use loginToSEI para autenticar com credenciais.", status: 400 };
}

/**
 * Busca dados do processo (andamentos) usando sessionToken
 */
export async function fetchProcessDataFromSEIWithToken(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessoData | ApiError> {
  return fetchProcessData(token, protocoloProcedimento, unidadeId);
}

/**
 * Busca dados do processo (andamentos) usando credenciais
 * @deprecated Prefira usar fetchProcessDataFromSEIWithToken com sessionToken
 */
export async function fetchProcessDataFromSEI(
  auth: LoginCredentials | SessionTokenAuth,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessoData | ApiError> {
  const token = 'sessionToken' in auth ? auth.sessionToken : '';
  if (token) {
    return fetchProcessData(token, protocoloProcedimento, unidadeId);
  }
  return { error: "Formato de autenticação inválido", status: 400 };
}

/**
 * Busca unidades abertas usando sessionToken
 */
export async function fetchOpenUnitsForProcessWithToken(
  token: string,
  protocoloProcedimento: string,
  unidadeOrigemConsulta: string
): Promise<{unidades: UnidadeAberta[], linkAcesso?: string} | ApiError> {
  return fetchOpenUnits(token, protocoloProcedimento, unidadeOrigemConsulta);
}

/**
 * Busca unidades abertas usando credenciais
 * @deprecated Prefira usar fetchOpenUnitsForProcessWithToken com sessionToken
 */
export async function fetchOpenUnitsForProcess(
  auth: LoginCredentials | SessionTokenAuth,
  protocoloProcedimento: string,
  unidadeOrigemConsulta: string
): Promise<{unidades: UnidadeAberta[], linkAcesso?: string} | ApiError> {
  const token = 'sessionToken' in auth ? auth.sessionToken : '';
  if (token) {
    return fetchOpenUnits(token, protocoloProcedimento, unidadeOrigemConsulta);
  }
  return { error: "Formato de autenticação inválido", status: 400 };
}

/**
 * Busca resumo do processo usando sessionToken
 */
export async function fetchProcessSummaryWithToken(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  return fetchProcessSummaryImpl(token, protocoloProcedimento, unidadeId);
}

/**
 * Busca resumo do processo usando credenciais
 * @deprecated Prefira usar fetchProcessSummaryWithToken com sessionToken
 */
export async function fetchProcessSummary(
  auth: LoginCredentials | SessionTokenAuth,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  const token = 'sessionToken' in auth ? auth.sessionToken : '';
  if (token) {
    return fetchProcessSummaryImpl(token, protocoloProcedimento, unidadeId);
  }
  return { error: "Formato de autenticação inválido", status: 400 };
}

/**
 * Busca documentos usando sessionToken
 */
export async function fetchDocumentsFromSEIWithToken(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string,
  pagina: number = 1,
  quantidade: number = 10
): Promise<DocumentosResponse | ApiError> {
  return fetchDocuments(token, protocoloProcedimento, unidadeId, pagina, quantidade);
}

/**
 * Busca documentos usando credenciais
 * @deprecated Prefira usar fetchDocumentsFromSEIWithToken com sessionToken
 */
export async function fetchDocumentsFromSEI(
  auth: LoginCredentials | SessionTokenAuth,
  protocoloProcedimento: string,
  unidadeId: string,
  pagina: number = 1,
  quantidade: number = 10
): Promise<DocumentosResponse | ApiError> {
  const token = 'sessionToken' in auth ? auth.sessionToken : '';
  if (token) {
    return fetchDocuments(token, protocoloProcedimento, unidadeId, pagina, quantidade);
  }
  return { error: "Formato de autenticação inválido", status: 400 };
}

/**
 * Busca resumo de documento específico
 */
export async function fetchDocumentSummary(
  auth: LoginCredentials | SessionTokenAuth,
  documentoFormatado: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  const token = 'sessionToken' in auth ? auth.sessionToken : '';
  if (token) {
    return fetchDocumentSummaryImpl(token, documentoFormatado, unidadeId);
  }
  return { error: "Formato de autenticação inválido", status: 400 };
}

/**
 * Verifica saúde da API SEI
 */
export async function checkSEIApiHealth(): Promise<HealthCheckResponse> {
  return checkSEIApiHealthImpl();
}

/**
 * Verifica saúde da API de Resumos
 */
export async function checkSummaryApiHealth(): Promise<HealthCheckResponse> {
  return checkSummaryApiHealthImpl();
}
