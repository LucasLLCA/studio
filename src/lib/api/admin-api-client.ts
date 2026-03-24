import { getApiBaseUrl, fetchWithErrorHandling } from './fetch-utils';
import type { ApiError } from '@/types/process-flow';

export interface UsuarioAdmin {
  usuario_sei: string;
  orgao: string;
  papel_nome?: string | null;
  papel_slug?: string | null;
  papel_id?: string | null;
}

export interface UsuariosPaginatedResponse {
  items: UsuarioAdmin[];
  total: number;
  page: number;
  page_size: number;
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

function adminUrl(path: string, usuarioSei: string): string {
  const base = getApiBaseUrl();
  const separator = path.includes('?') ? '&' : '?';
  return `${base}/admin${path}${separator}usuario_sei=${encodeURIComponent(usuarioSei)}`;
}

export async function fetchUsuarios(
  usuarioSei: string,
  search?: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<UsuariosPaginatedResponse | ApiError> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  const qs = params.toString();
  return fetchWithErrorHandling<UsuariosPaginatedResponse>(
    adminUrl(`/usuarios?${qs}`, usuarioSei),
    { method: 'GET' },
    'buscar usuários',
  );
}

export async function fetchConfiguracaoHoras(
  usuarioSei: string,
  orgao: string,
): Promise<HorasItem[] | ApiError> {
  return fetchWithErrorHandling<HorasItem[]>(
    adminUrl(`/configuracao-horas?orgao=${encodeURIComponent(orgao)}`, usuarioSei),
    { method: 'GET' },
    'buscar configuração de horas',
  );
}

export async function saveConfiguracaoHoras(
  usuarioSei: string,
  orgao: string,
  items: { grupo_key: string; horas: number }[],
): Promise<{ status: string } | ApiError> {
  return fetchWithErrorHandling<{ status: string }>(
    adminUrl('/configuracao-horas', usuarioSei),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgao, items }),
    },
    'salvar configuração de horas',
  );
}

export async function fetchOrgaos(
  usuarioSei: string,
): Promise<string[] | ApiError> {
  return fetchWithErrorHandling<string[]>(
    adminUrl('/orgaos', usuarioSei),
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
  usuarioSei: string,
): Promise<PapelAdmin[] | ApiError> {
  return fetchWithErrorHandling<PapelAdmin[]>(
    adminUrl('/papeis', usuarioSei),
    { method: 'GET' },
    'buscar papéis',
  );
}

export async function createPapel(
  usuarioSei: string,
  body: { nome: string; slug: string; descricao?: string; modulos: string[] },
): Promise<PapelAdmin | ApiError> {
  return fetchWithErrorHandling<PapelAdmin>(
    adminUrl('/papeis', usuarioSei),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    'criar papel',
  );
}

export async function updatePapel(
  usuarioSei: string,
  papelId: string,
  body: { nome?: string; descricao?: string; modulos?: string[] },
): Promise<PapelAdmin | ApiError> {
  return fetchWithErrorHandling<PapelAdmin>(
    adminUrl(`/papeis/${papelId}`, usuarioSei),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    'atualizar papel',
  );
}

export async function deletePapel(
  usuarioSei: string,
  papelId: string,
): Promise<{ status: string } | ApiError> {
  return fetchWithErrorHandling<{ status: string }>(
    adminUrl(`/papeis/${papelId}`, usuarioSei),
    { method: 'DELETE' },
    'deletar papel',
  );
}

export async function fetchModulosList(
  usuarioSei: string,
): Promise<Record<string, string> | ApiError> {
  return fetchWithErrorHandling<Record<string, string>>(
    adminUrl('/papeis/modulos', usuarioSei),
    { method: 'GET' },
    'buscar módulos',
  );
}

export async function assignUsuarioPapel(
  usuarioSei: string,
  body: { usuario_sei: string; papel_id: string },
): Promise<{ status: string; usuario_sei: string; papel_slug: string; papel_nome: string } | ApiError> {
  return fetchWithErrorHandling(
    adminUrl('/usuario-papel', usuarioSei),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    'atribuir papel ao usuário',
  );
}

export async function removeUsuarioPapel(
  usuarioSei: string,
  targetUsuarioSei: string,
): Promise<{ status: string } | ApiError> {
  return fetchWithErrorHandling<{ status: string }>(
    adminUrl(`/usuario-papel/${encodeURIComponent(targetUsuarioSei)}`, usuarioSei),
    { method: 'DELETE' },
    'remover papel do usuário',
  );
}
