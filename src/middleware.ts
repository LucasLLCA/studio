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
    // Rewrite to /login so the embed auto-login flow runs immediately.
    // Keep ?token= in searchParams so the login page can read it directly
    // (necessary for credentialless iframes where cookies may not persist).
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const response = NextResponse.rewrite(loginUrl);

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
