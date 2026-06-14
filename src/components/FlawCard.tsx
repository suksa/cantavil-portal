'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  HelpCircle,
  Hammer,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  RotateCcw,
  Share2,
  Sparkles,
  User2,
} from 'lucide-react';
import type { CardVisibility, FlawItem } from '@/lib/types';
import Lightbox from './Lightbox';
import ImageCarousel from './ImageCarousel';
import { fmtDate, daysAgo } from '@/lib/dates';
import { copyText, flawSummaryText } from '@/lib/exporters';
import { showToast } from '@/lib/toast';

export const INSPECT_PREFILL_KEY = 'cantavil_inspect_prefill';

interface Props {
  item: FlawItem;
  displayDong: string;
  ho: string;
  visibility: CardVisibility;
  /** 'list' = compact thumbnails at the bottom, 'feed' = large carousel on top. */
  variant?: 'list' | 'feed';
  /** Highlight when this item's status changed since the previous load (session). */
  changed?: boolean;
  onOpenDetail?: (item: FlawItem) => void;
  onOpenGlossary?: () => void;
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

export default function FlawCard({
  item,
  displayDong,
  ho,
  visibility,
  variant = 'list',
  changed = false,
  onOpenDetail,
  onOpenGlossary,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const feed = variant === 'feed';

  const rcptDays = daysAgo(item.dtRcpt);
  const isStale = item.category === 'received' && rcptDays != null && rcptDays > 30;
  const wrkDays = daysAgo(item.dtWrk);

  const reRegister = () => {
    const prefill = {
      nmLoc: item.nmLoc,
      nmRgon: item.nmRgon,
      nmDfctCaus: item.nmDfctCaus,
      nmDfctCl: item.nmDfctCl,
      nmDfctType: item.nmDfctType,
      dfctCnts: item.dfctCnts ?? '',
      images: item.images.slice(0, 2),
    };
    try {
      sessionStorage.setItem(INSPECT_PREFILL_KEY, JSON.stringify(prefill));
    } catch {
      /* ignore */
    }
    router.push('/inspect');
  };

  const quickShare = async () => {
    const ctx = {
      displayDong,
      ho,
      nmCstm: '',
      nmSite: '',
      visibility: {
        nmCstCpny: visibility.nmCstCpny,
        nmWrkPrsn: visibility.nmWrkPrsn,
        dtWrk: visibility.dtWrk,
      },
    };
    const ok = await copyText(flawSummaryText(item, ctx));
    showToast(ok ? '요약을 복사했습니다.' : '복사에 실패했습니다.', ok ? 'success' : 'error');
  };

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
    <article
      className={`group relative rounded-xl border bg-ink-850/60 hover:bg-ink-850/90 transition shadow-card overflow-hidden ${
        changed ? 'border-brand-500/50 ring-1 ring-brand-500/30' : 'border-white/[0.06]'
      }`}
    >
      {feed && item.images.length > 0 && <ImageCarousel images={item.images} onOpen={(i) => setOpen(i)} />}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {statusPill(item)}
            {changed && (
              <span className="pill border border-brand-500/40 bg-brand-500/10 text-brand-200">
                <Sparkles className="h-3 w-3" /> 변경됨
              </span>
            )}
            {item.cdRcptPhs && (
              <span className="pill border border-white/[0.08] bg-white/[0.03] text-ink-300">{item.cdRcptPhs}</span>
            )}
            {isStale && (
              <span className="pill border border-amber-500/30 bg-amber-500/10 text-amber-200">
                <Clock className="h-3 w-3" /> {rcptDays}일째 대기
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={quickShare}
              aria-label="요약 복사"
              title="요약 복사"
              className="rounded-md p-1 text-ink-500 hover:bg-white/[0.06] hover:text-ink-200"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] text-ink-500 font-mono tabular-nums">#{item.noIdx}</span>
          </div>
        </div>

        <h3 className="text-base font-semibold text-ink-50 leading-snug">
          {onOpenDetail ? (
            <button type="button" onClick={() => onOpenDetail(item)} className="text-left hover:text-white transition">
              {item.dfctCnts || '내용 없음'}
            </button>
          ) : (
            item.dfctCnts || '내용 없음'
          )}
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
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={onOpenGlossary}
                  aria-label="용어 설명"
                  className="text-ink-500 hover:text-brand-300"
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              )}
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
          {visibility.nmApltPrsn && item.nmApltPrsn && (
            <div className="flex items-center gap-1.5">
              <User2 className="h-3 w-3 text-ink-500" />
              <span className="text-ink-400">신청자</span>
              <span className="text-ink-100">{item.nmApltPrsn}</span>
            </div>
          )}
          {dateLine && (
            <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
              <CalendarDays className="h-3 w-3 text-ink-500" />
              <span className="text-ink-300 tabular-nums">{dateLine}</span>
              {item.category === 'received' && rcptDays != null && rcptDays > 0 && (
                <span className={rcptDays > 30 ? 'text-amber-300' : rcptDays > 14 ? 'text-amber-400/80' : 'text-ink-500'}>
                  ({rcptDays}일 경과)
                </span>
              )}
            </div>
          )}
        </div>

        {(item.workMemo || item.customerMemo) && (
          <div className="mt-3 space-y-2">
            {item.customerMemo && <Memo label="입주자 메모" body={item.customerMemo} />}
            {item.workMemo && <Memo label="작업 메모" body={item.workMemo} accent />}
          </div>
        )}

        {!feed && item.images.length > 0 && (
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
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>
        )}

        {item.category === 'workDone' && (
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <p className="mb-2 text-[11px] leading-relaxed text-ink-400">
              보수가 완료되었습니다. 직접 확인 후 미흡하면 같은 내용으로 재등록하세요.
              {wrkDays != null && wrkDays >= 14 && (
                <span className="text-amber-300/90"> (작업 후 {wrkDays}일 경과)</span>
              )}
            </p>
            <button
              type="button"
              onClick={reRegister}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/[0.08] px-3 py-2.5 text-sm font-medium text-brand-200 transition hover:bg-brand-500/15"
            >
              <RotateCcw className="h-4 w-4" />
              같은 내용으로 재등록
            </button>
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
