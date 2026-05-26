import type { DongOption, FlawCategory, FlawItem } from './types';

export const DTSPACE_BASE = process.env.DTSPACE_BASE_URL ?? 'https://m4.dtspace.co.kr';
export const SITE_CODE = process.env.CANTAVIL_SITE_CODE ?? 'DC0003';
export const SITE_NAME = '신검단중앙역 칸타빌 더 스위트';
export const SESSION_COOKIE_NAME = 'cantavil_session';
const UPSTREAM_COOKIE_NAME = 'CSTM_LOGIN_KEY';
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

export function categorize(item: { cdHndlStat?: string | null; ynReRcpt?: string | null }): FlawCategory {
  if (item.ynReRcpt === 'Y') return 'reAccepted';
  switch (item.cdHndlStat) {
    case 'B':
      return 'workDone';
    case 'C':
      return 'reAccepted';
    case 'D':
      return 'finalDone';
    case 'A':
    case 'E':
    default:
      return 'received';
  }
}

async function upstream(path: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(path, DTSPACE_BASE).toString();
  return fetch(url, {
    ...init,
    headers: {
      'User-Agent': DEFAULT_UA,
      Accept: '*/*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
}

export async function fetchDongList(): Promise<DongOption[]> {
  const res = await upstream(`/v1/customer/login/select-box?cdSite=${encodeURIComponent(SITE_CODE)}`);
  if (!res.ok) throw new Error(`select-box failed: ${res.status}`);
  const json = (await res.json()) as { hoList?: Array<{ dong?: string | null; nmDong?: string | null }> };
  const list = (json.hoList ?? [])
    .filter((x) => x.dong && x.nmDong)
    .map((x) => ({ dong: String(x.dong), nmDong: String(x.nmDong) }));
  list.sort((a, b) => a.nmDong.localeCompare(b.nmDong, 'ko'));
  return list;
}

export async function fetchHoList(dong: string): Promise<string[]> {
  const res = await upstream(
    `/v1/customer/login/select-box-ho?cdSite=${encodeURIComponent(SITE_CODE)}&dong=${encodeURIComponent(dong)}`,
  );
  if (!res.ok) throw new Error(`select-box-ho failed: ${res.status}`);
  const json = (await res.json()) as { hoList?: Array<{ ho?: string | null }> };
  const list = (json.hoList ?? [])
    .filter((x) => x.ho)
    .map((x) => String(x.ho));
  list.sort((a, b) => a.localeCompare(b, 'ko'));
  return list;
}

export interface UpstreamLoginInput {
  dong: string;
  ho: string;
  nmCstm: string;
  noMphn: string;
}

export interface UpstreamLoginResult {
  jwt: string;
  user: Record<string, unknown> & { nmCstm?: string; dong?: string; ho?: string };
}

export async function upstreamLogin(input: UpstreamLoginInput, userAgent: string): Promise<UpstreamLoginResult> {
  const body = JSON.stringify({
    cdSite: SITE_CODE,
    dong: input.dong,
    ho: input.ho,
    nmCstm: input.nmCstm,
    noMphn: input.noMphn,
    userAgent: userAgent.toLowerCase(),
  });
  const res = await upstream('/v1/customer/login', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      Origin: DTSPACE_BASE,
      Referer: `${DTSPACE_BASE}/customer/${SITE_CODE}`,
    },
  });
  if (res.status === 404 || res.status === 400) {
    const t = await res.text().catch(() => '');
    throw new LoginError('입주자 정보가 일치하지 않습니다.', 401, t);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new LoginError('로그인 요청에 실패했습니다.', 502, t);
  }
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = /CSTM_LOGIN_KEY=([^;]+)/i.exec(setCookie);
  if (!match) {
    throw new LoginError('세션을 발급받지 못했습니다.', 502);
  }
  const jwt = match[1];
  const userRaw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // Sanity: response should describe a real resident. If not, treat as auth failure.
  if (!userRaw || !userRaw.nmCstm || (userRaw.cdSite && userRaw.cdSite !== SITE_CODE)) {
    throw new LoginError('입주자 정보가 일치하지 않습니다.', 401);
  }
  return { jwt, user: userRaw };
}

export class LoginError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export async function fetchFlawList(jwt: string): Promise<{ items: FlawItem[]; total: number }> {
  const res = await upstream('/v1/mobile/sync-data/customer/stream', {
    headers: {
      Cookie: `${UPSTREAM_COOKIE_NAME}=${jwt}`,
      Accept: 'text/event-stream',
    },
  });
  if (res.status === 401) throw new LoginError('세션이 만료되었습니다.', 401);
  if (!res.ok) throw new LoginError('데이터를 불러오지 못했습니다.', 502);
  const text = await res.text();
  const blocks = text.split('\n\n');
  let donePayload: any = null;
  let total = 0;
  for (const block of blocks) {
    const lines = block.split('\n');
    let event = '';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5);
    }
    if (!event || !data) continue;
    if (event === 'meta') {
      try {
        total = Number((JSON.parse(data) as { total?: number }).total ?? 0);
      } catch {}
    } else if (event === 'done') {
      try {
        donePayload = JSON.parse(data);
      } catch (e) {
        throw new LoginError('데이터 파싱 실패', 502, (e as Error).message);
      }
    }
  }
  if (!donePayload) throw new LoginError('데이터 응답이 비어 있습니다.', 502);
  const rawList: any[] = Array.isArray(donePayload.ltDfct) ? donePayload.ltDfct : [];
  const seen = new Set<number>();
  const ids: number[] = [];
  const itemsRaw: any[] = [];
  for (const r of rawList) {
    const id = Number(r.noIdx);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    itemsRaw.push(r);
  }

  const pathsById = await fetchAllImagePaths(jwt, ids);

  const items: FlawItem[] = itemsRaw.map((r) => {
    const id = Number(r.noIdx);
    const paths = pathsById.get(id) ?? [];
    return {
      noIdx: id,
      dfctCnts: r.dfctCnts ?? null,
      nmLoc: r.nmLoc ?? null,
      nmRgon: r.nmRgon ?? null,
      nmDfctCaus: r.nmDfctCaus ?? null,
      nmDfctCl: r.nmDfctCl ?? null,
      nmCstCpny: r.nmCstCpny ?? null,
      nmWrkPrsn: r.nmWrkPrsn ?? null,
      cdHndlStat: String(r.cdHndlStat ?? ''),
      cdRcptPhs: r.cdRcptPhs ?? null,
      dtRcpt: r.dtRcpt ?? null,
      dtWrk: r.dtWrk ?? null,
      dtCplt: r.dtCplt ?? null,
      ynReRcpt: r.ynReRcpt ?? null,
      ynImg: r.ynImg ?? null,
      workMemo: r.workMemo ?? null,
      customerMemo: r.customerMemo ?? null,
      dong: String(r.dong ?? ''),
      ho: String(r.ho ?? ''),
      nmApltPrsn: r.nmApltPrsn ?? null,
      images: paths.map((p) => new URL(p, DTSPACE_BASE).toString()),
      category: categorize(r),
    };
  });
  items.sort((a, b) => (b.dtRcpt ?? '').localeCompare(a.dtRcpt ?? ''));
  return { items, total: total || items.length };
}

async function fetchImagePaths(jwt: string, noIdx: number): Promise<string[]> {
  const res = await upstream(`/v1/customer/flaw-inspection/image/${noIdx}`, {
    headers: {
      Cookie: `${UPSTREAM_COOKIE_NAME}=${jwt}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return [];
  try {
    const j = (await res.json()) as { list?: Array<{ imagePaths?: Record<string, string> | null }> };
    const entry = j.list?.[0];
    const ipObj = entry?.imagePaths;
    if (!ipObj || typeof ipObj !== 'object') return [];
    return Object.keys(ipObj)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => ipObj[k])
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
  } catch {
    return [];
  }
}

async function fetchAllImagePaths(jwt: string, ids: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  const CONCURRENCY = 8;
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const i = cursor++;
      const id = ids[i];
      const paths = await fetchImagePaths(jwt, id).catch(() => []);
      out.set(id, paths);
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker());
  await Promise.all(workers);
  return out;
}
