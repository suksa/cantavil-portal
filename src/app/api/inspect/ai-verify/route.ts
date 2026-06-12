import { NextRequest, NextResponse } from 'next/server';
import { LoginError } from '@/lib/dtspace';
import { aiVerify } from '@/lib/inspect';
import { readSession } from '@/lib/session';
import type { AiVerifyInput } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  let body: AiVerifyInput;
  try {
    body = (await req.json()) as AiVerifyInput;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!body || typeof body.sttText !== 'string') {
    return NextResponse.json({ error: '하자 내용이 필요합니다.' }, { status: 400 });
  }
  try {
    const result = await aiVerify(session.jwt, {
      nmLoc: body.nmLoc ?? '',
      nmRgon: body.nmRgon ?? '',
      nmDfctCaus: body.nmDfctCaus ?? '',
      nmDfctCl: body.nmDfctCl ?? '',
      nmDfctType: body.nmDfctType ?? '',
      sttText: body.sttText ?? '',
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LoginError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'AI 분석에 실패했습니다.' }, { status: 500 });
  }
}
