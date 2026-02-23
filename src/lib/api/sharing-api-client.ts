'use server';

import type { ApiError } from '@/types/process-flow';
import type { SharedWithMeItem, ShareRecord } from '@/types/teams';

const API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "https://api.sei.agentes.sead.pi.gov.br";

export async function shareTag(
  usuario: string,
  tagId: string,
  destino: { equipe_destino_id?: string; usuario_destino?: string },
): Promise<ShareRecord | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/compartilhamentos?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ tag_id: tagId, ...destino }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao compartilhar: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as ShareRecord;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getSharedWithMe(
  usuario: string,
): Promise<SharedWithMeItem[] | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/compartilhamentos/recebidos?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar compartilhados: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as SharedWithMeItem[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getMyShares(
  usuario: string,
): Promise<ShareRecord[] | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/compartilhamentos/enviados?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar compartilhamentos: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as ShareRecord[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function revokeShare(
  compartilhamentoId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/compartilhamentos/${compartilhamentoId}?usuario=${encodeURIComponent(usuario)}`,
      { method: 'DELETE', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao revogar: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
