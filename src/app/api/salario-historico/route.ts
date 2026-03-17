import { NextRequest, NextResponse } from 'next/server';

const DASHBOARD_BASE_URL = 'https://dashboards.gestor.pi.gov.br';

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
    const url = `${DASHBOARD_BASE_URL}/folha/api/funcionario/historico?cpf=${encodeURIComponent(cpf)}&mes_inicio=${encodeURIComponent(mesInicio)}&mes_fim=${encodeURIComponent(mesFim)}&ano_inicio=${encodeURIComponent(anoInicio)}&ano_fim=${encodeURIComponent(anoFim)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Falha ao consultar histórico salarial.',
          status: response.status,
          details: text,
        },
        { status: response.status }
      );
    }

    try {
      return NextResponse.json(JSON.parse(text));
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
