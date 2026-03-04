import type { ApiError } from '@/types/process-flow';
import type { Observacao, ObservacaoEscopo } from '@/types/teams';
import { getApiBaseUrl } from './fetch-utils';

export async function getObservacoes(
  numeroProcesso: string,
  equipeId?: string,
  usuario?: string,
): Promise<Observacao[] | ApiError> {
  try {
    const params = new URLSearchParams();
    if (equipeId) params.set('equipe_id', equipeId);
    if (usuario) params.set('usuario', usuario);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(
      `${getApiBaseUrl()}/observacoes/${encodeURIComponent(numeroProcesso)}${qs}`,
      { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar observacoes: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Observacao[];
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getMencoesNaoLidas(
  numeroProcesso: string,
  usuario: string,
): Promise<{ count: number } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/observacoes/${encodeURIComponent(numeroProcesso)}/mencoes-nao-lidas?usuario=${encodeURIComponent(usuario)}`,
      { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar mencoes: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return { count: data.count as number };
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function createObservacao(
  numeroProcesso: string,
  usuario: string,
  conteudo: string,
  escopo: ObservacaoEscopo = 'pessoal',
  equipeId?: string,
  mencoes?: string[],
  parentId?: string,
): Promise<Observacao | ApiError> {
  try {
    const body: Record<string, unknown> = { conteudo, escopo };
    if (equipeId) body.equipe_id = equipeId;
    if (mencoes && mencoes.length > 0) body.mencoes = mencoes;
    if (parentId) body.parent_id = parentId;

    const response = await fetch(
      `${getApiBaseUrl()}/observacoes/${encodeURIComponent(numeroProcesso)}?usuario=${encodeURIComponent(usuario)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao criar observacao: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Observacao;
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function marcarMencaoVista(
  numeroProcesso: string,
  observacaoId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/observacoes/${encodeURIComponent(numeroProcesso)}/${observacaoId}/visto?usuario=${encodeURIComponent(usuario)}`,
      { method: 'PATCH', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao marcar como visto: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function deleteObservacao(
  numeroProcesso: string,
  observacaoId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/observacoes/${encodeURIComponent(numeroProcesso)}/${observacaoId}?usuario=${encodeURIComponent(usuario)}`,
      { method: 'DELETE', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao excluir observacao: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o servico', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
