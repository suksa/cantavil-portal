// Print-to-PDF via a new window. Uses the browser's native print → "Save as
// PDF", which renders Korean with system fonts (no embedded-font headaches that
// a JS PDF lib would bring). Visibility-aware. Pure client-side.
import { CATEGORY_LABEL, type FlawItem } from './types';
import { fmtDate } from './dates';
import type { ExportContext } from './exporters';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SHELL = (title: string, body: string) => `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif; color: #111; margin: 28px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; }
  .status { font-weight: 600; }
  .meta { font-size: 12px; line-height: 1.7; }
  .meta b { display: inline-block; width: 64px; color: #555; font-weight: 600; }
  .photos { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  .photos img { max-width: 320px; max-height: 320px; border: 1px solid #ddd; }
  footer { margin-top: 20px; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { margin: 12mm; } }
</style></head><body>${body}
<footer>Cantavil 입주자 점검 포털 · 비공식 자료 · 출력일 ${esc(fmtDate(new Date().toISOString().slice(0, 10).replace(/-/g, '')))}</footer>
<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`;

function openHtml(html: string) {
  const w = window.open('', '_blank');
  if (!w) {
    throw new Error('팝업이 차단되어 인쇄 창을 열 수 없습니다. 팝업을 허용해 주세요.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

const CAT_HEX: Record<string, string> = {
  received: '#f59e0b',
  workDone: '#0ea5e9',
  reAccepted: '#d946ef',
  finalDone: '#10b981',
};

/**
 * A4 inspection report — 6 items per page (so 130 defects → ~22 pages). Each
 * item shows its metadata plus the 원거리/근거리 photos. Visibility-aware. The
 * thead repeats on every printed page (column headers + title).
 */
export function printFlawList(items: FlawItem[], ctx: ExportContext): void {
  const today = fmtDate(new Date().toISOString().slice(0, 10).replace(/-/g, ''));

  const photo = (url: string | undefined, label: string) =>
    url
      ? `<div class="cell"><img referrerpolicy="no-referrer" src="${esc(url)}" alt=""><span class="cap">${label}</span></div>`
      : `<div class="cell empty"><span>사진 없음</span><span class="cap">${label}</span></div>`;

  const rows = items
    .map((it, i) => {
      const loc = [it.nmLoc, it.nmRgon].filter(Boolean).join(' · ') || '위치 미상';
      const meta = [
        it.nmDfctCl ? `<div><span class="k">공종</span> ${esc(it.nmDfctCl)}</div>` : '',
        it.dfctCnts ? `<div class="cnt"><span class="k">내용</span> ${esc(it.dfctCnts)}</div>` : '',
        ctx.visibility.nmCstCpny && it.nmCstCpny
          ? `<div><span class="k">시공사</span> ${esc(it.nmCstCpny)}</div>`
          : '',
        `<div class="dt">접수 ${esc(fmtDate(it.dtRcpt) ?? '-')}${
          ctx.visibility.dtWrk && it.dtWrk ? ` · 작업 ${esc(fmtDate(it.dtWrk))}` : ''
        }${it.dtCplt ? ` · 완료 ${esc(fmtDate(it.dtCplt))}` : ''}</div>`,
      ]
        .filter(Boolean)
        .join('');
      return `<tr class="item">
        <td class="meta">
          <div class="hd">
            <span class="no">${i + 1}</span>
            <span class="st" style="background:${CAT_HEX[it.category] ?? '#888'}">${esc(CATEGORY_LABEL[it.category])}</span>
            <span class="id">#${it.noIdx}</span>
          </div>
          <div class="loc">${esc(loc)}</div>
          ${meta}
        </td>
        <td class="ph">${photo(it.images[0], '원거리')}</td>
        <td class="ph">${photo(it.images[1], '근거리')}</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><title>${esc(ctx.displayDong)}동 ${esc(ctx.ho)}호 하자 점검 내역</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif; color: #111; margin: 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  .title { font-size: 14px; font-weight: 700; padding-bottom: 1px; }
  .subt { font-size: 10px; color: #666; padding-bottom: 4px; }
  th.col { font-size: 9px; color: #555; background: #f3f3f3; border: 1px solid #ddd; padding: 3px; text-align: center; }
  tr.item { page-break-inside: avoid; height: 64mm; }
  tr.item:nth-child(4n) { page-break-after: always; }
  td { border: 1px solid #c9c9c9; padding: 5px 7px; vertical-align: top; }
  td.meta { font-size: 11px; line-height: 1.5; }
  td.ph { position: relative; height: 64mm; text-align: center; padding: 2px; }
  .cell { height: 100%; display: flex; align-items: center; justify-content: center; }
  .cell img { max-width: 100%; max-height: 60mm; object-fit: contain; }
  .cell.empty { color: #bbb; font-size: 10px; }
  .cap { position: absolute; left: 5px; bottom: 4px; background: rgba(0,0,0,.6); color: #fff; padding: 1px 6px; border-radius: 7px; font-size: 9px; }
  .hd { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
  .no { font-weight: 700; font-size: 12px; }
  .st { font-size: 9px; padding: 1px 6px; border-radius: 8px; color: #fff; }
  .id { margin-left: auto; color: #999; font-size: 9px; }
  .loc { font-weight: 600; font-size: 11px; margin-bottom: 2px; }
  .k { color: #888; font-size: 9px; }
  .cnt { margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
  .dt { color: #666; font-size: 9px; margin-top: 3px; }
  td.meta { overflow: hidden; }
</style></head><body>
<table>
  <colgroup><col style="width:46mm"><col><col></colgroup>
  <thead>
    <tr><td colspan="3" style="border:none;padding:0 0 2px">
      <div class="title">${esc(ctx.nmSite)} 하자 점검 내역</div>
      <div class="subt">${esc(ctx.displayDong)}동 ${esc(ctx.ho)}호 · ${esc(ctx.nmCstm)} · 총 ${items.length}건 · 출력 ${esc(today)}</div>
    </td></tr>
    <tr><th class="col">내용</th><th class="col">원거리</th><th class="col">근거리</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<script>
  var printed = false;
  function go(){ if (printed) return; printed = true; window.print(); }
  window.onload = function(){ setTimeout(go, 400); };
  setTimeout(go, 9000); // hard fallback if some photos stall
</script>
</body></html>`;
  openHtml(html);
}

export function printSingleFlaw(item: FlawItem, ctx: ExportContext, imageDataUrls: string[]): void {
  const rows: [string, string][] = [
    ['상태', CATEGORY_LABEL[item.category]],
    ['위치', [item.nmLoc, item.nmRgon].filter(Boolean).join(' · ')],
    ['분류', [item.nmDfctCl, item.nmDfctCaus].filter(Boolean).join(' / ')],
    ['유형', item.nmDfctType ?? ''],
    ['내용', item.dfctCnts ?? ''],
    ['접수일', fmtDate(item.dtRcpt) ?? ''],
  ];
  if (ctx.visibility.dtWrk && item.dtWrk) rows.push(['작업일', fmtDate(item.dtWrk) ?? '']);
  if (item.dtCplt) rows.push(['완료일', fmtDate(item.dtCplt) ?? '']);
  if (ctx.visibility.nmCstCpny && item.nmCstCpny) rows.push(['시공사', item.nmCstCpny]);
  if (item.customerMemo) rows.push(['입주자 메모', item.customerMemo]);
  if (item.workMemo) rows.push(['작업 메모', item.workMemo]);

  const meta = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v)}</div>`)
    .join('');
  const photos = imageDataUrls.length
    ? `<div class="photos">${imageDataUrls
        .map((u) => `<img src="${esc(u)}" referrerpolicy="no-referrer" alt="">`)
        .join('')}</div>`
    : '';
  const body = `<h1>하자 #${esc(item.noIdx)}</h1>
    <div class="sub">${esc(ctx.nmSite)} · ${esc(ctx.displayDong)}동 ${esc(ctx.ho)}호 · ${esc(ctx.nmCstm)}</div>
    <div class="meta">${meta}</div>${photos}`;
  openHtml(SHELL(`하자 #${item.noIdx}`, body));
}
