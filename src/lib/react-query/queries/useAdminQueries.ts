'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../keys';
import {
  fetchUsuarios,
  fetchConfiguracaoHoras,
  fetchOrgaos,
  fetchConfiguracaoHorasPublic,
  fetchPapeis,
  fetchModulosList,
  type UsuariosPaginatedResponse,
  type HorasItem,
  type PapelAdmin,
} from '@/lib/api/admin-api-client';

function isError(v: unknown): v is { error: string } {
  return !!v && typeof v === 'object' && 'error' in v;
}

export function useUsuarios(usuario: string | null, search?: string, page: number = 1, pageSize: number = 20) {
  return useQuery<UsuariosPaginatedResponse>({
    queryKey: queryKeys.admin.usuarios(search, page, pageSize),
    queryFn: async () => {
      if (!usuario) throw new Error('Não autenticado');
      const res = await fetchUsuarios(usuario, search, page, pageSize);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!usuario,
    staleTime: 30_000,
  });
}

export function useConfiguracaoHoras(usuario: string | null, orgao: string) {
  return useQuery<HorasItem[]>({
    queryKey: queryKeys.admin.configuracaoHoras(orgao),
    queryFn: async () => {
      if (!usuario) throw new Error('Não autenticado');
      const res = await fetchConfiguracaoHoras(usuario, orgao);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!usuario && !!orgao,
    staleTime: 5 * 60_000,
  });
}

export function useOrgaos(usuario: string | null) {
  return useQuery<string[]>({
    queryKey: queryKeys.admin.orgaos,
    queryFn: async () => {
      if (!usuario) throw new Error('Não autenticado');
      const res = await fetchOrgaos(usuario);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!usuario,
    staleTime: 10 * 60_000,
  });
}

export function useConfiguracaoHorasPublic(orgao: string | null) {
  return useQuery<Record<string, number>>({
    queryKey: queryKeys.admin.configuracaoHorasPublic(orgao ?? ''),
    queryFn: async () => {
      if (!orgao) throw new Error('Órgão não informado');
      const res = await fetchConfiguracaoHorasPublic(orgao);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!orgao,
    staleTime: 5 * 60_000,
  });
}

export function usePapeis(usuario: string | null) {
  return useQuery<PapelAdmin[]>({
    queryKey: queryKeys.admin.papeis,
    queryFn: async () => {
      if (!usuario) throw new Error('Não autenticado');
      const res = await fetchPapeis(usuario);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!usuario,
    staleTime: 30_000,
  });
}

export function useModulosList(usuario: string | null) {
  return useQuery<Record<string, string>>({
    queryKey: queryKeys.admin.modulosList,
    queryFn: async () => {
      if (!usuario) throw new Error('Não autenticado');
      const res = await fetchModulosList(usuario);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!usuario,
    staleTime: 10 * 60_000,
  });
}
