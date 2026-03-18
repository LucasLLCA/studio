import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'https://mcp.gestor.sead.pi.gov.br';
  const apiKey = process.env.MCP_API_KEY || '';

  console.log('[health] Health check called');
  console.log('[health] Environment variables:', {
    apiUrl,
    apiKeyPresent: !!apiKey,
    nodeEnv: process.env.NODE_ENV,
  });

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      apiUrl,
      apiKeyPresent: !!apiKey,
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
