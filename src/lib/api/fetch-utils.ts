import type { ApiError } from '@/types/process-flow';

export const API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "http://127.0.0.1:8000";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${BASE_PATH}/api/proxy`;
  }
  return API_BASE_URL;
}

export function validateToken(token: string | null | undefined): ApiError | null {
  if (!token || token === 'undefined' || token === 'null') {
    return { error: "Token de autenticação inválido", status: 401 };
  }
  return null;
}

export async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestInit,
  errorContext: string
): Promise<T | ApiError> {
  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      return {
        error: `${errorContext}: ${response.status}`,
        details: errorDetails,
        status: response.status,
      };
    }

    return await response.json() as T;
  } catch (error) {
    return {
      error: `Erro ao conectar com o serviço para ${errorContext.toLowerCase()}.`,
      details: error instanceof Error ? error.message : String(error),
      status: 500,
    };
  }
}

export function extractUserFriendlyError(
  errorDetails: unknown,
  status: number,
  context: string
): string {
  let message = `Erro ${status} ao ${context}.`;

  if (errorDetails && typeof (errorDetails as Record<string, unknown>).detail === 'string') {
    message = (errorDetails as Record<string, string>).detail;
  } else if (errorDetails && typeof (errorDetails as Record<string, unknown>).message === 'string') {
    message = (errorDetails as Record<string, string>).message;
  }

  if (status === 401) {
    message = `Não autorizado. Verifique o token e id_unidade.`;
  } else if (status === 404) {
    message = `Recurso não encontrado.`;
  } else if (status === 500) {
    message = `Erro interno no servidor.`;
  }

  return message;
}
