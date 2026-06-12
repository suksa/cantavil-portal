import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/dtspace';
import { decodeSession } from '@/lib/session';
import { getSettings } from '@/lib/admin';

export const config = {
  matcher: [
    // Shutdown sweep + live-site gate. Broader than what the live gate needs
    // so the shutdown sweep can catch root + every API at once.
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/inspect/:path*',
    '/locked',
    '/api/:path*',
  ],
};

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie) : null;
  const isAdmin = session?.info.isAdmin === true;

  const settings = await getSettings();

  // Surfaces that stay reachable during a shutdown so an admin can always
  // sign in and flip the switch back.
  const isAdminPage = path === '/admin' || path.startsWith('/admin/');
  const isAdminApi = path.startsWith('/api/admin/');
  const isAuthApi =
    path === '/api/login' ||
    path === '/api/logout' ||
    path === '/api/boot' ||
    path === '/api/ho';

  if (settings.serviceClosed) {
    if (path === '/closed') return NextResponse.next();
    const adminBypass = isAdmin && settings.adminBypassClosed !== false;
    if (!isAdminPage && !isAdminApi && !isAuthApi && !adminBypass) {
      if (path.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: '서비스가 종료되었습니다.' }), {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/closed';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Live-site gating. The matcher above is broader than the original so the
  // shutdown sweep catches everything — re-narrow here to the routes the
  // original gate actually cared about and let everything else pass through.
  const isGatedApi = isAdminApi || path === '/api/flaws' || path.startsWith('/api/inspect');
  const isGatedPage =
    path.startsWith('/dashboard') || isAdminPage || path.startsWith('/inspect');
  if (!isGatedApi && !isGatedPage) return NextResponse.next();

  // /admin page renders its own login panel for unauthenticated visitors and
  // the admin UI for admin sessions — let the page decide.
  if (isAdminPage) {
    return NextResponse.next();
  }

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

  if (isAdminApi) {
    if (!isAdmin) {
      return new NextResponse(JSON.stringify({ error: '관리자 권한이 필요합니다.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return NextResponse.next();
  }

  // Site kill switch — admins always pass through.
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
