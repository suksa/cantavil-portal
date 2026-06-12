import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LoginError } from '@/lib/dtspace';
import { submitInspection } from '@/lib/inspect';
import { clearSession, readSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DataUrl = z.string().regex(/^data:image\/[a-zA-Z]+;base64,/, '사진 형식이 올바르지 않습니다.');

const SubmitSchema = z.object({
  cdLoc: z.number().int().positive(),
  cdRgon: z.number().int().positive(),
  cdDfctCaus: z.number().int().positive(),
  cdDfctCl: z.number().int().positive(),
  cdDfctType: z.number().int().positive(),
  nmLoc: z.string().min(1),
  nmRgon: z.string().min(1),
  nmDfctCaus: z.string().min(1),
  nmDfctCl: z.string().min(1),
  nmDfctType: z.string().min(1),
  dfctCnts: z.string().trim().min(2, '하자 내용을 두 글자 이상 입력해 주세요.'),
  image1: DataUrl,
  image2: DataUrl,
  resultOfLlm: z.string().nullable().optional(),
  nmCstCpny: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? '입력값을 확인해 주세요.';
    return NextResponse.json({ error: first }, { status: 400 });
  }

  try {
    const result = await submitInspection(session.jwt, parsed.data, {
      dong: session.info.dong,
      ho: session.info.ho,
      displayDong: session.info.displayDong,
      nmCstm: session.info.nmCstm,
      noMphn: session.info.noMphn,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LoginError && err.status === 401) {
      await clearSession();
      return NextResponse.json({ error: '세션이 만료되었습니다.' }, { status: 401 });
    }
    if (err instanceof LoginError) {
      console.error('[inspect/submit]', err.message, err.detail);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: '점검 등록에 실패했습니다.' }, { status: 500 });
  }
}
