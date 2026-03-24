"use server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8000";

export interface PermissionsResponse {
  modulos: string[];
  papel_nome: string;
  papel_slug: string;
}

export interface ApiError {
  error: string;
}

export async function fetchPermissions(
  idPessoa: number
): Promise<PermissionsResponse | ApiError> {
  try {
    const res = await fetch(`${API_BASE}/credenciais/permissions/${idPessoa}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      return { error: `Erro ${res.status}: ${detail}` };
    }

    return (await res.json()) as PermissionsResponse;
  } catch (err) {
    return { error: `Erro de rede: ${String(err)}` };
  }
}
