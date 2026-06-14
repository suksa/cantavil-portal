import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings, type AdminSettings, type Visibility } from '@/lib/admin';
import { readSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const settings = await getSettings();
  return NextResponse.json({ settings, isAdmin: session.info.isAdmin });
}

const VIS_VALUES: Visibility[] = ['hidden', 'admin', 'all'];

export async function PUT(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!session.info.isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  let body: Partial<AdminSettings>;
  try {
    body = (await req.json()) as Partial<AdminSettings>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }
  if (
    body.visibility &&
    !Object.values(body.visibility).every(
      (v) => v === undefined || VIS_VALUES.includes(v as Visibility),
    )
  ) {
    return NextResponse.json({ error: '잘못된 표시 옵션입니다.' }, { status: 400 });
  }
  // Guard the secondary admin unit shape (digits only) so it can't be garbage.
  if (body.adminUnit && (body.adminUnit.dong || body.adminUnit.ho)) {
    const okDong = /^\d{2,8}$/.test(String(body.adminUnit.dong ?? ''));
    const okHo = /^\d{3,5}$/.test(String(body.adminUnit.ho ?? ''));
    if (!okDong || !okHo) {
      return NextResponse.json({ error: '관리자 호실 형식이 올바르지 않습니다.' }, { status: 400 });
    }
  }
  const actor = `${session.info.dong}/${session.info.ho}`;
  const next = await updateSettings(body, actor);
  return NextResponse.json({ settings: next });
}
