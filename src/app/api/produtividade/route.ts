import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matricula = searchParams.get('matricula')?.trim() || '';
  const nome = searchParams.get('nome')?.trim() || '';

  if (!matricula && !nome) {
    return NextResponse.json(
      { error: 'Informe pelo menos um parâmetro: matricula ou nome.' },
      { status: 400 }
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'https://mcp.gestor.sead.pi.gov.br';
  const apiKey = process.env.MCP_API_KEY || '';

  try {
    const query = new URLSearchParams();
    if (matricula) query.set('matricula', matricula);
    if (nome) query.set('nome', nome);

    const url = `${apiUrl}/pessoa/produtividade?${query.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': apiKey,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Falha ao consultar produtividade no MCP.',
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
        error: 'Erro ao conectar com a API MCP.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
