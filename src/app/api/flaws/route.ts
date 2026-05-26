import { NextResponse } from 'next/server';
import { LoginError, fetchFlawList } from '@/lib/dtspace';
import { clearSession, readSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  try {
    const { items, total } = await fetchFlawList(session.jwt);
    return NextResponse.json(
      { items, total, info: session.info },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    if (err instanceof LoginError && err.status === 401) {
      await clearSession();
      return NextResponse.json({ error: '세션이 만료되었습니다.' }, { status: 401 });
    }
    if (err instanceof LoginError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: '데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
}
