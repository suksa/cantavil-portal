import { Redis } from '@upstash/redis';
import type { SessionInfo } from './types';

// Resident allowed to view and change admin settings. Configurable via env
// (so ownership can move without a redeploy); the literal fallback stays valid
// forever so a misconfigured KV adminUnit can never lock the owner out.
export const ADMIN_DONG = process.env.CANTAVIL_ADMIN_DONG ?? '93078';
export const ADMIN_HO = process.env.CANTAVIL_ADMIN_HO ?? '0502';

export function isAdminSession(info: { dong: string; ho: string }): boolean {
  return info.dong === ADMIN_DONG && info.ho === ADMIN_HO;
}

export type Visibility = 'hidden' | 'admin' | 'all';

export const VISIBILITY_FIELDS = ['nmCstCpny', 'nmWrkPrsn', 'dtWrk', 'nmApltPrsn'] as const;
export type VisibilityField = (typeof VISIBILITY_FIELDS)[number];

export const FIELD_LABEL: Record<VisibilityField, string> = {
  nmCstCpny: '시공사',
  nmWrkPrsn: '작업자',
  dtWrk: '작업일',
  nmApltPrsn: '신청자',
};

export type NoticeLevel = 'info' | 'warn' | 'urgent';

export interface NoticeConfig {
  enabled: boolean;
  message: string;
  level: NoticeLevel;
}

export interface ScheduleConfig {
  /** 입주(이사) 시작일 — YYYY-MM-DD. */
  moveInDate: string;
  /** 사전점검 하자 접수 마감일 — YYYY-MM-DD. */
  submitDeadline: string;
}

export interface WarrantyConfig {
  /** 하자보수 보증 시작일 (보통 입주일) — YYYY-MM-DD. */
  startDate: string;
  /** 보증기간(개월). 0 = 미설정. */
  months: number;
}

export interface AdminUnitConfig {
  /** 추가 관리자 호실. 비어 있으면 env/기본 관리자만 사용. */
  dong: string;
  ho: string;
}

export interface AdminSettings {
  siteLocked: boolean;
  serviceClosed: boolean;
  adminBypassClosed: boolean;
  visibility: Record<VisibilityField, Visibility>;
  notice: NoticeConfig;
  schedule: ScheduleConfig;
  warranty: WarrantyConfig;
  adminUnit: AdminUnitConfig;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  siteLocked: false,
  serviceClosed: false,
  adminBypassClosed: true,
  visibility: {
    nmCstCpny: 'admin',
    nmWrkPrsn: 'admin',
    dtWrk: 'admin',
    nmApltPrsn: 'hidden',
  },
  notice: { enabled: false, message: '', level: 'info' },
  schedule: { moveInDate: '', submitDeadline: '' },
  warranty: { startDate: '', months: 0 },
  adminUnit: { dong: '', ho: '' },
};

const KV_KEY = 'cantavil:settings';
const AUDIT_KEY = 'cantavil:audit';
const AUDIT_MAX = 100;
const CACHE_TTL_MS = 5_000;

const hasKv =
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasKv
  ? new Redis({
      url: (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL)!,
      token: (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN)!,
    })
  : null;

interface CacheEntry {
  value: AdminSettings;
  expires: number;
}

const memCache = globalThis as unknown as {
  __cantavilCache?: CacheEntry;
  __cantavilFallback?: AdminSettings;
  __cantavilAudit?: AuditEntry[];
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function pickVisibility(input: Visibility | undefined, fallback: Visibility): Visibility {
  if (input === 'hidden' || input === 'admin' || input === 'all') return input;
  return fallback;
}

function pickStr(input: unknown, fallback: string): string {
  return typeof input === 'string' ? input : fallback;
}

function pickBool(input: unknown, fallback: boolean): boolean {
  return typeof input === 'boolean' ? input : fallback;
}

function mergeSettings(cur: AdminSettings, patch: Partial<AdminSettings>): AdminSettings {
  const lvl = patch.notice?.level;
  return {
    siteLocked: pickBool(patch.siteLocked, cur.siteLocked),
    serviceClosed: pickBool(patch.serviceClosed, cur.serviceClosed),
    adminBypassClosed: pickBool(patch.adminBypassClosed, cur.adminBypassClosed),
    visibility: {
      nmCstCpny: pickVisibility(patch.visibility?.nmCstCpny, cur.visibility.nmCstCpny),
      nmWrkPrsn: pickVisibility(patch.visibility?.nmWrkPrsn, cur.visibility.nmWrkPrsn),
      dtWrk: pickVisibility(patch.visibility?.dtWrk, cur.visibility.dtWrk),
      nmApltPrsn: pickVisibility(patch.visibility?.nmApltPrsn, cur.visibility.nmApltPrsn),
    },
    notice: {
      enabled: pickBool(patch.notice?.enabled, cur.notice.enabled),
      message: pickStr(patch.notice?.message, cur.notice.message),
      level:
        lvl === 'info' || lvl === 'warn' || lvl === 'urgent' ? lvl : cur.notice.level,
    },
    schedule: {
      moveInDate: pickStr(patch.schedule?.moveInDate, cur.schedule.moveInDate),
      submitDeadline: pickStr(patch.schedule?.submitDeadline, cur.schedule.submitDeadline),
    },
    warranty: {
      startDate: pickStr(patch.warranty?.startDate, cur.warranty.startDate),
      months:
        typeof patch.warranty?.months === 'number' && patch.warranty.months >= 0
          ? Math.floor(patch.warranty.months)
          : cur.warranty.months,
    },
    adminUnit: {
      dong: pickStr(patch.adminUnit?.dong, cur.adminUnit.dong),
      ho: pickStr(patch.adminUnit?.ho, cur.adminUnit.ho),
    },
  };
}

function normalize(raw: unknown): AdminSettings {
  if (!raw || typeof raw !== 'object') return clone(DEFAULT_SETTINGS);
  const obj = typeof raw === 'string' ? safeParse(raw) : (raw as Partial<AdminSettings>);
  return mergeSettings(DEFAULT_SETTINGS, obj ?? {});
}

function safeParse(s: string): Partial<AdminSettings> | null {
  try {
    return JSON.parse(s) as Partial<AdminSettings>;
  } catch {
    return null;
  }
}

export async function getSettings(): Promise<AdminSettings> {
  const now = Date.now();
  const cached = memCache.__cantavilCache;
  if (cached && cached.expires > now) return clone(cached.value);

  let value: AdminSettings;
  if (redis) {
    try {
      const raw = await redis.get<unknown>(KV_KEY);
      value = raw == null ? clone(DEFAULT_SETTINGS) : normalize(raw);
    } catch (e) {
      console.warn('[admin] KV read failed, using cache/fallback:', (e as Error).message);
      value = memCache.__cantavilFallback ?? clone(DEFAULT_SETTINGS);
    }
  } else {
    value = memCache.__cantavilFallback ?? clone(DEFAULT_SETTINGS);
  }

  memCache.__cantavilCache = { value, expires: now + CACHE_TTL_MS };
  memCache.__cantavilFallback = value;
  return clone(value);
}

export async function updateSettings(
  patch: Partial<AdminSettings>,
  actor?: string,
): Promise<AdminSettings> {
  const cur = await getSettings();
  const next = mergeSettings(cur, patch);
  if (redis) {
    try {
      await redis.set(KV_KEY, next);
    } catch (e) {
      console.warn('[admin] KV write failed, holding in memory only:', (e as Error).message);
    }
  }
  memCache.__cantavilCache = { value: next, expires: Date.now() + CACHE_TTL_MS };
  memCache.__cantavilFallback = next;

  if (actor) {
    const changes = diffSettings(cur, next);
    if (changes.length) {
      await appendAudit({ at: Date.now(), actor, changes }).catch(() => {});
    }
  }
  return clone(next);
}

export function fieldVisibleFor(v: Visibility, isAdmin: boolean): boolean {
  if (v === 'all') return true;
  if (v === 'admin') return isAdmin;
  return false;
}

export function sessionIsAdmin(info: SessionInfo | null | undefined): boolean {
  if (!info) return false;
  return Boolean(info.isAdmin) || isAdminSession(info);
}

/** Async admin check that also honors the KV-configured secondary admin unit. */
export async function resolveIsAdmin(dong: string, ho: string): Promise<boolean> {
  if (isAdminSession({ dong, ho })) return true;
  try {
    const s = await getSettings();
    const u = s.adminUnit;
    return Boolean(u.dong && u.ho && u.dong === dong && u.ho === ho);
  } catch {
    return false;
  }
}

export function isKvEnabled(): boolean {
  return hasKv;
}

// ----- Audit log -----

export interface AuditChange {
  field: string;
  from: string;
  to: string;
}

export interface AuditEntry {
  at: number;
  actor: string;
  changes: AuditChange[];
}

const VIS_LABEL: Record<Visibility, string> = { hidden: '완전숨김', admin: '관리자만', all: '모두공개' };

function diffSettings(a: AdminSettings, b: AdminSettings): AuditChange[] {
  const out: AuditChange[] = [];
  const onoff = (v: boolean) => (v ? '켜짐' : '꺼짐');
  if (a.siteLocked !== b.siteLocked) out.push({ field: '서비스 차단', from: onoff(a.siteLocked), to: onoff(b.siteLocked) });
  if (a.serviceClosed !== b.serviceClosed) out.push({ field: '서비스 종료', from: onoff(a.serviceClosed), to: onoff(b.serviceClosed) });
  if (a.adminBypassClosed !== b.adminBypassClosed)
    out.push({ field: '관리자 우회', from: onoff(a.adminBypassClosed), to: onoff(b.adminBypassClosed) });
  for (const f of VISIBILITY_FIELDS) {
    if (a.visibility[f] !== b.visibility[f])
      out.push({ field: `표시정책 · ${FIELD_LABEL[f]}`, from: VIS_LABEL[a.visibility[f]], to: VIS_LABEL[b.visibility[f]] });
  }
  if (a.notice.enabled !== b.notice.enabled) out.push({ field: '공지 표시', from: onoff(a.notice.enabled), to: onoff(b.notice.enabled) });
  if (a.notice.message !== b.notice.message) out.push({ field: '공지 내용', from: a.notice.message || '(없음)', to: b.notice.message || '(없음)' });
  if (a.notice.level !== b.notice.level) out.push({ field: '공지 단계', from: a.notice.level, to: b.notice.level });
  if (a.schedule.moveInDate !== b.schedule.moveInDate) out.push({ field: '입주일', from: a.schedule.moveInDate || '(없음)', to: b.schedule.moveInDate || '(없음)' });
  if (a.schedule.submitDeadline !== b.schedule.submitDeadline)
    out.push({ field: '접수 마감일', from: a.schedule.submitDeadline || '(없음)', to: b.schedule.submitDeadline || '(없음)' });
  if (a.warranty.startDate !== b.warranty.startDate) out.push({ field: '보증 시작일', from: a.warranty.startDate || '(없음)', to: b.warranty.startDate || '(없음)' });
  if (a.warranty.months !== b.warranty.months) out.push({ field: '보증기간(개월)', from: String(a.warranty.months), to: String(b.warranty.months) });
  if (a.adminUnit.dong !== b.adminUnit.dong || a.adminUnit.ho !== b.adminUnit.ho)
    out.push({
      field: '추가 관리자 호실',
      from: a.adminUnit.dong ? `${a.adminUnit.dong}/${a.adminUnit.ho}` : '(없음)',
      to: b.adminUnit.dong ? `${b.adminUnit.dong}/${b.adminUnit.ho}` : '(없음)',
    });
  return out;
}

async function appendAudit(entry: AuditEntry): Promise<void> {
  const cur = await getAuditLog();
  const next = [entry, ...cur].slice(0, AUDIT_MAX);
  if (redis) {
    try {
      await redis.set(AUDIT_KEY, next);
    } catch (e) {
      console.warn('[admin] audit write failed:', (e as Error).message);
    }
  }
  memCache.__cantavilAudit = next;
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  if (redis) {
    try {
      const raw = await redis.get<AuditEntry[]>(AUDIT_KEY);
      if (Array.isArray(raw)) return raw;
    } catch (e) {
      console.warn('[admin] audit read failed:', (e as Error).message);
    }
  }
  return memCache.__cantavilAudit ?? [];
}
