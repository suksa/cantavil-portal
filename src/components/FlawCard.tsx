'use client';

import { useState } from 'react';
import { CalendarDays, Hammer, Image as ImageIcon, MapPin, MessageSquare, User2 } from 'lucide-react';
import type { FlawItem } from '@/lib/types';
import Lightbox from './Lightbox';

interface Props {
  item: FlawItem;
  displayDong: string;
  ho: string;
  visibility: {
    nmCstCpny: boolean;
    nmWrkPrsn: boolean;
    dtWrk: boolean;
  };
}

function fmtDate(s: string | null): string | null {
  if (!s) return null;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
  return s;
}

function statusPill(item: FlawItem) {
  switch (item.category) {
    case 'received':
      return <span className="pill bg-amber-500/10 text-amber-300 border border-amber-500/20">접수</span>;
    case 'workDone':
      return <span className="pill bg-sky-500/10 text-sky-300 border border-sky-500/20">작업완료</span>;
    case 'reAccepted':
      return <span className="pill bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">재접수</span>;
    case 'finalDone':
      return <span className="pill bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">최종완료</span>;
  }
}

export default function FlawCard({ item, displayDong, ho, visibility }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const dateLine = [
    fmtDate(item.dtRcpt) && `접수 ${fmtDate(item.dtRcpt)}`,
    visibility.dtWrk && fmtDate(item.dtWrk) && `작업 ${fmtDate(item.dtWrk)}`,
    fmtDate(item.dtCplt) && `완료 ${fmtDate(item.dtCplt)}`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const subtitle = [item.nmLoc, item.nmRgon].filter(Boolean).join(' · ');
  const classification = [item.nmDfctCl, item.nmDfctCaus].filter(Boolean).join(' / ');

  return (
    <article className="group relative rounded-xl border border-white/[0.06] bg-ink-850/60 hover:bg-ink-850/90 transition shadow-card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {statusPill(item)}
            {item.cdRcptPhs && (
              <span className="pill border border-white/[0.08] bg-white/[0.03] text-ink-300">
                {item.cdRcptPhs}
              </span>
            )}
            {item.ynReRcpt === 'Y' && (
              <span className="pill border border-brand-500/30 bg-brand-500/10 text-brand-300">재접수</span>
            )}
          </div>
          <span className="text-[10px] text-ink-500 font-mono tabular-nums">#{item.noIdx}</span>
        </div>

        <h3 className="text-base font-semibold text-ink-50 leading-snug">
          {item.dfctCnts || '내용 없음'}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-ink-400 flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            {subtitle}
          </p>
        )}

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-ink-300">
          {classification && (
            <div className="flex items-center gap-1.5">
              <Hammer className="h-3 w-3 text-ink-500" />
              <span className="text-ink-400">분류</span>
              <span className="text-ink-100">{classification}</span>
            </div>
          )}
          {visibility.nmCstCpny && item.nmCstCpny && (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-500">시공사</span>
              <span className="text-ink-100">{item.nmCstCpny}</span>
            </div>
          )}
          {visibility.nmWrkPrsn && item.nmWrkPrsn && (
            <div className="flex items-center gap-1.5">
              <User2 className="h-3 w-3 text-ink-500" />
              <span className="text-ink-400">작업자</span>
              <span className="text-ink-100">{item.nmWrkPrsn}</span>
            </div>
          )}
          {dateLine && (
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <CalendarDays className="h-3 w-3 text-ink-500" />
              <span className="text-ink-300 tabular-nums">{dateLine}</span>
            </div>
          )}
        </div>

        {(item.workMemo || item.customerMemo) && (
          <div className="mt-3 space-y-2">
            {item.customerMemo && (
              <Memo label="입주자 메모" body={item.customerMemo} />
            )}
            {item.workMemo && <Memo label="작업 메모" body={item.workMemo} accent />}
          </div>
        )}

        {item.images.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-2 flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" /> 첨부 사진 {item.images.length}장
            </div>
            <div className="flex gap-2">
              {item.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group/img relative aspect-square w-24 sm:w-28 overflow-hidden rounded-lg border border-white/[0.06] bg-ink-900"
                  aria-label={`사진 ${i + 1} 크게 보기`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover transition group-hover/img:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {open !== null && (
        <Lightbox
          images={item.images}
          startIndex={open}
          caption={`${displayDong}동 ${ho}호 · ${item.dfctCnts ?? ''}`}
          onClose={() => setOpen(null)}
        />
      )}
    </article>
  );
}

function Memo({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[12px] leading-relaxed ${
        accent
          ? 'border-brand-500/20 bg-brand-500/[0.04] text-brand-200'
          : 'border-white/[0.06] bg-white/[0.02] text-ink-200'
      }`}
    >
      <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
      <div>
        <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">{label}</div>
        <div>{body}</div>
      </div>
    </div>
  );
}
