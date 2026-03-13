import type { ApiError } from '@/types/process-flow';
import type { TeamTag, ProcessoTeamTag, KanbanBoard } from '@/types/teams';
import { getApiBaseUrl } from './fetch-utils';

// --- Tag CRUD (personal or team) ---

export async function getTags(
  usuario: string,
  equipeId?: string,
): Promise<TeamTag[] | ApiError> {
  try {
    const params = new URLSearchParams({ usuario });
    if (equipeId) params.set('equipe_id', equipeId);

    const response = await fetch(
      `${getApiBaseUrl()}/tags?${params}`,
      { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar tags: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TeamTag[];
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function createTag(
  usuario: string,
  nome: string,
  cor?: string,
  equipeId?: string,
): Promise<TeamTag | ApiError> {
  try {
    const params = new URLSearchParams({ usuario });
    if (equipeId) params.set('equipe_id', equipeId);

    const response = await fetch(
      `${getApiBaseUrl()}/tags?${params}`,
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

export async function updateTag(
  tagId: string,
  usuario: string,
  updates: { nome?: string; cor?: string },
): Promise<TeamTag | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/tags/${tagId}?usuario=${encodeURIComponent(usuario)}`,
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

export async function deleteTag(
  tagId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/tags/${tagId}?usuario=${encodeURIComponent(usuario)}`,
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

// --- Tag ↔ Processo association ---

export async function tagProcesso(
  tagId: string,
  usuario: string,
  numeroProcesso: string,
): Promise<ProcessoTeamTag | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/tags/${tagId}/processos?usuario=${encodeURIComponent(usuario)}`,
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
  tagId: string,
  processoTagId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/tags/${tagId}/processos/${processoTagId}?usuario=${encodeURIComponent(usuario)}`,
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

export async function untagProcessoPorNumero(
  tagId: string,
  numeroProcesso: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const params = new URLSearchParams({
      numero_processo: numeroProcesso,
      usuario,
    });

    const response = await fetch(
      `${getApiBaseUrl()}/tags/${tagId}/processos/por-numero?${params}`,
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

export async function getProcessoTags(
  numeroProcesso: string,
  usuario: string,
  equipeId?: string,
): Promise<TeamTag[] | ApiError> {
  try {
    const params = new URLSearchParams({ usuario });
    if (equipeId) params.set('equipe_id', equipeId);

    const response = await fetch(
      `${getApiBaseUrl()}/tags/por-processo/${encodeURIComponent(numeroProcesso)}?${params}`,
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

// --- Kanban (team-only, stays under /equipes) ---

export async function salvarProcessoNoKanban(
  equipeId: string,
  tagIdDestino: string,
  numeroProcesso: string,
  numeroProcessoFormatado: string | undefined,
  usuario: string,
): Promise<{ id: string; tag_id: string; numero_processo: string } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/kanban/salvar-processo?usuario=${encodeURIComponent(usuario)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          tag_id_destino: tagIdDestino,
          numero_processo: numeroProcesso,
          numero_processo_formatado: numeroProcessoFormatado,
        }),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao salvar processo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function moverProcessoKanban(
  equipeId: string,
  processoId: string,
  tagIdDestino: string,
  usuario: string,
): Promise<{ id: string; tag_id: string; numero_processo: string } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/equipes/${equipeId}/kanban/mover-processo?usuario=${encodeURIComponent(usuario)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ processo_id: processoId, tag_id_destino: tagIdDestino }),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao mover processo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data;
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
