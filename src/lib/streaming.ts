const SUMMARY_API_BASE_URL =
  process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Fetches an SSE stream from the backend and calls callbacks as events arrive.
 *
 * Uses fetch + ReadableStream (not EventSource) so we can send custom headers.
 */
export async function fetchSSEStream(
  url: string,
  token: string,
  onChunk: (text: string) => void,
  onDone: (fullResult: any) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-SEI-Token": token,
        Accept: "text/event-stream",
      },
      signal,
    });

    if (!response.ok) {
      onError(`Erro HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("Navegador não suporta streaming");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const parts = buffer.split("\n\n");
      // Keep the last (potentially incomplete) part in the buffer
      buffer = parts.pop() || "";

      for (const part of parts) {
        const lines = part.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "chunk") {
                onChunk(event.content);
              } else if (event.type === "done") {
                onDone(event.content);
                return;
              } else if (event.type === "error") {
                onError(event.content);
                return;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    onError(err?.message || "Erro de conexão com o servidor");
  }
}

export function getStreamProcessSummaryUrl(
  processNumber: string,
  unidadeId: string,
): string {
  const formatted = processNumber.replace(/[.\/-]/g, "");
  return `${SUMMARY_API_BASE_URL}/processo/resumo-completo-stream/${encodeURIComponent(formatted)}?id_unidade=${encodeURIComponent(unidadeId)}`;
}

export function getStreamDocumentSummaryUrl(
  documentoFormatado: string,
  unidadeId: string,
): string {
  return `${SUMMARY_API_BASE_URL}/processo/resumo-documento-stream/${encodeURIComponent(documentoFormatado)}?id_unidade=${encodeURIComponent(unidadeId)}`;
}
