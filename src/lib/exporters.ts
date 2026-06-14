// Client-side, one-shot export/share helpers. No persistence, no upstream —
// everything is built from the flaw list already in memory. All field access
// respects the admin visibility flags passed in by the caller.
import { CATEGORY_LABEL, type FlawItem } from './types';
import { fmtDate, todayCompact } from './dates';

export interface ExportVisibility {
  nmCstCpny: boolean;
  nmWrkPrsn: boolean;
  dtWrk: boolean;
}

export interface ExportContext {
  displayDong: string;
  ho: string;
  nmCstm: string;
  nmSite: string;
  visibility: ExportVisibility;
}

export function exportFilename(prefix: string, ctx: ExportContext, ext: string): string {
  const unit = `${ctx.displayDong}동${ctx.ho}호`.replace(/[^0-9가-힣]/g, '');
  return `${prefix}_${unit}_${todayCompact()}.${ext}`;
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** UTF-8 CSV (with BOM) of the given items, visibility-aware. */
export function toCsv(items: FlawItem[], ctx: ExportContext): string {
  const cols: { head: string; get: (it: FlawItem) => string }[] = [
    { head: '번호', get: (it) => String(it.noIdx) },
    { head: '상태', get: (it) => CATEGORY_LABEL[it.category] },
    { head: '실', get: (it) => it.nmLoc ?? '' },
    { head: '부위', get: (it) => it.nmRgon ?? '' },
    { head: '공종', get: (it) => it.nmDfctCl ?? '' },
    { head: '원인', get: (it) => it.nmDfctCaus ?? '' },
    { head: '유형', get: (it) => it.nmDfctType ?? '' },
    { head: '내용', get: (it) => it.dfctCnts ?? '' },
    { head: '접수일', get: (it) => fmtDate(it.dtRcpt) ?? '' },
    { head: '완료일', get: (it) => fmtDate(it.dtCplt) ?? '' },
  ];
  if (ctx.visibility.dtWrk) cols.push({ head: '작업일', get: (it) => fmtDate(it.dtWrk) ?? '' });
  if (ctx.visibility.nmCstCpny) cols.push({ head: '시공사', get: (it) => it.nmCstCpny ?? '' });
  if (ctx.visibility.nmWrkPrsn) cols.push({ head: '작업자', get: (it) => it.nmWrkPrsn ?? '' });

  const rows = [cols.map((c) => c.head)];
  for (const it of items) rows.push(cols.map((c) => csvCell(c.get(it))));
  return '﻿' + rows.map((r) => r.join(',')).join('\r\n');
}

/** One defect as a shareable plain-text block (clipboard / messenger). */
export function flawSummaryText(item: FlawItem, ctx: ExportContext): string {
  const lines: string[] = [];
  lines.push(`[${ctx.displayDong}동 ${ctx.ho}호 하자 #${item.noIdx}]`);
  lines.push(`상태: ${CATEGORY_LABEL[item.category]}`);
  const loc = [item.nmLoc, item.nmRgon].filter(Boolean).join(' · ');
  if (loc) lines.push(`위치: ${loc}`);
  const cls = [item.nmDfctCl, item.nmDfctCaus].filter(Boolean).join(' / ');
  if (cls) lines.push(`분류: ${cls}`);
  if (item.dfctCnts) lines.push(`내용: ${item.dfctCnts}`);
  if (fmtDate(item.dtRcpt)) lines.push(`접수: ${fmtDate(item.dtRcpt)}`);
  if (ctx.visibility.dtWrk && fmtDate(item.dtWrk)) lines.push(`작업: ${fmtDate(item.dtWrk)}`);
  if (fmtDate(item.dtCplt)) lines.push(`완료: ${fmtDate(item.dtCplt)}`);
  if (ctx.visibility.nmCstCpny && item.nmCstCpny) lines.push(`시공사: ${item.nmCstCpny}`);
  return lines.join('\n');
}

/** A formatted follow-up request to the 관리사무소 for the chosen items. */
export function officeRequestText(items: FlawItem[], ctx: ExportContext): string {
  const today = fmtDate(todayCompact());
  const head = [
    `■ ${ctx.nmSite}`,
    `■ ${ctx.displayDong}동 ${ctx.ho}호 · ${ctx.nmCstm}`,
    `■ 작성일: ${today}`,
    '',
    '아래 하자 항목의 처리 현황 확인 및 조속한 보수를 요청드립니다.',
    '',
  ];
  const body = items.map((it, i) => {
    const loc = [it.nmLoc, it.nmRgon].filter(Boolean).join(' ');
    const cls = [it.nmDfctCl, it.nmDfctCaus].filter(Boolean).join('/');
    const parts = [
      `${i + 1}. [#${it.noIdx}] ${CATEGORY_LABEL[it.category]}`,
      loc && `   - 위치: ${loc}`,
      cls && `   - 분류: ${cls}`,
      it.dfctCnts && `   - 내용: ${it.dfctCnts}`,
      fmtDate(it.dtRcpt) && `   - 접수일: ${fmtDate(it.dtRcpt)}`,
    ].filter(Boolean);
    return parts.join('\n');
  });
  return [...head, body.join('\n\n')].join('\n');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

/** Copy to clipboard with a legacy fallback. Resolves to success boolean. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
