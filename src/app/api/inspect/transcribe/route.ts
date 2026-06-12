import { NextRequest, NextResponse } from 'next/server';
import { LoginError } from '@/lib/dtspace';
import { transcribe } from '@/lib/inspect';
import { readSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: '오디오 데이터가 필요합니다.' }, { status: 400 });
  }
  try {
    const text = await transcribe(session.jwt, form);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof LoginError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: '음성 인식에 실패했습니다.' }, { status: 500 });
  }
}
