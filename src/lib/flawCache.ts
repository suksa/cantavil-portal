// Client-side module cache for the flaw list. Persists across in-app (SPA)
// navigation — e.g. dashboard → /inspect → back — so we don't refetch the
// heavy stream when nothing has changed. Cleared after a new registration.
import type { AdminSettings } from './admin';
import type { FlawItem } from './types';

export interface FlawCache {
  items: FlawItem[];
  settings: AdminSettings;
  activeTab: string;
  fetchedAt: number;
}

let cache: FlawCache | null = null;

/** Reuse cached data without revalidating within this window. */
export const FLAW_CACHE_FRESH_MS = 60_000;

export function getFlawCache(): FlawCache | null {
  return cache;
}

export function setFlawCache(next: FlawCache): void {
  cache = next;
}

export function patchFlawCache(patch: Partial<FlawCache>): void {
  if (cache) cache = { ...cache, ...patch };
}

export function clearFlawCache(): void {
  cache = null;
}
