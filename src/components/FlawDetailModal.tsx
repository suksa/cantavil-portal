'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Copy,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import type { FlawItem } from '@/lib/types';
import type { WarrantyConfig } from '@/lib/admin';
import Modal from './Modal';
import Lightbox from './Lightbox';
import { INSPECT_PREFILL_KEY } from './FlawCard';
import { flawStages, CAT_HEX } from '@/lib/timelineSvg';
import { addMonths, dDay, fmtDate, daysAgo } from '@/lib/dates';
import { copyText, flawSummaryText, type ExportContext } from '@/lib/exporters';
import { printSingleFlaw } from '@/lib/printView';
import { showToast } from '@/lib/toast';

interface Props {
  item: FlawItem;
  ctx: ExportContext;
  showApplicant: boolean;
  warranty: WarrantyConfig;
  onClose: () => void;
}

export default function FlawDetailModal({ item, ctx, showApplicant, warranty, onClose }: Props) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const stages = flawStages(item);

  const warrantyEnd = warranty.startDate && warranty.months ? addMonths(warranty.startDate, warranty.months) : null;
  const warrantyDday = warrantyEnd ? dDay(warrantyEnd.toISOString().slice(0, 10)) : null;

  const copy = async () => {
    const ok = await copyText(flawSummaryText(item, ctx));
    showToast(ok ? '요약을 복사했습니다.' : '복사에 실패했습니다.', ok ? 'success' : 'error');
  };
  const share = async () => {
    const text = flawSummaryText(item, ctx);
    if (navigator.share) {
      try {
        await navigator.share({ title: `하자 #${item.noIdx}`, text });
        return;
      } catch {
        /* user cancelled or unsupported — fall back to copy */
      }
    }
    const ok = await copyText(text);
    showToast(ok ? '요약을 복사했습니다. 붙여넣어 공유하세요.' : '공유에 실패했습니다.', ok ? 'success' : 'error');
  };
  const pdf = () => {
    try {
      printSingleFlaw(item, ctx, item.images);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };
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

  const rcptDays = daysAgo(item.dtRcpt);

  return (
    <Modal title={`하자 #${item.noIdx}`} onClose={onClose}>
      <div className="px-4 py-4 space-y-4">
        {/* Title + location */}
        <div>
          <h2 className="text-lg font-semibold leading-snug">{item.dfctCnts || '내용 없음'}</h2>
          <p className="mt-1 text-[13px] text-ink-400">
            {[item.nmLoc, item.nmRgon].filter(Boolean).join(' · ') || '위치 정보 없음'}
          </p>
        </div>

        {/* Images */}
        {item.images.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-500">
              <ImageIcon className="h-3 w-3" /> 첨부 사진 {item.images.length}장
            </div>
            <div className="flex flex-wrap gap-2">
              {item.images.map((src, i) => (
                <button key={i} type="button" onClick={() => setLightbox(i)} className="relative aspect-square w-24 overflow-hidden rounded-lg border border-white/[0.06] bg-ink-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-200">
            <Calendar className="h-3.5 w-3.5 text-ink-400" /> 진행 타임라인
          </div>
          <ol className="relative ml-1.5 border-l border-white/[0.08]">
            {stages.map((s) => (
              <li key={s.key} className="relative pl-5 pb-3 last:pb-0">
                <span
                  className="absolute -left-[6px] top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-ink-900"
                  style={{ background: s.done || s.current ? CAT_HEX[s.key] : '#3a3b42' }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[13px] ${s.current ? 'font-semibold text-white' : s.done ? 'text-ink-200' : 'text-ink-500'}`}>
                    {s.label}
                    {s.current && <span className="ml-1.5 text-[10px] text-brand-300">현재</span>}
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-500">{fmtDate(s.date) ?? '—'}</span>
                </div>
              </li>
            ))}
          </ol>
          {rcptDays != null && rcptDays > 0 && item.category !== 'finalDone' && (
            <p className="mt-1 text-[11px] text-ink-500">접수 후 {rcptDays}일 경과</p>
          )}
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[13px]">
          <Row label="분류" value={[item.nmDfctCl, item.nmDfctCaus].filter(Boolean).join(' / ')} />
          <Row label="유형" value={item.nmDfctType} />
          {ctx.visibility.nmCstCpny && <Row label="시공사" value={item.nmCstCpny} />}
          {ctx.visibility.nmWrkPrsn && <Row label="작업자" value={item.nmWrkPrsn} />}
          {showApplicant && <Row label="신청자" value={item.nmApltPrsn} />}
          {item.customerMemo && <Row label="입주자 메모" value={item.customerMemo} />}
          {item.workMemo && <Row label="작업 메모" value={item.workMemo} />}
        </dl>

        {/* Warranty */}
        {warrantyDday != null && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] ${
            warrantyDday < 0 ? 'border-white/10 bg-white/[0.03] text-ink-400'
              : warrantyDday <= 30 ? 'border-brand-500/30 bg-brand-500/[0.08] text-brand-100'
              : 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-100'
          }`}>
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {warrantyDday < 0
              ? `하자보수 보증기간이 종료되었습니다 (${fmtDate(warrantyEnd!.toISOString().slice(0, 10).replace(/-/g, ''))}).`
              : `하자보수 보증 만료까지 D-${warrantyDday} · ${fmtDate(warrantyEnd!.toISOString().slice(0, 10).replace(/-/g, ''))}`}
          </div>
        )}

        {/* Actions — 공유/내보내기 모두 관리자 노출(가시성) 설정만 반영 */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <ActionBtn icon={<Copy className="h-4 w-4" />} label="요약 복사" onClick={copy} />
          <ActionBtn icon={<Share2 className="h-4 w-4" />} label="공유" onClick={share} />
          <ActionBtn icon={<FileText className="h-4 w-4" />} label="PDF 저장" onClick={pdf} />
        </div>
        {item.category === 'workDone' && (
          <button type="button" onClick={reRegister} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/[0.08] px-3 py-2.5 text-sm font-medium text-brand-200 transition hover:bg-brand-500/15">
            <RotateCcw className="h-4 w-4" /> 같은 내용으로 재등록
          </button>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox
          images={item.images}
          startIndex={lightbox}
          caption={`${ctx.displayDong}동 ${ctx.ho}호 · ${item.dfctCnts ?? ''}`}
          onClose={() => setLightbox(null)}
        />
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-ink-500">{label}</dt>
      <dd className="text-ink-100">{value}</dd>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-ink-100 transition hover:bg-white/[0.07]"
    >
      {icon}
      {label}
    </button>
  );
}
