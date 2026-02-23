'use server';

import type { ApiError } from '@/types/process-flow';
import type { Team, TeamDetail, TeamMember } from '@/types/teams';

const API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "https://api.sei.agentes.sead.pi.gov.br";

export async function createTeam(
  usuario: string,
  nome: string,
  descricao?: string,
): Promise<Team | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ nome, descricao }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao criar equipe: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Team;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getMyTeams(
  usuario: string,
): Promise<Team[] | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar equipes: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Team[];
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function getTeamDetail(
  teamId: string,
  usuario: string,
): Promise<TeamDetail | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/${teamId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao buscar equipe: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TeamDetail;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function updateTeam(
  teamId: string,
  usuario: string,
  updates: { nome?: string; descricao?: string },
): Promise<Team | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/${teamId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updates),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao atualizar equipe: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as Team;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function deleteTeam(
  teamId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/${teamId}?usuario=${encodeURIComponent(usuario)}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao excluir equipe: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function addTeamMember(
  teamId: string,
  usuario: string,
  membroUsuario: string,
  papel: string = 'member',
): Promise<TeamMember | ApiError> {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/${teamId}/membros?usuario=${encodeURIComponent(usuario)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ usuario: membroUsuario, papel }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao adicionar membro: ${response.status}`, details, status: response.status };
    }

    const data = await response.json();
    return data.data as TeamMember;
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}

export async function removeTeamMember(
  teamId: string,
  usuario: string,
  membroUsuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/equipes/${teamId}/membros/${encodeURIComponent(membroUsuario)}?usuario=${encodeURIComponent(usuario)}`,
      { method: 'DELETE', headers: { 'Accept': 'application/json' }, cache: 'no-store' },
    );

    if (!response.ok) {
      const details = await response.json().catch(() => response.statusText);
      return { error: `Falha ao remover membro: ${response.status}`, details, status: response.status };
    }

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao conectar com o serviço', details: error instanceof Error ? error.message : String(error), status: 500 };
  }
}
