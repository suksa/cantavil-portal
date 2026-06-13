// Client-side cache for the inspect bootstrap (room/part/… code lists). The
// data is stable per unit, so there's no reason to show a loading skeleton
// every time the user opens 점검 등록. We keep it in a module variable (instant
// across SPA navigation) and mirror it to sessionStorage (survives reload).
import type { InspectBootstrap } from './types';

interface Entry {
  unit: string;
  data: InspectBootstrap;
  fetchedAt: number;
}

const SS_KEY = 'cantavil_bootstrap';
/** Revalidate quietly past this age; still shown instantly meanwhile. */
export const BOOTSTRAP_FRESH_MS = 10 * 60_000;

let mem: Entry | null = null;

/**
 * Module-memory only (no sessionStorage). Safe for a useState lazy initializer:
 * it's null during SSR and on a fresh page load, so hydration never mismatches,
 * yet it's populated after an in-app prefetch or a prior visit (SPA nav).
 */
export function peekBootstrap(unit: string): InspectBootstrap | null {
  return mem && mem.unit === unit ? mem.data : null;
}

/** mem → sessionStorage fallback. Use inside effects (post-hydration). */
export function readBootstrap(unit: string): { data: InspectBootstrap; fresh: boolean } | null {
  if (!mem || mem.unit !== unit) {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Entry;
        if (parsed?.unit === unit && parsed.data) mem = parsed;
      }
    } catch {
      /* ignore */
    }
  }
  if (!mem || mem.unit !== unit) return null;
  return { data: mem.data, fresh: Date.now() - mem.fetchedAt < BOOTSTRAP_FRESH_MS };
}

export function writeBootstrap(unit: string, data: InspectBootstrap): void {
  mem = { unit, data, fetchedAt: Date.now() };
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(mem));
  } catch {
    /* ignore */
  }
}

export function bootstrapUnitKey(dong: string, ho: string): string {
  return `${dong}:${ho}`;
}
