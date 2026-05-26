import { NextRequest, NextResponse } from 'next/server';
import { fetchHoList } from '@/lib/dtspace';
import { HoQuerySchema } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dong = req.nextUrl.searchParams.get('dong') ?? '';
  const parsed = HoQuerySchema.safeParse({ dong });
  if (!parsed.success) {
    return NextResponse.json({ error: '잘못된 동 값입니다.' }, { status: 400 });
  }
  try {
    const hoList = await fetchHoList(parsed.data.dong);
    return NextResponse.json(
      { hoList },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: '호 목록을 불러오지 못했습니다.', detail: (err as Error).message },
      { status: 502 },
    );
  }
}
