'use client';

import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/api/fetch-utils';
import type { UnidadeFiltro } from '@/types/process-flow';

async function fetchUnidadesSei(busca: string): Promise<UnidadeFiltro[]> {
  const url = `${getApiBaseUrl()}/unidades-sei?search=${encodeURIComponent(busca)}&page_size=50`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Erro ao buscar unidades: ${res.status}`);
  const json = await res.json();
  return (json.items || []).map((u: { id_unidade: string; sigla: string; descricao: string }) => ({
    Id: String(u.id_unidade),
    Sigla: u.sigla,
    Descricao: u.descricao || '',
  }));
}

/**
 * Busca unidades SEI no servidor conforme o termo digitado.
 * Só dispara a busca com 2+ caracteres — evita carregar 9000+ registros.
 * Cache de 5 min por termo buscado.
 */
export function useUnidadesSei(busca: string) {
  const termoValido = busca.trim().length >= 2;

  return useQuery<UnidadeFiltro[]>({
    queryKey: ['unidades-sei', busca.trim()],
    queryFn: () => fetchUnidadesSei(busca.trim()),
    enabled: termoValido,
    staleTime: 1000 * 60 * 5, // 5 min de cache por termo
    placeholderData: [],
    retry: 1,
  });
}
