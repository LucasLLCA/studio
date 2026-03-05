/**
 * Server Actions para API SEI
 *
 * Kept only for operations that require server-only resources:
 * - Login (writes cookies)
 * - Embed identity (calls backend to decode JWE)
 * - Health checks (server-only)
 * - Embed login flow (credential check, auto-login, embed-login)
 *
 * Data-fetching functions (andamentos, documents, tags, etc.) have been
 * moved to regular modules that go through /api/proxy to avoid
 * Next.js server action serialization.
 */

'use server';

import type {
  LoginCredentials,
  ClientLoginResponse,
  SEILoginApiResponse,
  UnidadeFiltro,
} from '@/types/process-flow';

import {
  loginToSEI as loginToSEIImpl,
  checkSEIApiHealth as checkSEIApiHealthImpl,
  checkSummaryApiHealth as checkSummaryApiHealthImpl,
} from '@/lib/sei-api-client';

import type { HealthCheckResponse } from '@/lib/sei-api-client';

import {
  mockLogin,
  mockHealthCheck,
} from '@/lib/mock-data';

import { cookies } from 'next/headers';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_DATA === 'true';
const API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || 'http://127.0.0.1:8000';


// --------------- Types ---------------

export interface EmbedUserIdentity {
  id_pessoa: number;
  usuario: string;
  id_orgao: number;
  id_pai?: number | null;
  application?: string | null;
}


// --------------- Login ---------------

/**
 * Login na API SEI (standalone manual login)
 */
export async function loginToSEI(credentials: LoginCredentials): Promise<ClientLoginResponse> {
  if (MOCK_MODE) return mockLogin();
  return loginToSEIImpl(credentials);
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


// --------------- Cookie helpers (httpOnly-safe) ---------------

/**
 * Checks whether the auth_token cookie exists.
 * Works regardless of httpOnly flag since it runs server-side.
 */
export async function hasAuthTokenCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get('auth_token')?.value;
}

/**
 * Returns the raw auth_token cookie value (for debug display in dev).
 * Returns null if not present or in production (httpOnly).
 */
export async function getAuthTokenValue(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value ?? null;
}

/**
 * Clears the auth_token cookie server-side.
 * Works regardless of httpOnly flag.
 */
export async function clearAuthTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

// --------------- Embed identity ---------------

/**
 * Reads the auth_token cookie and calls the backend to decode the JWE,
 * returning user identity fields (id_pessoa, usuario, id_orgao, etc.).
 * Returns null if no cookie, invalid/expired token, or missing fields.
 */
export async function getEmbedUserIdentity(tokenOverride?: string): Promise<EmbedUserIdentity | null> {
  try {
    // Prefer explicit token (e.g. from URL ?token= param in credentialless iframes)
    // Fall back to auth_token cookie
    let token = tokenOverride;
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}/auth/decode-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const payload = await res.json();

    // Validate required identity fields
    if (!payload.id_pessoa || !payload.usuario || !payload.id_orgao) return null;

    return {
      id_pessoa: payload.id_pessoa,
      usuario: payload.usuario,
      id_orgao: payload.id_orgao,
      id_pai: payload.id_pai ?? null,
      application: payload.application ?? null,
    };
  } catch {
    return null;
  }
}


// --------------- Credential check + auto-login ---------------

/**
 * Checks if stored credentials exist for the given id_pessoa.
 */
export async function checkStoredCredentials(id_pessoa: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/credenciais/check/${id_pessoa}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.has_credentials === true;
  } catch {
    return false;
  }
}

/**
 * Maps raw SEI login API response to ClientLoginResponse.
 */
function mapSEIResponseToClient(data: SEILoginApiResponse): ClientLoginResponse {
  const idUnidadeAtual = data.Login?.IdUnidadeAtual;
  const nomeUsuario =
    data.Login?.Nome ||
    (data as { Nome?: string }).Nome ||
    (data as { Usuario?: { Nome?: string } }).Usuario?.Nome;

  if (!data.Token) {
    return { success: false, error: 'Token não retornado pela API de login.', status: 500 };
  }

  const unidades: UnidadeFiltro[] = (data.Unidades || []).map(ua => ({
    Id: ua.Id,
    Sigla: ua.Sigla,
    Descricao: ua.Descricao,
  }));

  return {
    success: true,
    token: typeof data.Token === 'string' ? data.Token : String(data.Token),
    unidades,
    idUnidadeAtual,
    nomeUsuario,
    idUsuario: data.Login?.IdUsuario,
    idLogin: data.Login?.IdLogin,
    cargoAssinatura: data.Login?.UltimoCargoAssinatura,
  };
}

/**
 * Auto-login using stored encrypted credentials.
 * Calls backend POST /credenciais/auto-login.
 */
export async function autoLoginWithStoredCredentials(id_pessoa: number): Promise<ClientLoginResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/credenciais/auto-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_pessoa }),
      cache: 'no-store',
    });

    if (!res.ok) {
      let detail: string;
      try {
        const err = await res.json();
        detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch {
        detail = await res.text();
      }
      return { success: false, error: detail, status: res.status };
    }

    const data = (await res.json()) as SEILoginApiResponse;
    return mapSEIResponseToClient(data);
  } catch (error) {
    return {
      success: false,
      error: 'Erro de conexão ao tentar auto-login.',
      details: error instanceof Error ? error.message : String(error),
      status: 500,
    };
  }
}

/**
 * Embed login: validate credentials against SEI + store encrypted in DB.
 * Calls backend POST /credenciais/embed-login.
 */
export async function embedLogin(
  id_pessoa: number,
  usuario_sei: string,
  senha: string,
  orgao: string,
): Promise<ClientLoginResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/credenciais/embed-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_pessoa, usuario_sei, senha, orgao }),
      cache: 'no-store',
    });

    if (!res.ok) {
      let detail: string;
      try {
        const err = await res.json();
        detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } catch {
        detail = await res.text();
      }
      return { success: false, error: detail, status: res.status };
    }

    const data = (await res.json()) as SEILoginApiResponse;
    return mapSEIResponseToClient(data);
  } catch (error) {
    return {
      success: false,
      error: 'Erro de conexão ao tentar login embed.',
      details: error instanceof Error ? error.message : String(error),
      status: 500,
    };
  }
}
