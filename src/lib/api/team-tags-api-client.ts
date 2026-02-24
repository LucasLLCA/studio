import type { ApiError } from '@/types/process-flow';
import type { TeamTag, ProcessoTeamTag, KanbanBoard } from '@/types/teams';
import { getApiBaseUrl } from './fetch-utils';

export async function getTeamTags(
  equipeId: string,
  usuario: string,
): Promise<TeamTag[] | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/tags?usuario=${encodeURIComponent(usuario)}`,
      { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar tags da equipe: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TeamTag[];
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function createTeamTag(
  equipeId: string,
  usuario: string,
  nome: string,
  cor?: string,
): Promise<TeamTag | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/tags?usuario=${encodeURIComponent(usuario)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ nome, cor: cor || undefined }),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao criar tag: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TeamTag;
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function updateTeamTag(
  equipeId: string,
  tagId: string,
  usuario: string,
  updates: { nome?: string; cor?: string },
): Promise<TeamTag | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/tags/${tagId}?usuario=${encodeURIComponent(usuario)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(updates),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao atualizar tag: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TeamTag;
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function deleteTeamTag(
  equipeId: string,
  tagId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/tags/${tagId}?usuario=${encodeURIComponent(usuario)}`,
      { method: 'DELETE', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao excluir tag: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function tagProcesso(
  equipeId: string,
  tagId: string,
  usuario: string,
  numeroProcesso: string,
): Promise<ProcessoTeamTag | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/tags/${tagId}/processos?usuario=${encodeURIComponent(usuario)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ numero_processo: numeroProcesso }),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao associar tag: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as ProcessoTeamTag;
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function untagProcesso(
  equipeId: string,
  tagId: string,
  processoTagId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/tags/${tagId}/processos/${processoTagId}?usuario=${encodeURIComponent(usuario)}`,
      { method: 'DELETE', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao remover tag: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getProcessoTeamTags(
  equipeId: string,
  numeroProcesso: string,
  usuario: string,
): Promise<TeamTag[] | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/tags/por-processo/${encodeURIComponent(numeroProcesso)}?usuario=${encodeURIComponent(usuario)}`,
      { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar tags do processo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TeamTag[];
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getKanbanBoard(
  equipeId: string,
  usuario: string,
): Promise<KanbanBoard | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/kanban?usuario=${encodeURIComponent(usuario)}`,
      { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar kanban: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as KanbanBoard;
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
