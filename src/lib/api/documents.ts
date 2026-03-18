import { API_BASE_URL, validateToken } from './fetch-utils';

export async function assinarDocumento(params: {
  protocoloDocumento: string;
  idUnidade: string;
  token: string;
  orgao: string;
  cargo: string;
  idLogin: string;
  senha: string;
  idUsuario: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const tokenError = validateToken(params.token);
  if (tokenError) return { success: false, error: tokenError.error };

  try {
    const url = `${API_BASE_URL}/sei/documentos/${encodeURIComponent(params.protocoloDocumento)}/assinar?id_unidade=${encodeURIComponent(params.idUnidade)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'X-SEI-Token': params.token,
      },
      body: JSON.stringify({
        orgao: params.orgao,
        cargo: params.cargo,
        id_login: params.idLogin,
        senha: params.senha,
        id_usuario: params.idUsuario,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorDetail: string;
      try {
        const errBody = await response.json();
        errorDetail = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody);
      } catch {
        errorDetail = await response.text();
      }
      return { success: false, error: errorDetail || `Erro ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao conectar com o serviço.',
    };
  }
}
