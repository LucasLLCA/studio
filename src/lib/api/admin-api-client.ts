import { getApiBaseUrl, fetchWithErrorHandling } from './fetch-utils';
import type { ApiError } from '@/types/process-flow';

export interface UsuarioAdmin {
  id_pessoa: number;
  usuario_sei: string;
  orgao: string;
  cpf?: string | null;
  papel_nome?: string | null;
  papel_slug?: string | null;
  papel_id?: string | null;
}

export interface PapelAdmin {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  modulos: string[];
  is_default: boolean;
  criado_em?: string | null;
  atualizado_em?: string | null;
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


// --------------- Papeis (Roles) CRUD ---------------

export async function fetchPapeis(
  idPessoa: number,
): Promise<PapelAdmin[] | ApiError> {
  return fetchWithErrorHandling<PapelAdmin[]>(
    adminUrl('/papeis', idPessoa),
    { method: 'GET' },
    'buscar papéis',
  );
}

export async function createPapel(
  idPessoa: number,
  body: { nome: string; slug: string; descricao?: string; modulos: string[] },
): Promise<PapelAdmin | ApiError> {
  return fetchWithErrorHandling<PapelAdmin>(
    adminUrl('/papeis', idPessoa),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    'criar papel',
  );
}

export async function updatePapel(
  idPessoa: number,
  papelId: string,
  body: { nome?: string; descricao?: string; modulos?: string[] },
): Promise<PapelAdmin | ApiError> {
  return fetchWithErrorHandling<PapelAdmin>(
    adminUrl(`/papeis/${papelId}`, idPessoa),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    'atualizar papel',
  );
}

export async function deletePapel(
  idPessoa: number,
  papelId: string,
): Promise<{ status: string } | ApiError> {
  return fetchWithErrorHandling<{ status: string }>(
    adminUrl(`/papeis/${papelId}`, idPessoa),
    { method: 'DELETE' },
    'deletar papel',
  );
}

export async function fetchModulosList(
  idPessoa: number,
): Promise<Record<string, string> | ApiError> {
  return fetchWithErrorHandling<Record<string, string>>(
    adminUrl('/papeis/modulos', idPessoa),
    { method: 'GET' },
    'buscar módulos',
  );
}

export async function assignUsuarioPapel(
  idPessoa: number,
  body: { usuario_sei: string; papel_id: string },
): Promise<{ status: string; usuario_sei: string; papel_slug: string; papel_nome: string } | ApiError> {
  return fetchWithErrorHandling(
    adminUrl('/usuario-papel', idPessoa),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    'atribuir papel ao usuário',
  );
}

export async function removeUsuarioPapel(
  idPessoa: number,
  usuarioSei: string,
): Promise<{ status: string } | ApiError> {
  return fetchWithErrorHandling<{ status: string }>(
    adminUrl(`/usuario-papel/${encodeURIComponent(usuarioSei)}`, idPessoa),
    { method: 'DELETE' },
    'remover papel do usuário',
  );
}
