import { NextRequest } from "next/server";
import { proxySSE } from "../../proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ numero: string }> },
) {
  const { numero } = await params;
  return proxySSE(`/processo/resumo-situacao-stream/${encodeURIComponent(numero)}`)(request);
}
