import type { ApiError } from '@/types/process-flow';
import type {
  Fluxo,
  FluxoDetalhe,
  FluxoProcesso,
  FluxoSaveCanvasPayload,
} from '@/types/fluxos';
import { getApiBaseUrl } from './fetch-utils';

function qs(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function createFluxo(
  usuario: string,
  nome: string,
  descricao?: string,
  equipe_id?: string,
  orgao?: string,
): Promise<Fluxo | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ nome, descricao, equipe_id: equipe_id || null, orgao: orgao || null }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao criar fluxo: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as Fluxo;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getFluxos(
  usuario: string,
  equipe_id?: string,
  orgao?: string,
  status?: string,
): Promise<Fluxo[] | ApiError> {
  try {
    const query = qs({ usuario, equipe_id, orgao, status });
    const response = await fetch(`${getApiBaseUrl()}/fluxos${query}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar fluxos: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as Fluxo[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getFluxoDetalhe(
  fluxoId: string,
  usuario: string,
): Promise<FluxoDetalhe | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar fluxo: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as FluxoDetalhe;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function updateFluxo(
  fluxoId: string,
  usuario: string,
  updates: { nome?: string; descricao?: string; status?: string },
): Promise<Fluxo | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates),
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao atualizar fluxo: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as Fluxo;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function deleteFluxo(
  fluxoId: string,
  usuario: string,
): Promise<{ status: string; message: string } | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao excluir fluxo: ${response.status}`, details, status: response.status };
    }
    return await response.json();
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function saveFluxoCanvas(
  fluxoId: string,
  usuario: string,
  payload: FluxoSaveCanvasPayload,
): Promise<FluxoDetalhe | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}/canvas?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao salvar canvas: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as FluxoDetalhe;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function assignProcesso(
  fluxoId: string,
  usuario: string,
  payload: {
    numero_processo: string;
    numero_processo_formatado?: string;
    node_atual_id?: string;
    notas?: string;
  },
): Promise<FluxoProcesso | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}/processos?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao vincular processo: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as FluxoProcesso;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getFluxoProcessos(
  fluxoId: string,
  usuario: string,
): Promise<FluxoProcesso[] | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}/processos?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar processos: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as FluxoProcesso[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function updateFluxoProcesso(
  fluxoId: string,
  processoId: string,
  usuario: string,
  updates: { node_atual_id?: string; status?: string; notas?: string },
): Promise<FluxoProcesso | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}/processos/${processoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates),
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao atualizar processo: ${response.status}`, details, status: response.status };
    }
    const data = await response.json();
    return data.data as FluxoProcesso;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function removeFluxoProcesso(
  fluxoId: string,
  processoId: string,
  usuario: string,
): Promise<{ status: string; message: string } | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/fluxos/${fluxoId}/processos/${processoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao remover processo: ${response.status}`, details, status: response.status };
    }
    return await response.json();
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
