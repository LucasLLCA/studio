import { getApiBaseUrl } from './fetch-utils';
import type { UnidadeSei } from '@/types/fluxos';

interface UnidadesResponse {
  items: UnidadeSei[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function fetchUnidadesSei(
  search?: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<UnidadesResponse> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search?.trim()) params.set('search', search.trim());

  const res = await fetch(`${base}/unidades-sei?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch unidades: ${res.status}`);
  return res.json();
}
