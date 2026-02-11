import { NextRequest } from "next/server";
import { proxySSE } from "../../proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documento: string }> },
) {
  const { documento } = await params;
  return proxySSE(`/processo/resumo-documento-stream/${encodeURIComponent(documento)}`)(request);
}
