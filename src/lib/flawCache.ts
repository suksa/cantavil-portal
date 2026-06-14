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

/**
 * Session-internal change detection (for the "변경됨" pulse). Compares a prior
 * snapshot to the freshly fetched list and returns the set of noIdx whose
 * lifecycle changed (or that newly appeared). Empty on first load — no prior.
 */
export function computeChangedIds(
  prev: FlawItem[] | null | undefined,
  next: FlawItem[],
): Set<number> {
  const out = new Set<number>();
  if (!prev || prev.length === 0) return out;
  const prevMap = new Map(prev.map((i) => [i.noIdx, i]));
  for (const it of next) {
    const p = prevMap.get(it.noIdx);
    if (!p) {
      out.add(it.noIdx);
      continue;
    }
    if (
      p.category !== it.category ||
      p.cdHndlStat !== it.cdHndlStat ||
      p.dtCplt !== it.dtCplt ||
      p.dtWrk !== it.dtWrk
    ) {
      out.add(it.noIdx);
    }
  }
  return out;
}
