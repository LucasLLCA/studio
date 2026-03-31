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
  fetchResumoAnalitico,
  fetchLoginsOverTime,
  fetchUsuariosAtivos,
  fetchProcessosVisualizados,
  fetchAcoesPorTipo,
  type UsuariosPaginatedResponse,
  type HorasItem,
  type PapelAdmin,
  type ResumoAnaliticoResponse,
  type LoginsOverTimeResponse,
  type UsuariosAtivosResponse,
  type ProcessosVisualizadosResponse,
  type AcoesPorTipoResponse,
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

export function useResumoAnalitico(usuario: string | null, periodo: string) {
  return useQuery({
    queryKey: queryKeys.admin.analyticsResumo(periodo),
    queryFn: async () => {
      if (!usuario) throw new Error('Not authenticated');
      const res = await fetchResumoAnalitico(usuario, periodo);
      if (isError(res)) throw new Error(res.error);
      return res as ResumoAnaliticoResponse;
    },
    enabled: !!usuario,
    staleTime: 60_000,
  });
}

export function useLoginsOverTime(usuario: string | null, periodo: string) {
  return useQuery({
    queryKey: queryKeys.admin.analyticsLogins(periodo),
    queryFn: async () => {
      if (!usuario) throw new Error('Not authenticated');
      const res = await fetchLoginsOverTime(usuario, periodo);
      if (isError(res)) throw new Error(res.error);
      return res as LoginsOverTimeResponse;
    },
    enabled: !!usuario,
    staleTime: 60_000,
  });
}

export function useUsuariosAtivos(usuario: string | null, periodo: string, search?: string, page?: number, pageSize?: number) {
  return useQuery({
    queryKey: queryKeys.admin.analyticsUsuarios(periodo, search, page),
    queryFn: async () => {
      if (!usuario) throw new Error('Not authenticated');
      const res = await fetchUsuariosAtivos(usuario, periodo, search, page, pageSize);
      if (isError(res)) throw new Error(res.error);
      return res as UsuariosAtivosResponse;
    },
    enabled: !!usuario,
    staleTime: 60_000,
  });
}

export function useProcessosVisualizados(usuario: string | null, periodo: string, filtroUsuario?: string, page?: number, pageSize?: number) {
  return useQuery({
    queryKey: queryKeys.admin.analyticsProcessos(periodo, filtroUsuario, page),
    queryFn: async () => {
      if (!usuario) throw new Error('Not authenticated');
      const res = await fetchProcessosVisualizados(usuario, periodo, filtroUsuario, page, pageSize);
      if (isError(res)) throw new Error(res.error);
      return res as ProcessosVisualizadosResponse;
    },
    enabled: !!usuario,
    staleTime: 60_000,
  });
}

export function useAcoesPorTipo(usuario: string | null, periodo: string, filtroUsuario?: string) {
  return useQuery({
    queryKey: queryKeys.admin.analyticsAcoes(periodo, filtroUsuario),
    queryFn: async () => {
      if (!usuario) throw new Error('Not authenticated');
      const res = await fetchAcoesPorTipo(usuario, periodo, filtroUsuario);
      if (isError(res)) throw new Error(res.error);
      return res as AcoesPorTipoResponse;
    },
    enabled: !!usuario,
    staleTime: 60_000,
  });
}
