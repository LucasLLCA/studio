/**
 * Server Actions para API SEI
 *
 * Kept only for operations that require server-only resources:
 * - Login (writes cookies)
 * - JWE decryption (uses JWE_SECRET_KEY)
 * - Health checks (server-only)
 *
 * Data-fetching functions (andamentos, documents, tags, etc.) have been
 * moved to regular modules that go through /api/proxy to avoid
 * Next.js server action serialization.
 */

'use server';

import type {
  LoginCredentials,
  ClientLoginResponse,
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


/**
 * Login na API SEI
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
