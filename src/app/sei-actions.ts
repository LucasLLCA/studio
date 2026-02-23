/**
 * Server Actions para API SEI
 *
 * Este arquivo mantém a interface pública para o frontend.
 * A implementação está consolidada em src/lib/sei-api-client.ts
 * que agora roteia todas as chamadas pelo backend proxy.
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
  invalidateProcessCache as invalidateProcessCacheImpl,
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
 * Busca dados do processo (andamentos) usando sessionToken
 * Se parcial=true, retorna apenas primeiros+últimos andamentos para render rápido
 */
export async function fetchProcessDataFromSEIWithToken(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string,
  parcial: boolean = false
): Promise<ProcessoData | ApiError> {
  if (MOCK_MODE) return mockProcessData();
  return fetchProcessData(token, protocoloProcedimento, unidadeId, parcial);
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
 * Busca documentos usando sessionToken
 * Se parcial=true, retorna apenas primeira+última página para render rápido
 */
export async function fetchDocumentsFromSEIWithToken(
  token: string,
  protocoloProcedimento: string,
  unidadeId: string,
  parcial: boolean = false
): Promise<DocumentosResponse | ApiError> {
  if (MOCK_MODE) return mockDocuments();
  return fetchDocuments(token, protocoloProcedimento, unidadeId, parcial);
}

/**
 * Busca resumo de documento específico usando sessionToken
 */
export async function fetchDocumentSummaryWithToken(
  token: string,
  documentoFormatado: string,
  unidadeId: string
): Promise<ProcessSummaryResponse | ApiError> {
  if (MOCK_MODE) return mockProcessSummary();
  return fetchDocumentSummaryImpl(token, documentoFormatado, unidadeId);
}

/**
 * Invalida o cache proxy de um processo no backend
 */
export async function invalidateProcessCache(
  protocoloProcedimento: string
): Promise<{ success: boolean; keysDeleted?: number }> {
  return invalidateProcessCacheImpl(protocoloProcedimento);
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
 * Decrypts SEI credentials from the auth_token cookie (JWE token).
 * Returns LoginCredentials if valid, null otherwise.
 */
export async function decryptSEICredentials(): Promise<LoginCredentials | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get('auth_token');
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

    // Reject expired tokens
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('[decryptSEICredentials] Token expired');
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

    // Reject expired tokens
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('[decryptJWEToken] Token expired');
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
