import { NextRequest, NextResponse } from 'next/server';

const DASHBOARD_BASE_URL = process.env.SALARY_API_BASE_URL || 'https://dashboards.gestor.pi.gov.br';
const TIMEOUT_MS = parseInt(process.env.SALARY_API_TIMEOUT_MS || '8000', 10);
const MAX_RETRIES = parseInt(process.env.SALARY_API_MAX_RETRIES || '2', 10);
const CACHE_TTL_MS = parseInt(process.env.SALARY_API_CACHE_TTL_MS || '3600000', 10);

// Cache em memória com TTL de 1 hora
const salaryCache = new Map<string, { data: any; expires: number }>();

const getCacheKey = (cpf: string, mesInicio: string, mesFim: string, anoInicio: string, anoFim: string) => {
  return `${cpf}|${mesInicio}|${mesFim}|${anoInicio}|${anoFim}`;
};

const fetchWithRetry = async (url: string): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      // Se sucesso, retorna
      if (response.ok) return response;

      // Se 504 ou 503, aguarda e tenta novamente
      if ((response.status === 504 || response.status === 503) && attempt < MAX_RETRIES - 1) {
        const backoffMs = 2000 + Math.random() * 3000; // 2-5s aleatório
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      // Qualquer outro status, retorna
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES - 1) {
        const backoffMs = 2000 + Math.random() * 3000; // 2-5s aleatório
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error('Falha ao consultar após múltiplas tentativas');
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cpf = searchParams.get('cpf')?.trim() || '';
  const mesInicio = searchParams.get('mes_inicio')?.trim() || '';
  const mesFim = searchParams.get('mes_fim')?.trim() || '';
  const anoInicio = searchParams.get('ano_inicio')?.trim() || '';
  const anoFim = searchParams.get('ano_fim')?.trim() || '';

  if (!cpf || !mesInicio || !mesFim || !anoInicio || !anoFim) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios: cpf, mes_inicio, mes_fim, ano_inicio, ano_fim.' },
      { status: 400 }
    );
  }

  try {
    const cacheKey = getCacheKey(cpf, mesInicio, mesFim, anoInicio, anoFim);

    // Verifica cache
    const cached = salaryCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    const url = `${DASHBOARD_BASE_URL}/folha/api/funcionario/historico?cpf=${encodeURIComponent(cpf)}&mes_inicio=${encodeURIComponent(mesInicio)}&mes_fim=${encodeURIComponent(mesFim)}&ano_inicio=${encodeURIComponent(anoInicio)}&ano_fim=${encodeURIComponent(anoFim)}`;

    const response = await fetchWithRetry(url);
    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Falha ao consultar histórico salarial.',
          status: response.status,
        },
        { status: response.status }
      );
    }

    try {
      const data = JSON.parse(text);

      // Armazena no cache com TTL configurável
      salaryCache.set(cacheKey, {
        data,
        expires: Date.now() + CACHE_TTL_MS,
      });

      return NextResponse.json(data, {
        headers: { 'X-Cache': 'MISS' },
      });
    } catch {
      return new NextResponse(text, {
        status: 200,
        headers: { 'content-type': response.headers.get('content-type') || 'text/plain' },
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erro de conexão ao consultar histórico salarial.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
