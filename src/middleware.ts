import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'auth_token';

export function middleware(request: NextRequest) {
  // If ?token= is in the URL, set it as a cookie and redirect to a clean URL
  const tokenParam = request.nextUrl.searchParams.get('token');
  if (tokenParam) {
    const cleanUrl = new URL(request.nextUrl.pathname, request.url);
    const response = NextResponse.redirect(cleanUrl);

    const THIRTY_DAYS = 30 * 24 * 60 * 60;
    response.cookies.set(COOKIE_NAME, tokenParam, {
      httpOnly: false,
      secure: false,
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
