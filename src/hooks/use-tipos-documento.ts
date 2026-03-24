'use client';

import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/api/fetch-utils';

export interface TipoDocumento {
  id: number;
  nome: string;
}

async function fetchTiposDocumento(busca: string): Promise<TipoDocumento[]> {
  const params = new URLSearchParams({ page_size: '200' });
  if (busca.trim().length >= 2) {
    params.set('search', busca.trim());
  }

  const url = `${getApiBaseUrl()}/documentos/tipos?${params.toString()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Erro ao buscar tipos de documento: ${res.status}`);
  const json = await res.json();
  return (json.items || []) as TipoDocumento[];
}

/**
 * Busca tipos de documento do SEI armazenados no banco local.
 * Sem busca retorna os primeiros 200 ordenados por nome.
 * Com 2+ caracteres filtra por nome.
 */
export function useTiposDocumento(busca: string = '') {
  return useQuery<TipoDocumento[]>({
    queryKey: ['tipos-documento', busca.trim()],
    queryFn: () => fetchTiposDocumento(busca),
    staleTime: 1000 * 60 * 10, // 10 min de cache
    placeholderData: [],
    retry: 1,
  });
}
