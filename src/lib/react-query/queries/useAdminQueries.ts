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
  type UsuarioAdmin,
  type HorasItem,
  type PapelAdmin,
} from '@/lib/api/admin-api-client';

function isError(v: unknown): v is { error: string } {
  return !!v && typeof v === 'object' && 'error' in v;
}

export function useUsuarios(idPessoa: number | null, search?: string) {
  return useQuery<UsuarioAdmin[]>({
    queryKey: queryKeys.admin.usuarios(search),
    queryFn: async () => {
      if (!idPessoa) throw new Error('Não autenticado');
      const res = await fetchUsuarios(idPessoa, search);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!idPessoa,
    staleTime: 30_000,
  });
}

export function useConfiguracaoHoras(idPessoa: number | null, orgao: string) {
  return useQuery<HorasItem[]>({
    queryKey: queryKeys.admin.configuracaoHoras(orgao),
    queryFn: async () => {
      if (!idPessoa) throw new Error('Não autenticado');
      const res = await fetchConfiguracaoHoras(idPessoa, orgao);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!idPessoa && !!orgao,
    staleTime: 5 * 60_000,
  });
}

export function useOrgaos(idPessoa: number | null) {
  return useQuery<string[]>({
    queryKey: queryKeys.admin.orgaos,
    queryFn: async () => {
      if (!idPessoa) throw new Error('Não autenticado');
      const res = await fetchOrgaos(idPessoa);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!idPessoa,
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

export function usePapeis(idPessoa: number | null) {
  return useQuery<PapelAdmin[]>({
    queryKey: queryKeys.admin.papeis,
    queryFn: async () => {
      if (!idPessoa) throw new Error('Não autenticado');
      const res = await fetchPapeis(idPessoa);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!idPessoa,
    staleTime: 30_000,
  });
}

export function useModulosList(idPessoa: number | null) {
  return useQuery<Record<string, string>>({
    queryKey: queryKeys.admin.modulosList,
    queryFn: async () => {
      if (!idPessoa) throw new Error('Não autenticado');
      const res = await fetchModulosList(idPessoa);
      if (isError(res)) throw new Error(res.error);
      return res;
    },
    enabled: !!idPessoa,
    staleTime: 10 * 60_000,
  });
}
