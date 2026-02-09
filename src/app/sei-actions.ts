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
} from '@/lib/sei-api-client';

import type { HealthCheckResponse } from '@/lib/sei-api-client';

import {
  mockLogin,
  mockProcessData,
  mockDocuments,
  mockOpenUnits,
  mockProcessSummary,
  mockHealthCheck,
} from '@/lib/mock-data';

import { cookies } from 'next/headers';
import { compactDecrypt } from 'jose';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_DATA === 'true';


/**
 * Login na API SEI
 */
export async function loginToSEI(credentials: LoginCredentials): Promise<ClientLoginResponse> {
  if (MOCK_MODE) return mockLogin();
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
  if (MOCK_MODE) return mockProcessData();
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
  if (MOCK_MODE) return mockProcessData();
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
  if (MOCK_MODE) return mockOpenUnits();
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
  if (MOCK_MODE) return mockOpenUnits();
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
  if (MOCK_MODE) return mockProcessSummary();
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
  if (MOCK_MODE) return mockProcessSummary();
  const token = 'sessionToken' in auth ? auth.sessionToken : '';
  if (token) {
    return fetchProcessSummaryImpl(token, protocoloProcedimento, unidadeId);
  }
  return { error: "Formato de autenticação inválido", status: 400 };
}

/**
 * Busca documentos usando sessionToken
 * Sem limite de quantidade - busca todos os documentos disponíveis
 */
export async function fetchDocumentsFromSEIWithToken(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string
): Promise<DocumentosResponse | ApiError> {
  if (MOCK_MODE) return mockDocuments();
  return fetchDocuments(token, protocoloProcedimento, unidadeId, 1, 999999);
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
  if (MOCK_MODE) return mockDocuments();
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
  if (MOCK_MODE) return mockProcessSummary();
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
  if (MOCK_MODE) return mockHealthCheck();
  return checkSEIApiHealthImpl();
}

/**
 * Verifica saúde da API de Resumos
 */
export async function checkSummaryApiHealth(): Promise<HealthCheckResponse> {
  if (MOCK_MODE) return mockHealthCheck();
  return checkSummaryApiHealthImpl();
}

/**
 * Decrypts SEI credentials from the SEI_CREDENTIALS cookie (JWE token).
 * Returns LoginCredentials if valid, null otherwise.
 */
export async function decryptSEICredentials(): Promise<LoginCredentials | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get('SEI_CREDENTIALS');
    if (!cookie?.value) return null;

    const jweSecret = process.env.JWE_SECRET_KEY;
    if (!jweSecret) {
      console.error('[decryptSEICredentials] JWE_SECRET_KEY not configured');
      return null;
    }

    // Decode the base64url-encoded 256-bit key
    const keyBytes = Uint8Array.from(atob(jweSecret.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    if (keyBytes.length !== 32) {
      console.error('[decryptSEICredentials] JWE_SECRET_KEY must be 32 bytes');
      return null;
    }

    const { plaintext } = await compactDecrypt(cookie.value, keyBytes);
    const payload = JSON.parse(new TextDecoder().decode(plaintext));

    // Map JWE payload fields (email/password) to LoginCredentials fields (usuario/senha)
    if (!payload.email || !payload.password || !payload.orgao) {
      console.error('[decryptSEICredentials] Invalid payload structure');
      return null;
    }

    return {
      usuario: payload.email,
      senha: payload.password,
      orgao: payload.orgao,
    };
  } catch (error) {
    console.error('[decryptSEICredentials] Failed to decrypt credentials:', error);
    return null;
  }
}

/**
 * Decrypts a raw JWE token string (from URL query param) into LoginCredentials.
 * Unlike decryptSEICredentials(), this does NOT read from a cookie.
 */
export async function decryptJWEToken(jweToken: string): Promise<LoginCredentials | null> {
  try {
    const jweSecret = process.env.JWE_SECRET_KEY;
    if (!jweSecret) {
      console.error('[decryptJWEToken] JWE_SECRET_KEY not configured');
      return null;
    }

    const keyBytes = Uint8Array.from(atob(jweSecret.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    if (keyBytes.length !== 32) {
      console.error('[decryptJWEToken] JWE_SECRET_KEY must be 32 bytes');
      return null;
    }

    const { plaintext } = await compactDecrypt(jweToken, keyBytes);
    const payload = JSON.parse(new TextDecoder().decode(plaintext));

    if (!payload.email || !payload.password || !payload.orgao) {
      console.error('[decryptJWEToken] Invalid payload structure');
      return null;
    }

    return {
      usuario: payload.email,
      senha: payload.password,
      orgao: payload.orgao,
    };
  } catch (error) {
    console.error('[decryptJWEToken] Failed to decrypt token:', error);
    return null;
  }
}

/**
 * Clears the SEI_CREDENTIALS cookie after auto-login.
 */
export async function clearSEICredentialsCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('SEI_CREDENTIALS');
}
