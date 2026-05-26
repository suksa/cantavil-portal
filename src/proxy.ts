import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/dtspace';
import { decodeSession } from '@/lib/session';
import { getSettings } from '@/lib/admin';

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/admin/:path*', '/api/flaws'],
};

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = cookie ? decodeSession(cookie) : null;

  // Anything in this matcher needs a session.
  if (!session) {
    if (path.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: '로그인이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('reason', 'auth');
    return NextResponse.redirect(url);
  }

  const isAdmin = session.info.isAdmin === true;

  // Admin-only zones.
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    if (!isAdmin) {
      if (path.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: '관리자 권한이 필요합니다.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Site kill switch — admins always pass through.
  const settings = await getSettings();
  if (settings.siteLocked && !isAdmin) {
    if (path.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: '서비스가 일시 차단되었습니다.' }), {
        status: 423,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/locked';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
