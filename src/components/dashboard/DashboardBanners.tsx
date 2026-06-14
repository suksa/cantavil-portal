'use client';

import { CalendarClock, Info, AlertTriangle, Megaphone, ShieldCheck } from 'lucide-react';
import type { AdminSettings, NoticeLevel } from '@/lib/admin';
import { addMonths, dDay, fmtDate } from '@/lib/dates';

const NOTICE_STYLE: Record<NoticeLevel, string> = {
  info: 'border-sky-500/30 bg-sky-500/[0.07] text-sky-100',
  warn: 'border-amber-500/30 bg-amber-500/[0.07] text-amber-100',
  urgent: 'border-brand-500/40 bg-brand-500/[0.10] text-brand-100',
};

const NOTICE_ICON: Record<NoticeLevel, React.ReactNode> = {
  info: <Info className="h-4 w-4 shrink-0" />,
  warn: <AlertTriangle className="h-4 w-4 shrink-0" />,
  urgent: <Megaphone className="h-4 w-4 shrink-0" />,
};

function ddayLabel(n: number): string {
  if (n > 0) return `D-${n}`;
  if (n === 0) return 'D-DAY';
  return `D+${-n}`;
}

export default function DashboardBanners({ settings }: { settings: AdminSettings }) {
  const notice = settings.notice;
  const deadline = settings.schedule.submitDeadline;
  const moveIn = settings.schedule.moveInDate;
  const dl = deadline ? dDay(deadline) : null;
  const mi = moveIn ? dDay(moveIn) : null;

  const warrantyEnd =
    settings.warranty.startDate && settings.warranty.months
      ? addMonths(settings.warranty.startDate, settings.warranty.months)
      : null;
  const wd = warrantyEnd ? dDay(warrantyEnd.toISOString().slice(0, 10)) : null;
  const warrantyEndStr = warrantyEnd ? warrantyEnd.toISOString().slice(0, 10) : null;

  const showNotice = notice.enabled && notice.message.trim().length > 0;
  if (!showNotice && dl == null && mi == null && wd == null) return null;

  return (
    <div className="mb-4 space-y-2">
      {showNotice && (
        <div className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed ${NOTICE_STYLE[notice.level]}`}>
          {NOTICE_ICON[notice.level]}
          <span className="whitespace-pre-wrap">{notice.message}</span>
        </div>
      )}
      {dl != null && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[12px] ${
            dl < 0
              ? 'border-white/10 bg-white/[0.03] text-ink-400'
              : dl <= 7
                ? 'border-brand-500/30 bg-brand-500/[0.08] text-brand-100'
                : 'border-amber-500/25 bg-amber-500/[0.06] text-amber-100'
          }`}
        >
          <CalendarClock className="h-4 w-4 shrink-0" />
          <span>
            하자 접수 마감 <b className="tabular-nums">{ddayLabel(dl)}</b>
            <span className="text-ink-400"> · {fmtDate(deadline)}</span>
            {dl >= 0 && dl <= 7 && <span className="ml-1">마감이 임박했습니다.</span>}
            {dl < 0 && <span className="ml-1">마감이 지났습니다.</span>}
          </span>
        </div>
      )}
      {mi != null && mi > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12px] text-ink-300">
          <CalendarClock className="h-4 w-4 shrink-0 text-ink-500" />
          <span>입주 시작 <b className="tabular-nums">{ddayLabel(mi)}</b><span className="text-ink-500"> · {fmtDate(moveIn)}</span></span>
        </div>
      )}
      {wd != null && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[12px] ${
            wd < 0
              ? 'border-white/10 bg-white/[0.03] text-ink-400'
              : wd <= 30
                ? 'border-brand-500/30 bg-brand-500/[0.08] text-brand-100'
                : 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-100'
          }`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            {wd < 0 ? (
              <>하자보수 보증기간 종료 <span className="text-ink-400">· {fmtDate(warrantyEndStr)}</span></>
            ) : (
              <>하자보수 보증 만료 <b className="tabular-nums">{ddayLabel(wd)}</b><span className="text-ink-400"> · {fmtDate(warrantyEndStr)}</span></>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
