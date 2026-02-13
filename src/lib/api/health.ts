import { mapNetworkErrorToMessage } from '@/lib/error-mapping';
import { API_BASE_URL } from './fetch-utils';

export interface HealthCheckResponse {
  isOnline: boolean;
  status: 'online' | 'offline' | 'error';
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

export async function checkSEIApiHealth(): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/sei/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (data.online) {
      return { isOnline: true, status: 'online', responseTime, timestamp };
    }
    return {
      isOnline: false,
      status: 'offline',
      responseTime,
      error: `API SEI respondeu com status ${data.status_code}`,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      isOnline: false,
      status: error instanceof Error && error.name === 'AbortError' ? 'offline' : 'error',
      responseTime,
      error: error instanceof Error ? mapNetworkErrorToMessage(error) : 'Erro desconhecido ao verificar API',
      timestamp,
    };
  }
}

export async function checkSummaryApiHealth(): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  const timestamp = new Date();

  if (!API_BASE_URL) {
    return { isOnline: false, status: 'error', error: 'API Base URL não configurada', timestamp };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });
    } catch {
      response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });
    }

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return { isOnline: true, status: 'online', responseTime, timestamp };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      isOnline: false,
      status: error instanceof Error && error.name === 'AbortError' ? 'offline' : 'error',
      responseTime,
      error: error instanceof Error ? mapNetworkErrorToMessage(error) : 'Erro desconhecido ao verificar API de resumo',
      timestamp,
    };
  }
}
