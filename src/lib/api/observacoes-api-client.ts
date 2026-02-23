import type { ApiError } from '@/types/process-flow';
import type { Observacao } from '@/types/teams';

const API_BASE_URL = process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "https://api.sei.agentes.sead.pi.gov.br";

export async function getObservacoes(
  numeroProcesso: string,
): Promise<Observacao[] | ApiError> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/observacoes/${encodeURIComponent(numeroProcesso)}`,
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

export async function createObservacao(
  numeroProcesso: string,
  usuario: string,
  conteudo: string,
): Promise<Observacao | ApiError> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/observacoes/${encodeURIComponent(numeroProcesso)}?usuario=${encodeURIComponent(usuario)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ conteudo }),
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

export async function deleteObservacao(
  numeroProcesso: string,
  observacaoId: string,
  usuario: string,
): Promise<{ success: boolean } | ApiError> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/observacoes/${encodeURIComponent(numeroProcesso)}/${observacaoId}?usuario=${encodeURIComponent(usuario)}`,
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
