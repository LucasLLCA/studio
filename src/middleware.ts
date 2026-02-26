import { NextRequest, NextResponse } from 'next/server';
import { compactDecrypt } from 'jose';

const COOKIE_NAME = 'auth_token';

async function decryptJWE(token: string): Promise<Record<string, unknown> | null> {
  const jweSecret = process.env.JWE_SECRET_KEY;
  if (!jweSecret) return null;

  try {
    const keyBytes = Uint8Array.from(
      atob(jweSecret.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0),
    );
    if (keyBytes.length !== 32) return null;

    const { plaintext } = await compactDecrypt(token, keyBytes);
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return NextResponse.next();

  const payload = await decryptJWE(cookie.value);
  if (!payload) {
    // Corrupted token — delete cookie
    const response = NextResponse.next();
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = (payload.exp as number) ?? 0;

  // Token expired — revoke
  if (exp <= now) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
