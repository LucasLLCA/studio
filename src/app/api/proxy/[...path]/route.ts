import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_SUMMARY_API_BASE_URL || "http://127.0.0.1:8000";

const FORWARDED_HEADERS = ["x-sei-token", "content-type", "accept"];

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const key of FORWARDED_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers[key] = value;
  }
  return headers;
}

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const backendPath = "/" + path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const separator = searchParams ? "?" : "";
  const url = `${BACKEND_BASE_URL}${backendPath}${separator}${searchParams}`;

  const headers = forwardHeaders(request);

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      fetchOptions.body = await request.text();
    } catch {
      // no body
    }
  }

  try {
    const backendResponse = await fetch(url, fetchOptions);

    const responseHeaders = new Headers();
    const contentType = backendResponse.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);

    const body = await backendResponse.arrayBuffer();
    return new NextResponse(body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Proxy: falha ao conectar com o backend", details: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
