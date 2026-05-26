'use client';

import { CATEGORY_LABEL, CATEGORY_ORDER, type FlawCategory } from '@/lib/types';

interface Props {
  counts: Record<FlawCategory, number>;
  active: FlawCategory;
  onChange: (c: FlawCategory) => void;
}

export default function TabBar({ counts, active, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="점검 상태별 분류"
      className="flex w-full overflow-x-auto rounded-xl border border-white/[0.06] bg-ink-850/50 p-1 scroll-fade"
    >
      {CATEGORY_ORDER.map((cat) => {
        const selected = active === cat;
        return (
          <button
            key={cat}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(cat)}
            className={`relative flex-1 min-w-[88px] rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              selected
                ? 'bg-gradient-to-b from-brand-500/[0.18] to-brand-600/[0.10] text-white border border-brand-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]'
                : 'text-ink-300 hover:text-ink-100 hover:bg-white/[0.04]'
            }`}
          >
            <span className="block leading-none">{CATEGORY_LABEL[cat]}</span>
            <span
              className={`mt-1 inline-block text-[11px] tabular-nums ${
                selected ? 'text-brand-200' : 'text-ink-500'
              }`}
            >
              {counts[cat] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
