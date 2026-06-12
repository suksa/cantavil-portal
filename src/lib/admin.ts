import { Redis } from '@upstash/redis';
import type { SessionInfo } from './types';

// Resident allowed to view and change admin settings.
export const ADMIN_DONG = '93078';
export const ADMIN_HO = '0502';

export function isAdminSession(info: { dong: string; ho: string }): boolean {
  return info.dong === ADMIN_DONG && info.ho === ADMIN_HO;
}

export type Visibility = 'hidden' | 'admin' | 'all';

export const VISIBILITY_FIELDS = ['nmCstCpny', 'nmWrkPrsn', 'dtWrk'] as const;
export type VisibilityField = (typeof VISIBILITY_FIELDS)[number];

export const FIELD_LABEL: Record<VisibilityField, string> = {
  nmCstCpny: '시공사',
  nmWrkPrsn: '작업자',
  dtWrk: '작업일',
};

export interface AdminSettings {
  siteLocked: boolean;
  // Show the /closed shutdown page to everyone. /admin and the auth APIs
  // stay reachable so an admin can always sign in and flip this back.
  serviceClosed: boolean;
  // When serviceClosed is on, let an admin session keep using every page
  // as if the site were live. With this off, admins also get pushed to the
  // closed page and can only work from /admin itself.
  adminBypassClosed: boolean;
  visibility: Record<VisibilityField, Visibility>;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  siteLocked: false,
  serviceClosed: false,
  adminBypassClosed: true,
  visibility: {
    nmCstCpny: 'admin',
    nmWrkPrsn: 'admin',
    dtWrk: 'admin',
  },
};

const KV_KEY = 'cantavil:settings';
const CACHE_TTL_MS = 5_000;

// Upstash if env is wired up, otherwise an in-memory store so local dev and
// preview deployments without KV still work.
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
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function mergeSettings(cur: AdminSettings, patch: Partial<AdminSettings>): AdminSettings {
  return {
    siteLocked: typeof patch.siteLocked === 'boolean' ? patch.siteLocked : cur.siteLocked,
    serviceClosed:
      typeof patch.serviceClosed === 'boolean' ? patch.serviceClosed : cur.serviceClosed,
    adminBypassClosed:
      typeof patch.adminBypassClosed === 'boolean'
        ? patch.adminBypassClosed
        : cur.adminBypassClosed,
    visibility: {
      nmCstCpny: pickVisibility(patch.visibility?.nmCstCpny, cur.visibility.nmCstCpny),
      nmWrkPrsn: pickVisibility(patch.visibility?.nmWrkPrsn, cur.visibility.nmWrkPrsn),
      dtWrk: pickVisibility(patch.visibility?.dtWrk, cur.visibility.dtWrk),
    },
  };
}

function pickVisibility(input: Visibility | undefined, fallback: Visibility): Visibility {
  if (input === 'hidden' || input === 'admin' || input === 'all') return input;
  return fallback;
}

function normalize(raw: unknown): AdminSettings {
  if (!raw || typeof raw !== 'object') return clone(DEFAULT_SETTINGS);
  // Upstash returns parsed JSON already; some adapters may hand back a string.
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

export async function updateSettings(patch: Partial<AdminSettings>): Promise<AdminSettings> {
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

export function isKvEnabled(): boolean {
  return hasKv;
}
