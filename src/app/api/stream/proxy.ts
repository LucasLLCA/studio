import { NextRequest } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Proxies an SSE request from the client to the internal backend,
 * avoiding mixed-content issues when the frontend is served over HTTPS.
 */
export function proxySSE(backendPath: string) {
  return async function GET(request: NextRequest) {
    const token = request.headers.get("X-SEI-Token") || "";
    const searchParams = request.nextUrl.searchParams.toString();
    const separator = searchParams ? "?" : "";
    const url = `${BACKEND_BASE_URL}${backendPath}${separator}${searchParams}`;

    try {
      const backendResponse = await fetch(url, {
        method: "GET",
        headers: {
          "X-SEI-Token": token,
          Accept: "text/event-stream",
        },
      });

      if (!backendResponse.ok || !backendResponse.body) {
        return new Response(backendResponse.statusText, {
          status: backendResponse.status,
        });
      }

      return new Response(backendResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    } catch {
      return new Response("Proxy SSE: backend indisponível", { status: 502 });
    }
  };
}
