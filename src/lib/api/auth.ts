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

      // Extract user-friendly message from SEI API error responses
      // SEI returns: {"detail":[{"loc":[...],"msg":"Usuário ou Senha Inválida.","type":"value_error.http"}]}
      const extractMessage = (details: unknown): string => {
        if (typeof details === 'string') return details;
        const obj = details as Record<string, unknown>;
        if (Array.isArray(obj?.detail)) {
          const firstError = obj.detail[0] as Record<string, unknown> | undefined;
          if (firstError?.msg) return String(firstError.msg);
        }
        if (typeof obj?.detail === 'string') return obj.detail;
        if (typeof obj?.Message === 'string') return obj.Message;
        return `Falha no login. Status: ${response.status}`;
      };

      const message = extractMessage(errorDetails);

      if (response.status === 401 || response.status === 422) {
        return { success: false, error: message, details: errorDetails, status: response.status };
      }

      return { success: false, error: message, details: errorDetails, status: response.status };
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
