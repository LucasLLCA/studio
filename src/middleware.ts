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
    console.log('[middleware] token param detected, attempting decryption...');
    console.log('[middleware] JWE_SECRET_KEY set:', !!process.env.JWE_SECRET_KEY);

    const payload = await decryptJWE(tokenParam);
    console.log('[middleware] decryption result:', payload ? 'success' : 'failed');

    if (payload) {
      console.log('[middleware] payload keys:', Object.keys(payload));
      console.log('[middleware] id_pessoa:', payload.id_pessoa, 'usuario:', payload.usuario, 'id_orgao:', payload.id_orgao);

      // Valid token — set cookie and redirect to clean URL
      const cleanUrl = new URL(request.nextUrl.pathname, request.url);
      console.log('[middleware] setting cookie and redirecting to:', cleanUrl.toString());
      const response = NextResponse.redirect(cleanUrl);

      const THIRTY_DAYS = 30 * 24 * 60 * 60;
      const exp = payload.exp as number | undefined;
      const now = Math.floor(Date.now() / 1000);
      const maxAge = exp && exp > now ? exp - now : THIRTY_DAYS;

      response.cookies.set(COOKIE_NAME, tokenParam, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge,
      });
      return response;
    }
    // Invalid or expired token param — strip it and continue
    const cleanUrl = new URL(request.nextUrl.pathname, request.url);
    console.log('[middleware] invalid/expired token, redirecting to:', cleanUrl.toString());
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

  const exp = payload.exp as number | undefined;
  if (exp) {
    const now = Math.floor(Date.now() / 1000);
    // Token expired — revoke
    if (exp <= now) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
