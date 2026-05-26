import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/dtspace';

export const config = {
  matcher: ['/dashboard/:path*'],
};

export function proxy(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('reason', 'auth');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
