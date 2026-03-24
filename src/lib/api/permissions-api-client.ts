import { getApiBaseUrl, fetchWithErrorHandling } from './fetch-utils';
import type { ApiError } from '@/types/process-flow';

export interface PermissionsResponse {
  modulos: string[];
  papel_nome: string;
  papel_slug: string;
}

export async function fetchPermissions(
  idPessoa: number
): Promise<PermissionsResponse | ApiError> {
  const base = getApiBaseUrl();
  return fetchWithErrorHandling<PermissionsResponse>(
    `${base}/credenciais/permissions/${idPessoa}`,
    { method: 'GET' },
    'buscar permissões',
  );
}
