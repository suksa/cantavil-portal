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
  visibility: Record<VisibilityField, Visibility>;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  siteLocked: false,
  visibility: {
    nmCstCpny: 'admin',
    nmWrkPrsn: 'admin',
    dtWrk: 'admin',
  },
};

// Process-wide store. Survives between requests on the same serverless instance.
// On Vercel, separate cold instances each start at DEFAULT_SETTINGS — if you need
// persistence across regions/deployments, wire this through Vercel KV / a DB.
const globalStore = globalThis as unknown as { __cantavilSettings?: AdminSettings };
if (!globalStore.__cantavilSettings) {
  globalStore.__cantavilSettings = clone(DEFAULT_SETTINGS);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function getSettings(): AdminSettings {
  return clone(globalStore.__cantavilSettings!);
}

export function updateSettings(patch: Partial<AdminSettings>): AdminSettings {
  const cur = globalStore.__cantavilSettings!;
  const next: AdminSettings = {
    siteLocked: typeof patch.siteLocked === 'boolean' ? patch.siteLocked : cur.siteLocked,
    visibility: {
      nmCstCpny: pickVisibility(patch.visibility?.nmCstCpny, cur.visibility.nmCstCpny),
      nmWrkPrsn: pickVisibility(patch.visibility?.nmWrkPrsn, cur.visibility.nmWrkPrsn),
      dtWrk: pickVisibility(patch.visibility?.dtWrk, cur.visibility.dtWrk),
    },
  };
  globalStore.__cantavilSettings = next;
  return clone(next);
}

function pickVisibility(input: Visibility | undefined, fallback: Visibility): Visibility {
  if (input === 'hidden' || input === 'admin' || input === 'all') return input;
  return fallback;
}

export function fieldVisibleFor(
  v: Visibility,
  isAdmin: boolean,
): boolean {
  if (v === 'all') return true;
  if (v === 'admin') return isAdmin;
  return false;
}

export function publicVisibility(s: AdminSessionState): {
  nmCstCpny: boolean;
  nmWrkPrsn: boolean;
  dtWrk: boolean;
} {
  const settings = getSettings();
  return {
    nmCstCpny: fieldVisibleFor(settings.visibility.nmCstCpny, s.isAdmin),
    nmWrkPrsn: fieldVisibleFor(settings.visibility.nmWrkPrsn, s.isAdmin),
    dtWrk: fieldVisibleFor(settings.visibility.dtWrk, s.isAdmin),
  };
}

interface AdminSessionState {
  isAdmin: boolean;
}

export function sessionIsAdmin(info: SessionInfo | null | undefined): boolean {
  if (!info) return false;
  return Boolean(info.isAdmin) || isAdminSession(info);
}
