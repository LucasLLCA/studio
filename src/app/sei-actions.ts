/**
 * Server Actions para API SEI
 *
 * Kept only for operations that require server-only resources:
 * - Login (writes cookies)
 * - JWE decryption (uses JWE_SECRET_KEY)
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
import { compactDecrypt } from 'jose';

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


// --------------- Embed identity ---------------

/**
 * Reads the auth_token cookie, decrypts the JWE, and returns
 * user identity fields (id_pessoa, usuario, id_orgao, etc.).
 * Returns null if no cookie, invalid/expired token, or missing fields.
 */
export async function getEmbedUserIdentity(): Promise<EmbedUserIdentity | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get('auth_token');
    if (!cookie?.value) return null;

    const jweSecret = process.env.JWE_SECRET_KEY;
    if (!jweSecret) return null;

    const keyBytes = Uint8Array.from(
      atob(jweSecret.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0),
    );
    if (keyBytes.length !== 32) return null;

    const { plaintext } = await compactDecrypt(cookie.value, keyBytes);
    const payload = JSON.parse(new TextDecoder().decode(plaintext));

    // Reject expired tokens
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

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
