import type { ApiError } from '@/types/process-flow';
import type { GrupoProcesso, GrupoProcessoWithProcessos, SavedProcesso, ProcessoSalvoCheck } from '@/types/teams';
import { getApiBaseUrl } from './fetch-utils';

export async function createGrupo(
  usuario: string,
  nome: string,
  cor?: string,
  equipeId?: string,
): Promise<GrupoProcesso | ApiError> {
  try {
    const params = new URLSearchParams({ usuario });
    if (equipeId) params.set('equipe_id', equipeId);
    const response = await fetch(`${getApiBaseUrl()}/grupos?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ nome, cor: cor || undefined }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao criar grupo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as GrupoProcesso;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getTeamGrupos(
  usuario: string,
  equipeId: string,
): Promise<GrupoProcesso[] | ApiError> {
  try {
    const params = new URLSearchParams({ usuario, equipe_id: equipeId });
    const response = await fetch(`${getApiBaseUrl()}/grupos?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar grupos da equipe: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as GrupoProcesso[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getMyGrupos(
  usuario: string,
): Promise<GrupoProcesso[] | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/grupos?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar grupos: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as GrupoProcesso[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getGrupoWithProcessos(
  grupoId: string,
  usuario: string,
): Promise<GrupoProcessoWithProcessos | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/grupos/${grupoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar grupo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as GrupoProcessoWithProcessos;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function updateGrupo(
  grupoId: string,
  usuario: string,
  updates: { nome?: string; cor?: string },
): Promise<GrupoProcesso | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/grupos/${grupoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao atualizar grupo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as GrupoProcesso;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function deleteGrupo(
  grupoId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/grupos/${grupoId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const friendlyError = data?.detail || `Falha ao excluir grupo: ${response.status}`;
      return { error: friendlyError, details: data, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function saveProcessoToGrupo(
  grupoId: string,
  usuario: string,
  numeroProcesso: string,
  numeroProcessoFormatado?: string,
  nota?: string,
): Promise<SavedProcesso | ApiError> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/grupos/${grupoId}/processos?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        numero_processo: numeroProcesso,
        numero_processo_formatado: numeroProcessoFormatado || undefined,
        nota: nota || undefined,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      const friendlyError = response.status === 409
        ? 'Este processo já está neste grupo.'
        : `Falha ao salvar processo: ${response.status}`;
      return { error: friendlyError, details, status: response.status };
    }

    const data = await response.json();
    return data.data as SavedProcesso;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function removeProcessoFromGrupo(
  grupoId: string,
  processoId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/grupos/${grupoId}/processos/${processoId}?usuario=${encodeURIComponent(usuario)}`,
      { method: 'DELETE', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao remover processo: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

/**
 * Move um processo de um grupo para outro.
 * Retorna o novo ProcessoSalvo.id gerado no grupo destino, necessário para
 * que movimentos futuros (ex.: mover de volta) usem o id correto.
 */
export async function moveProcessoEntreGrupos(
  sourceGrupoId: string,
  targetGrupoId: string,
  processoId: string,
  usuario: string,
  numeroProcesso: string,
  numeroProcessoFormatado?: string,
  nota?: string,
): Promise<{ success: boolean; newProcessoId: string } | ApiError> {
  // 1. Adiciona ao grupo destino (recebe novo ProcessoSalvo com novo id)
  const addResult = await saveProcessoToGrupo(targetGrupoId, usuario, numeroProcesso, numeroProcessoFormatado, nota);
  if ('error' in addResult) return addResult;

  const newProcessoId = (addResult as SavedProcesso).id;

  // 2. Remove do grupo origem usando o id original
  const removeResult = await removeProcessoFromGrupo(sourceGrupoId, processoId, usuario);
  if ('error' in removeResult) return removeResult;

  return { success: true, newProcessoId };
}

export async function checkProcessoSalvo(
  usuario: string,
  numeroProcesso: string,
): Promise<ProcessoSalvoCheck | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/grupos/processo-salvo?usuario=${encodeURIComponent(usuario)}&numero_processo=${encodeURIComponent(numeroProcesso)}`,
      { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao verificar processo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as ProcessoSalvoCheck;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
