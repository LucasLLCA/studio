import type {
  LoginCredentials,
  ClientLoginResponse,
  SEILoginApiResponse,
  UnidadeFiltro,
} from '@/types/process-flow';
import { API_BASE_URL } from './fetch-utils';

export async function loginToSEI(credentials: LoginCredentials): Promise<ClientLoginResponse> {
  if (!credentials || !credentials.usuario || !credentials.senha || !credentials.orgao) {
    return { success: false, error: "Credenciais de login incompletas.", status: 400 };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/sei/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        usuario: credentials.usuario,
        senha: credentials.senha,
        orgao: credentials.orgao,
      }),
      cache: 'no-store',
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch {
        errorDetails = responseText;
      }

      if (response.status === 401) {
        const message = typeof errorDetails === 'string'
          ? errorDetails
          : (errorDetails as Record<string, unknown>)?.detail || (errorDetails as Record<string, unknown>)?.Message || `Falha no login. Status: ${response.status}`;
        return { success: false, error: `Falha na autenticação: ${message}`, details: errorDetails, status: response.status };
      }

      const errorMessage = (errorDetails as Record<string, unknown>)?.detail || (errorDetails as Record<string, unknown>)?.Message || `Falha no login. Status: ${response.status}`;
      return { success: false, error: String(errorMessage), details: errorDetails, status: response.status };
    }

    const data = JSON.parse(responseText) as SEILoginApiResponse;

    const idUnidadeAtualFromAPI = data.Login?.IdUnidadeAtual;
    const nomeUsuarioFromAPI =
      data.Login?.Nome ||
      (data as { Nome?: string }).Nome ||
      (data as { Usuario?: { Nome?: string } }).Usuario?.Nome;

    if (!data.Token) {
      return { success: false, error: "Token não retornado pela API de login.", details: data, status: 500 };
    }

    const unidades: UnidadeFiltro[] = (data.Unidades || []).map(ua => ({
      Id: ua.Id,
      Sigla: ua.Sigla,
      Descricao: ua.Descricao,
    }));

    const tokenToReturn = typeof data.Token === 'string' ? data.Token : String(data.Token);
    const idUnidadeAtual = idUnidadeAtualFromAPI;

    return {
      success: true,
      token: tokenToReturn,
      unidades,
      idUnidadeAtual,
      nomeUsuario: nomeUsuarioFromAPI,
      idUsuario: data.Login?.IdUsuario,
      idLogin: data.Login?.IdLogin,
      cargoAssinatura: data.Login?.UltimoCargoAssinatura,
    };

  } catch (error) {
    return {
      success: false,
      error: "Erro de conexão ao tentar fazer login.",
      details: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}
