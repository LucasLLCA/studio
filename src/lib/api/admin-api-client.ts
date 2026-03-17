import { getApiBaseUrl, fetchWithErrorHandling } from './fetch-utils';
import type { ApiError } from '@/types/process-flow';

export interface UsuarioAdmin {
  id_pessoa: number;
  usuario_sei: string;
  orgao: string;
  papel_global: string;
  cpf?: string | null;
}

export interface HorasItem {
  grupo_key: string;
  horas: number;
  atualizado_em?: string | null;
  atualizado_por?: string | null;
}

function adminUrl(path: string, idPessoa: number): string {
  const base = getApiBaseUrl();
  const separator = path.includes('?') ? '&' : '?';
  return `${base}/admin${path}${separator}id_pessoa=${idPessoa}`;
}

export async function fetchUsuarios(
  idPessoa: number,
  search?: string,
): Promise<UsuarioAdmin[] | ApiError> {
  const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchWithErrorHandling<UsuarioAdmin[]>(
    adminUrl(`/usuarios${searchParam}`, idPessoa),
    { method: 'GET' },
    'buscar usuários',
  );
}

export async function updateUsuarioPapel(
  idPessoa: number,
  targetIdPessoa: number,
  papel: string,
): Promise<{ status: string } | ApiError> {
  return fetchWithErrorHandling<{ status: string }>(
    adminUrl(`/usuarios/${targetIdPessoa}/papel`, idPessoa),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papel_global: papel }),
    },
    'atualizar papel do usuário',
  );
}

export async function fetchConfiguracaoHoras(
  idPessoa: number,
  orgao: string,
): Promise<HorasItem[] | ApiError> {
  return fetchWithErrorHandling<HorasItem[]>(
    adminUrl(`/configuracao-horas?orgao=${encodeURIComponent(orgao)}`, idPessoa),
    { method: 'GET' },
    'buscar configuração de horas',
  );
}

export async function saveConfiguracaoHoras(
  idPessoa: number,
  orgao: string,
  items: { grupo_key: string; horas: number }[],
): Promise<{ status: string } | ApiError> {
  return fetchWithErrorHandling<{ status: string }>(
    adminUrl('/configuracao-horas', idPessoa),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgao, items }),
    },
    'salvar configuração de horas',
  );
}

export async function fetchOrgaos(
  idPessoa: number,
): Promise<string[] | ApiError> {
  return fetchWithErrorHandling<string[]>(
    adminUrl('/orgaos', idPessoa),
    { method: 'GET' },
    'buscar órgãos',
  );
}

export async function fetchConfiguracaoHorasPublic(
  orgao: string,
): Promise<Record<string, number> | ApiError> {
  const base = getApiBaseUrl();
  return fetchWithErrorHandling<Record<string, number>>(
    `${base}/sei/configuracao-horas?orgao=${encodeURIComponent(orgao)}`,
    { method: 'GET' },
    'buscar configuração de horas',
  );
}
