// Per-flaw lifecycle stages (for the timeline modal) + a whole-list Gantt SVG
// export. All derived from the FlawItem data already in memory.
import { CATEGORY_LABEL, CATEGORY_ORDER, type FlawCategory, type FlawItem } from './types';
import { fmtDate, parseYmd } from './dates';
import type { ExportContext } from './exporters';

export interface Stage {
  key: FlawCategory;
  label: string;
  date: string | null;
  done: boolean;
  current: boolean;
}

export const CAT_HEX: Record<FlawCategory, string> = {
  received: '#f59e0b',
  workDone: '#38bdf8',
  reAccepted: '#e879f9',
  finalDone: '#34d399',
};

export function flawStages(item: FlawItem): Stage[] {
  const curIdx = CATEGORY_ORDER.indexOf(item.category);
  const dateFor: Record<FlawCategory, string | null> = {
    received: item.dtRcpt,
    workDone: item.dtWrk,
    reAccepted: item.ynReRcpt === 'Y' ? item.dtRcpt : null,
    finalDone: item.dtCplt,
  };
  return CATEGORY_ORDER.map((key, i) => ({
    key,
    label: CATEGORY_LABEL[key],
    date: dateFor[key],
    done: i < curIdx || (i === curIdx && curIdx === CATEGORY_ORDER.length - 1),
    current: i === curIdx,
  }));
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** A simple Gantt of every item's 접수→완료 span, colored by status. */
export function buildGanttSvg(items: FlawItem[], ctx: ExportContext): string {
  const rows = items.filter((it) => it.dtRcpt);
  const today = new Date();
  const dates: number[] = [];
  for (const it of rows) {
    const s = parseYmd(it.dtRcpt);
    if (s) dates.push(s.getTime());
    const e = parseYmd(it.dtCplt);
    if (e) dates.push(e.getTime());
  }
  dates.push(today.getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const span = Math.max(1, max - min);

  const rowH = 26;
  const padTop = 70;
  const padLeft = 220;
  const W = 1000;
  const chartW = W - padLeft - 40;
  const H = padTop + rows.length * rowH + 40;
  const x = (t: number) => padLeft + ((t - min) / span) * chartW;

  const bars = rows
    .map((it, i) => {
      const y = padTop + i * rowH;
      const s = parseYmd(it.dtRcpt)!.getTime();
      const e = (parseYmd(it.dtCplt) ?? today).getTime();
      const x1 = x(s);
      const x2 = Math.max(x1 + 3, x(e));
      const label = esc(`#${it.noIdx} ${[it.nmLoc, it.nmRgon].filter(Boolean).join(' ')}`.slice(0, 22));
      return `<text x="12" y="${y + 14}" font-size="12" fill="#cbd5e1">${label}</text>
        <rect x="${x1}" y="${y + 4}" width="${x2 - x1}" height="14" rx="4" fill="${CAT_HEX[it.category]}" opacity="0.85"/>`;
    })
    .join('\n');

  const axis = `<line x1="${padLeft}" y1="${padTop - 8}" x2="${padLeft}" y2="${H - 30}" stroke="#33343a"/>
    <text x="${padLeft}" y="${padTop - 18}" font-size="12" fill="#9ca3af">${esc(fmtDate(items.find((i) => i.dtRcpt)?.dtRcpt))}</text>
    <text x="${W - 40}" y="${padTop - 18}" font-size="12" fill="#9ca3af" text-anchor="end">오늘</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0c0c11"/>
    <text x="20" y="32" font-size="18" font-weight="700" fill="#f6f6f7">${esc(ctx.displayDong)}동 ${esc(ctx.ho)}호 하자 처리 타임라인</text>
    <text x="20" y="52" font-size="12" fill="#9ca3af">${esc(ctx.nmSite)} · 총 ${rows.length}건</text>
    ${axis}
    ${bars}
  </svg>`;
}
