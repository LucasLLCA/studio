import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'auth_token';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function middleware(request: NextRequest) {
  const tokenParam = request.nextUrl.searchParams.get('token');

  // Debug logging for embed flow
  if (tokenParam) {
    console.log(`[middleware] Token received via URL (${tokenParam.length} chars), setting auth_token cookie (httpOnly=${IS_PRODUCTION})`);
  } else {
    const existingCookie = request.cookies.get(COOKIE_NAME)?.value;
    console.log(`[middleware] ${request.nextUrl.pathname} — auth_token cookie ${existingCookie ? `present (${existingCookie.length} chars)` : 'NOT found'}`);
  }

  if (tokenParam) {
    // Strip ?token= from the URL via rewrite (no redirect — serves page inline).
    // This avoids losing the cookie in credentialless/sandboxed iframes.
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('token');
    const response = NextResponse.rewrite(cleanUrl);

    const THIRTY_DAYS = 30 * 24 * 60 * 60;
    response.cookies.set(COOKIE_NAME, tokenParam, {
      httpOnly: IS_PRODUCTION,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
