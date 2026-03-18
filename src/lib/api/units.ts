import type { ApiError, UnidadeAberta } from '@/types/process-flow';
import { getApiBaseUrl, validateToken, fetchWithErrorHandling } from './fetch-utils';
import { stripProcessNumber } from '@/lib/utils';

export async function fetchOpenUnits(
  token: string,
  protocoloProcedimento: string,
  unidadeOrigemConsulta: string
): Promise<{ unidades: UnidadeAberta[]; linkAcesso?: string } | ApiError> {
  if (!protocoloProcedimento || !unidadeOrigemConsulta) {
    return { error: "Número do processo e unidade de origem são obrigatórios.", status: 400 };
  }

  const tokenError = validateToken(token);
  if (tokenError) return tokenError;

  const url = `${getApiBaseUrl()}/sei/unidades-abertas/${encodeURIComponent(stripProcessNumber(protocoloProcedimento))}?id_unidade=${encodeURIComponent(unidadeOrigemConsulta)}`;

  const result = await fetchWithErrorHandling<{ UnidadesProcedimentoAberto?: UnidadeAberta[]; LinkAcesso?: string }>(
    url,
    {
      method: 'GET',
      headers: {
        'X-SEI-Token': token,
        'accept': 'application/json',
      },
    },
    'Falha ao buscar unidades com processo aberto'
  );

  if ('error' in result) return result;

  return {
    unidades: result.UnidadesProcedimentoAberto || [],
    linkAcesso: result.LinkAcesso,
  };
}
