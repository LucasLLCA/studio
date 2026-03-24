'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFluxos,
  getFluxoDetalhe,
  getFluxoProcessos,
  getFluxosByProcesso,
  saveFluxoCanvas,
  assignProcesso,
  createFluxo,
  deleteFluxo,
  updateFluxo,
  updateFluxoProcesso,
  removeFluxoProcesso,
} from '@/lib/api/fluxos-api-client';
import { queryKeys } from '../keys';
import type { Fluxo, FluxoDetalhe, FluxoProcesso, FluxoComVinculacao, FluxoSaveCanvasPayload } from '@/types/fluxos';
import { useCallback } from 'react';

// ── Queries ──────────────────────────────────────────────────

export function useFluxos(usuario: string, equipe_id?: string, orgao?: string, status?: string) {
  return useQuery<Fluxo[], Error>({
    queryKey: queryKeys.fluxos.list(usuario, equipe_id, orgao),
    queryFn: async () => {
      const result = await getFluxos(usuario, equipe_id, orgao, status);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    enabled: !!usuario,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useFluxoDetalhe(fluxoId: string | undefined, usuario: string) {
  return useQuery<FluxoDetalhe, Error>({
    queryKey: queryKeys.fluxos.detail(fluxoId ?? ''),
    queryFn: async () => {
      const result = await getFluxoDetalhe(fluxoId!, usuario);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    enabled: !!fluxoId && !!usuario,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useFluxoProcessos(fluxoId: string | undefined, usuario: string) {
  return useQuery<FluxoProcesso[], Error>({
    queryKey: queryKeys.fluxos.processos(fluxoId ?? ''),
    queryFn: async () => {
      const result = await getFluxoProcessos(fluxoId!, usuario);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    enabled: !!fluxoId && !!usuario,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useFluxosByProcesso(usuario: string, numeroProcesso: string) {
  return useQuery<FluxoComVinculacao[], Error>({
    queryKey: queryKeys.fluxos.byProcesso(numeroProcesso),
    queryFn: async () => {
      const result = await getFluxosByProcesso(usuario, numeroProcesso);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    enabled: !!usuario && !!numeroProcesso,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useCreateFluxo(usuario: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; descricao?: string; equipe_id?: string; orgao?: string }) => {
      const result = await createFluxo(usuario, data.nome, data.descricao, data.equipe_id, data.orgao);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.all });
    },
  });
}

export function useUpdateFluxo(usuario: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { fluxoId: string; updates: { nome?: string; descricao?: string; status?: string } }) => {
      const result = await updateFluxo(data.fluxoId, usuario, data.updates);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.detail(variables.fluxoId) });
    },
  });
}

export function useDeleteFluxo(usuario: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fluxoId: string) => {
      const result = await deleteFluxo(fluxoId, usuario);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.all });
    },
  });
}

export function useSaveFluxoCanvas(fluxoId: string, usuario: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: FluxoSaveCanvasPayload) => {
      const result = await saveFluxoCanvas(fluxoId, usuario, payload);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.fluxos.detail(fluxoId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.all });
    },
  });

  const saveNow = useCallback(
    (payload: FluxoSaveCanvasPayload) => {
      mutation.mutate(payload);
    },
    [mutation],
  );

  return { ...mutation, saveNow };
}

export function useAssignProcesso(fluxoId: string, usuario: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { numero_processo: string; numero_processo_formatado?: string; node_atual_id?: string; notas?: string }) => {
      const result = await assignProcesso(fluxoId, usuario, data);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.processos(fluxoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.detail(fluxoId) });
    },
  });
}

export function useUpdateFluxoProcesso(fluxoId: string, usuario: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { processoId: string; updates: { node_atual_id?: string; status?: string; notas?: string } }) => {
      const result = await updateFluxoProcesso(fluxoId, data.processoId, usuario, data.updates);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.processos(fluxoId) });
    },
  });
}

export function useRemoveFluxoProcesso(fluxoId: string, usuario: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (processoId: string) => {
      const result = await removeFluxoProcesso(fluxoId, processoId, usuario);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.processos(fluxoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.fluxos.detail(fluxoId) });
    },
  });
}
