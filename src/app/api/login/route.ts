import { NextRequest, NextResponse } from 'next/server';
import { LoginError, fetchDongList, upstreamLogin } from '@/lib/dtspace';
import { LoginSchema, normalizePhone } from '@/lib/schema';
import { buildSessionInfo, setSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문을 해석하지 못했습니다.' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const first =
      flat.dong?.[0] || flat.ho?.[0] || flat.nmCstm?.[0] || flat.noMphn?.[0] || '입력값을 확인해 주세요.';
    return NextResponse.json({ error: first, fieldErrors: flat }, { status: 400 });
  }

  const data = parsed.data;
  const noMphn = normalizePhone(data.noMphn);
  const ua = req.headers.get('user-agent') ?? 'mozilla/5.0';

  try {
    const [result, dongList] = await Promise.all([
      upstreamLogin({ dong: data.dong, ho: data.ho, nmCstm: data.nmCstm, noMphn }, ua),
      fetchDongList().catch(() => []),
    ]);
    const userDong = String(result.user.dong ?? data.dong);
    const matched = dongList.find((d) => d.dong === userDong);
    const displayDong = matched?.nmDong ?? userDong;
    const info = buildSessionInfo({
      user: result.user,
      fallback: { nmCstm: data.nmCstm, dong: data.dong, ho: data.ho, noMphn },
      displayDong,
    });
    await setSession({ jwt: result.jwt, info });
    return NextResponse.json({ ok: true, info });
  } catch (err) {
    if (err instanceof LoginError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[login] unexpected error:', (err as Error)?.message, (err as Error)?.stack);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
