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
  // 1. If ?token= is in the URL, validate it, set as cookie, and redirect without the param
  const tokenParam = request.nextUrl.searchParams.get('token');
  if (tokenParam) {
    const payload = await decryptJWE(tokenParam);
    if (payload) {
      const exp = (payload.exp as number) ?? 0;
      const now = Math.floor(Date.now() / 1000);

      if (exp > now) {
        // Valid token — set cookie and redirect to clean URL
        const cleanUrl = new URL(request.nextUrl.pathname, request.url);
        const response = NextResponse.redirect(cleanUrl);
        response.cookies.set(COOKIE_NAME, tokenParam, {
          httpOnly: false,
          secure: request.nextUrl.protocol === 'https:',
          sameSite: 'lax',
          path: '/',
          maxAge: exp - now,
        });
        return response;
      }
    }
    // Invalid or expired token param — strip it and continue
    const cleanUrl = new URL(request.nextUrl.pathname, request.url);
    return NextResponse.redirect(cleanUrl);
  }

  // 2. Validate existing cookie
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
