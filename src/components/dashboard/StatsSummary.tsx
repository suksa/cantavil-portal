'use client';

import { useMemo } from 'react';
import { Clock, PartyPopper } from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_ORDER, type FlawCategory, type FlawItem } from '@/lib/types';
import { CAT_HEX } from '@/lib/timelineSvg';
import { daysAgo } from '@/lib/dates';

interface Props {
  name: string;
  counts: Record<FlawCategory, number>;
  items: FlawItem[];
  onJump: (c: FlawCategory) => void;
}

export default function StatsSummary({ name, counts, items, onJump }: Props) {
  const total = CATEGORY_ORDER.reduce((n, c) => n + counts[c], 0);
  // "완료" = 작업완료 + 최종완료 (보수가 끝난 건 모두 완료로 집계).
  const donePct = total ? Math.round(((counts.workDone + counts.finalDone) / total) * 100) : 0;

  // Conic-gradient stops for the donut.
  const gradient = useMemo(() => {
    if (!total) return 'conic-gradient(#26272e 0 100%)';
    let acc = 0;
    const stops: string[] = [];
    for (const c of CATEGORY_ORDER) {
      const frac = (counts[c] / total) * 100;
      if (frac <= 0) continue;
      stops.push(`${CAT_HEX[c]} ${acc}% ${acc + frac}%`);
      acc += frac;
    }
    return `conic-gradient(${stops.join(', ')})`;
  }, [counts, total]);

  // Oldest still-unresolved (접수) item.
  const oldest = useMemo(() => {
    let best: { id: number; days: number } | null = null;
    for (const it of items) {
      if (it.category !== 'received') continue;
      const d = daysAgo(it.dtRcpt);
      if (d != null && (!best || d > best.days)) best = { id: it.noIdx, days: d };
    }
    return best;
  }, [items]);

  if (total === 0) return null;

  return (
    <section className="mb-4 rounded-2xl border border-white/[0.08] bg-ink-900/50 p-4 sm:p-5 glass">
      <div className="flex items-center gap-4 sm:gap-5">
        {/* Donut */}
        <div className="relative h-[92px] w-[92px] shrink-0" aria-hidden>
          <div className="h-full w-full rounded-full" style={{ background: gradient }} />
          <div className="absolute inset-[12px] rounded-full bg-ink-900 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold tabular-nums leading-none">{donePct}%</span>
            <span className="text-[9px] text-ink-500 mt-0.5">완료</span>
          </div>
        </div>

        {/* Right: welcome + progress + legend */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-200">
            반갑습니다, <span className="font-semibold text-white">{name}</span>님
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${donePct}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onJump(c)}
                className="inline-flex items-center gap-1.5 text-[12px] text-ink-300 hover:text-white transition"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_HEX[c] }} />
                {CATEGORY_LABEL[c]} <span className="font-semibold tabular-nums text-ink-100">{counts[c]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action nudges */}
      {((oldest && oldest.days >= 30) || counts.finalDone === total) && (
        <div className="mt-3.5 flex flex-col gap-2">
          {oldest && oldest.days >= 30 && (
            <button
              type="button"
              onClick={() => onJump('received')}
              className="flex w-full items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-left text-[12px] text-amber-200 transition hover:bg-amber-500/15"
            >
              <Clock className="h-4 w-4 shrink-0" />
              접수 후 {oldest.days}일째 대기 중인 항목(#{oldest.id})이 있습니다. 관리사무소에 확인이 필요할 수 있어요.
            </button>
          )}
          {total > 0 && counts.finalDone === total && (
            <div className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-2 text-[12px] text-emerald-200">
              <PartyPopper className="h-4 w-4 shrink-0" />
              모든 하자가 최종완료되었습니다. 기록을 PDF로 저장해 두세요.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
