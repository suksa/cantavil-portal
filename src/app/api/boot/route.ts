import { NextResponse } from 'next/server';
import { SITE_CODE, SITE_NAME, fetchDongList } from '@/lib/dtspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dongList = await fetchDongList();
    return NextResponse.json(
      { cdSite: SITE_CODE, nmSite: SITE_NAME, dongList },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: '동 목록을 불러오지 못했습니다.', detail: (err as Error).message },
      { status: 502 },
    );
  }
}
