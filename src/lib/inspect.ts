import { Redis } from '@upstash/redis';
import { DTSPACE_BASE, LoginError, SITE_CODE, SITE_NAME } from './dtspace';
import type {
  AiVerifyInput,
  AiVerifyResult,
  CodeOption,
  InspectBootstrap,
  InspectSubmitInput,
} from './types';

const UPSTREAM_COOKIE_NAME = 'CSTM_LOGIN_KEY';
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

// ---- shared KV (mirrors admin.ts wiring) ----
const hasKv =
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasKv
  ? new Redis({
      url: (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL)!,
      token: (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN)!,
    })
  : null;

function upstreamUrl(path: string): string {
  return new URL(path, DTSPACE_BASE).toString();
}

async function upstream(path: string, jwt: string, init: RequestInit = {}): Promise<Response> {
  return fetch(upstreamUrl(path), {
    ...init,
    headers: {
      'User-Agent': DEFAULT_UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      Cookie: `${UPSTREAM_COOKIE_NAME}=${jwt}`,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
}

// ---- JWT decode (no verification — we only read claims of our own cookie's upstream JWT) ----
export interface CustomerClaims {
  idCstm: number | null;
  idLine: number | null;
  cdCpny: string | null;
  cdSite: string | null;
  nmCstm: string | null;
  noMphn: string | null;
  dong: string | null;
  ho: string | null;
}

export function decodeCustomerClaims(jwt: string): CustomerClaims {
  const empty: CustomerClaims = {
    idCstm: null,
    idLine: null,
    cdCpny: null,
    cdSite: null,
    nmCstm: null,
    noMphn: null,
    dong: null,
    ho: null,
  };
  try {
    const part = jwt.split('.')[1];
    if (!part) return empty;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json) as { loginDataKey?: Record<string, unknown> };
    const d = payload.loginDataKey ?? {};
    return {
      idCstm: typeof d.idCstm === 'number' ? d.idCstm : d.idCstm ? Number(d.idCstm) : null,
      idLine: typeof d.idLine === 'number' ? d.idLine : d.idLine ? Number(d.idLine) : null,
      cdCpny: (d.cdCpny as string) ?? null,
      cdSite: (d.cdSite as string) ?? null,
      nmCstm: (d.nmCstm as string) ?? null,
      noMphn: (d.noMphn as string) ?? null,
      dong: d.dong != null ? String(d.dong) : null,
      ho: d.ho != null ? String(d.ho) : null,
    };
  } catch {
    return empty;
  }
}

// ---- codemap ----
interface RawCode {
  idCode: number;
  nmCode: string;
  grCode: string;
}

async function fetchCodemap(jwt: string, left: string, right: string): Promise<RawCode[]> {
  const res = await upstream(
    `/v1/customer/codemap-${left}-${right}?cdSite=${encodeURIComponent(SITE_CODE)}`,
    jwt,
  );
  if (!res.ok) throw new LoginError(`코드 정보를 불러오지 못했습니다 (${left}-${right}).`, 502);
  const arr = (await res.json()) as RawCode[];
  return Array.isArray(arr) ? arr : [];
}

function tokens(nmCode: string): string[] {
  return String(nmCode || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Convert a codemap into {code, name(=token1), parent(=token0)} options, de-duped by parent+name. */
function toOptions(raw: RawCode[]): CodeOption[] {
  const seen = new Set<string>();
  const out: CodeOption[] = [];
  for (const r of raw) {
    const t = tokens(r.nmCode);
    if (t.length < 2) continue;
    const parent = t[0];
    const name = t.slice(1).join(' ');
    const key = `${parent}::${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ code: r.idCode, name, parent });
  }
  return out;
}

// ---- tppg derivation (which floor-plan prefix this unit uses) ----
async function deriveTppgPrefix(
  jwt: string,
  dong: string,
  ho: string,
  roomRaw: RawCode[],
): Promise<{ prefix: string | null; existingCount: number }> {
  const cacheKey = `cantavil:tppg:${dong}:${ho}`;
  // KV cache (prefix only; count is best-effort and not cached)
  if (redis) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) return { prefix: cached, existingCount: 0 };
    } catch {}
  }
  // Derive from the unit's existing inspections: take any cdLoc, look it up in the room codemap.
  try {
    const res = await upstream('/v1/mobile/sync-data/customer/stream', jwt, {
      headers: { Accept: 'text/event-stream' },
    });
    if (res.ok) {
      const text = await res.text();
      const block = text.split('\n\n').find((b) => b.startsWith('event:done'));
      if (block) {
        const data = block.split('\ndata:')[1] ?? block.slice(block.indexOf('data:') + 5);
        const done = JSON.parse(data) as { ltDfct?: Array<{ cdLoc?: number }> };
        const list = done.ltDfct ?? [];
        for (const item of list) {
          const match = roomRaw.find((r) => r.idCode === item.cdLoc);
          if (match) {
            const prefix = tokens(match.nmCode)[0] ?? null;
            if (prefix && redis) {
              try {
                await redis.set(cacheKey, prefix);
              } catch {}
            }
            return { prefix, existingCount: list.length };
          }
        }
        return { prefix: null, existingCount: list.length };
      }
    }
  } catch {}
  return { prefix: null, existingCount: 0 };
}

// ---- AS warranty contractor map (공종 name -> 시공사 name) ----
async function fetchContractorMap(jwt: string): Promise<Record<string, string>> {
  try {
    const res = await upstream('/v1/customer/as-warranty-period', jwt);
    if (!res.ok) return {};
    const arr = (await res.json()) as Array<{ e?: string; nmCstCpny?: string }>;
    const map: Record<string, string> = {};
    for (const row of arr ?? []) {
      if (row.e && row.nmCstCpny) map[row.e] = row.nmCstCpny;
    }
    return map;
  } catch {
    return {};
  }
}

// ---- site config (voice / re-request) ----
async function fetchSiteFlags(jwt: string): Promise<{ voice: boolean; reReq: boolean }> {
  try {
    const res = await upstream('/v1/mobile/sync-data/customer/site', jwt);
    if (!res.ok) return { voice: false, reReq: false };
    const j = (await res.json()) as { ynUseVoice?: string; ynReRqst?: string };
    return { voice: j.ynUseVoice === 'Y', reReq: j.ynReRqst === 'Y' };
  } catch {
    return { voice: false, reReq: false };
  }
}

export interface BootstrapSessionInfo {
  dong: string;
  ho: string;
  displayDong: string;
  nmCstm: string;
  noMphn: string;
}

export async function buildBootstrap(
  jwt: string,
  info: BootstrapSessionInfo,
): Promise<InspectBootstrap> {
  const [bc, cd, df, fe, eh] = await Promise.all([
    fetchCodemap(jwt, 'B', 'C'),
    fetchCodemap(jwt, 'C', 'D'),
    fetchCodemap(jwt, 'D', 'F'),
    fetchCodemap(jwt, 'F', 'E'),
    fetchCodemap(jwt, 'E', 'H'),
  ]);
  const [{ prefix, existingCount }, contractorByWork, flags] = await Promise.all([
    deriveTppgPrefix(jwt, info.dong, info.ho, bc),
    fetchContractorMap(jwt),
    fetchSiteFlags(jwt),
  ]);

  // Level 1 (rooms): keep only the unit's floor-plan prefix when known; else all (deduped by name).
  const allRooms = toOptions(bc);
  let rooms: CodeOption[];
  if (prefix) {
    rooms = allRooms.filter((o) => o.parent === prefix);
  } else {
    const seen = new Set<string>();
    rooms = allRooms.filter((o) => (seen.has(o.name) ? false : (seen.add(o.name), true)));
  }

  return {
    cdSite: SITE_CODE,
    dong: info.dong,
    displayDong: info.displayDong,
    ho: info.ho,
    nmCstm: info.nmCstm,
    noMphn: info.noMphn,
    tppgPrefix: prefix,
    voiceEnabled: flags.voice,
    reRequestEnabled: flags.reReq,
    rooms,
    parts: toOptions(cd),
    details: toOptions(df),
    works: toOptions(fe),
    types: toOptions(eh),
    contractorByWork,
    existingCount,
  };
}

// ---- AI verification ----
export async function aiVerify(jwt: string, input: AiVerifyInput): Promise<AiVerifyResult> {
  const res = await upstream('/v1/customer/llm/dfct/mapping', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new LoginError('AI 분석에 실패했습니다.', 502);
  const j = (await res.json()) as Record<string, unknown>;
  return {
    resultOfLlm: (j.resultOfLlm as string) ?? null,
    typeUnique: j.typeUnique === true,
    locRgonUnique: j.locRgonUnique === true,
    dfctCausUnique: j.dfctCausUnique === true,
    nmLoc: (j.nmLoc as string) ?? null,
    nmRgon: (j.nmRgon as string) ?? null,
    nmDfctCaus: (j.nmDfctCaus as string) ?? null,
    nmDfctCl: (j.nmDfctCl as string) ?? null,
    nmDfctType: (j.nmDfctType as string) ?? null,
  };
}

// ---- voice transcription (passes through multipart form) ----
export async function transcribe(jwt: string, form: FormData): Promise<string> {
  const res = await upstream('/v1/customer/voice/transcribe', jwt, {
    method: 'POST',
    body: form as unknown as BodyInit,
  });
  if (!res.ok) throw new LoginError('음성 인식에 실패했습니다.', 502);
  const j = (await res.json().catch(() => ({}))) as { text?: string; transcription?: string };
  return j.text ?? j.transcription ?? '';
}

// ---- submit ----
function randomUuid(): string {
  // available in Node 18+ / edge
  return (globalThis.crypto as Crypto).randomUUID();
}

function todayYmd(): string {
  const d = new Date();
  return (
    d.getFullYear().toString() +
    `0${d.getMonth() + 1}`.slice(-2) +
    `0${d.getDate()}`.slice(-2)
  );
}

export async function submitInspection(
  jwt: string,
  input: InspectSubmitInput,
  session: BootstrapSessionInfo,
): Promise<{ ok: true; clientKey: string }> {
  const claims = decodeCustomerClaims(jwt);
  const clientKey = randomUuid();
  const dtRcpt = todayYmd();

  const record: Record<string, unknown> = {
    cdCpny: claims.cdCpny ?? 'DC',
    cdCstCpny: null,
    cdDfctCaus: input.cdDfctCaus,
    cdDfctCl: input.cdDfctCl,
    cdDfctType: input.cdDfctType,
    cdHndlStat: 'A',
    cdLoc: input.cdLoc,
    cdRcptMthd: 'MB',
    cdRcptPhs: null,
    cdRgon: input.cdRgon,
    cdSite: SITE_CODE,
    clientKey,
    count: null,
    dfctCnts: input.dfctCnts,
    dong: claims.dong ?? session.dong,
    dtCplt: null,
    dtCstmApmt: null,
    dtHndlPlan: null,
    dtRcpt,
    dtWrk: null,
    h: input.nmDfctType,
    ho: claims.ho ?? session.ho,
    idCstm: claims.idCstm,
    idDupOrglDfct: null,
    idRcptPrsn: null,
    image1: input.image1,
    image2: input.image2,
    mappingCode: null,
    nmApltPrsn: claims.nmCstm ?? session.nmCstm,
    nmCpltPrsn: null,
    nmCpny: null,
    nmCstCpny: input.nmCstCpny ?? null,
    nmDfctCaus: input.nmDfctCaus,
    nmDfctCl: input.nmDfctCl,
    nmHndlCpny: null,
    nmLoc: input.nmLoc,
    nmLocClsf: null,
    nmRcptPrsn: null,
    nmRgon: input.nmRgon,
    nmSite: SITE_NAME,
    noIdx: null,
    noMphn: claims.noMphn ?? session.noMphn,
    notmVrfChk: null,
    pagingData: null,
    pontHapyCall: null,
    resultOfLlm: input.resultOfLlm ?? 'F',
    ynDupRcpt: null,
    ynHapyCall: null,
    ynReRcpt: null,
  };

  // Fire-and-forget pre/draft record (analytics) — same as the original.
  upstream('/v1/customer/flaw-inspection/pre', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey,
      cdLoc: input.cdLoc,
      cdRgon: input.cdRgon,
      cdDfctCaus: input.cdDfctCaus,
      cdDfctCl: input.cdDfctCl,
      cdDfctType: input.cdDfctType,
      dfctCnts: input.dfctCnts,
    }),
  }).catch(() => {});

  const res = await upstream('/v1/customer/flaw-inspection', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (res.status === 401) throw new LoginError('세션이 만료되었습니다.', 401);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new LoginError('점검 등록에 실패했습니다.', 502, detail);
  }
  return { ok: true, clientKey };
}
