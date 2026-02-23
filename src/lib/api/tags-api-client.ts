'use server';

import type { ApiError } from '@/types/process-flow';
import type { Tag, TagWithProcessos, SavedProcesso, ProcessoSalvoCheck } from '@/types/teams';

const API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "https://api.sei.agentes.sead.pi.gov.br";

export async function createTag(
  usuario: string,
  nome: string,
  cor?: string,
): Promise<Tag | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/tags?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ nome, cor: cor || undefined }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao criar tag: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Tag;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getMyTags(
  usuario: string,
): Promise<Tag[] | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/tags?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar tags: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Tag[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getTagWithProcessos(
  tagId: string,
  usuario: string,
): Promise<TagWithProcessos | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/tags/${tagId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar tag: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TagWithProcessos;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function updateTag(
  tagId: string,
  usuario: string,
  updates: { nome?: string; cor?: string },
): Promise<Tag | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/tags/${tagId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao atualizar tag: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Tag;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function deleteTag(
  tagId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/tags/${tagId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao excluir tag: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function saveProcessoToTag(
  tagId: string,
  usuario: string,
  numeroProcesso: string,
  numeroProcessoFormatado?: string,
  nota?: string,
): Promise<SavedProcesso | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/tags/${tagId}/processos?usuario=${encodeURIComponent(usuario)}`, {
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
      return { error: `Falha ao salvar processo: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as SavedProcesso;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function removeProcessoFromTag(
  tagId: string,
  processoId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/tags/${tagId}/processos/${processoId}?usuario=${encodeURIComponent(usuario)}`,
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

export async function checkProcessoSalvo(
  usuario: string,
  numeroProcesso: string,
): Promise<ProcessoSalvoCheck | ApiError> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/tags/processo-salvo?usuario=${encodeURIComponent(usuario)}&numero_processo=${encodeURIComponent(numeroProcesso)}`,
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
