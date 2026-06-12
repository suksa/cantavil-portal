import { NextRequest, NextResponse } from 'next/server';
import { DTSPACE_BASE } from '@/lib/dtspace';
import { readSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Only relay dtspace flaw-photo paths — locks the proxy to its intended use.
const ALLOWED = /\/customer\/list\/img\/upload\/images\/dfct\/[A-Za-z0-9_\-/.]+\.(jpe?g|png|webp)$/i;

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: '요청이 올바르지 않습니다.' }, { status: 400 });
  }
  const url = String(body.url ?? '');
  let parsed: URL;
  try {
    parsed = new URL(url, DTSPACE_BASE);
  } catch {
    return NextResponse.json({ error: '잘못된 URL입니다.' }, { status: 400 });
  }
  const base = new URL(DTSPACE_BASE);
  if (parsed.host !== base.host || !ALLOWED.test(parsed.pathname)) {
    return NextResponse.json({ error: '허용되지 않은 이미지입니다.' }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8',
        Cookie: `CSTM_LOGIN_KEY=${session.jwt}`,
        Referer: `${DTSPACE_BASE}/customer/list/detail`,
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ error: '이미지를 불러오지 못했습니다.' }, { status: 502 });
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buf.toString('base64')}`;
    return NextResponse.json({ dataUrl });
  } catch {
    return NextResponse.json({ error: '이미지를 불러오지 못했습니다.' }, { status: 502 });
  }
}
