import { getApiBaseUrl, fetchWithErrorHandling } from './fetch-utils';
import type { ApiError } from '@/types/process-flow';

export interface PermissionsResponse {
  modulos: string[];
  papel_nome: string;
  papel_slug: string;
}

export async function fetchPermissionsByEmail(
  usuarioSei: string
): Promise<PermissionsResponse | ApiError> {
  const base = getApiBaseUrl();
  return fetchWithErrorHandling<PermissionsResponse>(
    `${base}/credenciais/permissions-by-email?usuario_sei=${encodeURIComponent(usuarioSei)}`,
    { method: 'GET' },
    'buscar permissões por email',
  );
}
