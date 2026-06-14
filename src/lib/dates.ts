// Shared date helpers. Upstream dates arrive as YYYYMMDD; admin-entered dates
// (입주일/마감/보증) are YYYY-MM-DD. These are used only in client components,
// so `new Date()` ("today") is consistent for the viewer.

export function parseYmd(s: string | null | undefined): Date | null {
  if (!s) return null;
  const t = String(s).trim();
  let y: number, m: number, d: number;
  if (/^\d{8}$/.test(t)) {
    y = +t.slice(0, 4);
    m = +t.slice(4, 6);
    d = +t.slice(6, 8);
  } else {
    const mm = /^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/.exec(t);
    if (!mm) return null;
    y = +mm[1];
    m = +mm[2];
    d = +mm[3];
  }
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function fmtDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const dt = parseYmd(s);
  if (!dt) return String(s);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}.${mm}.${dd}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole days elapsed since `s` until today (0 = today, positive = past). */
export function daysAgo(s: string | null | undefined): number | null {
  const dt = parseYmd(s);
  if (!dt) return null;
  const diff = startOfDay(new Date()) - startOfDay(dt);
  return Math.round(diff / 86_400_000);
}

/** Days until `s` from today (positive = future/remaining, negative = overdue). */
export function dDay(s: string | null | undefined): number | null {
  const dt = parseYmd(s);
  if (!dt) return null;
  const diff = startOfDay(dt) - startOfDay(new Date());
  return Math.round(diff / 86_400_000);
}

/** "오늘" · "어제" · "N일 전" for a YYYYMMDD/ISO date. */
export function relativeKo(s: string | null | undefined): string | null {
  const n = daysAgo(s);
  if (n == null) return null;
  if (n <= 0) return '오늘';
  if (n === 1) return '어제';
  return `${n}일 전`;
}

/** Add months to a YYYY-MM-DD/YYYYMMDD date, returning a Date (for warranty end). */
export function addMonths(s: string | null | undefined, months: number): Date | null {
  const dt = parseYmd(s);
  if (!dt) return null;
  const out = new Date(dt);
  out.setMonth(out.getMonth() + months);
  return out;
}

export function toYmdSlashless(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/** Today's date as YYYYMMDD — for export filenames. */
export function todayCompact(): string {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
