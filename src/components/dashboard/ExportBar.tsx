'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { CATEGORY_LABEL, CATEGORY_ORDER, type FlawCategory, type FlawItem } from '@/lib/types';
import type { ExportContext } from '@/lib/exporters';
import { printFlawList } from '@/lib/printView';
import { showToast } from '@/lib/toast';

interface Props {
  /** All items (status selection happens here, not via the dashboard tab). */
  items: FlawItem[];
  ctx: ExportContext;
}

const PER_PAGE = 4;

export default function ExportBar({ items, ctx }: Props) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Set<FlawCategory>>(() => new Set(CATEGORY_ORDER));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const counts = useMemo(() => {
    const out: Record<FlawCategory, number> = { received: 0, workDone: 0, reAccepted: 0, finalDone: 0 };
    for (const it of items) out[it.category]++;
    return out;
  }, [items]);

  const chosen = useMemo(() => items.filter((it) => sel.has(it.category)), [items, sel]);
  const pages = Math.max(1, Math.ceil(chosen.length / PER_PAGE));

  const toggle = (c: FlawCategory) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const makePdf = () => {
    if (chosen.length === 0) {
      showToast('포함할 상태를 한 개 이상 선택해 주세요.', 'warn');
      return;
    }
    setOpen(false);
    try {
      printFlawList(chosen, ctx);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost" aria-haspopup="dialog" aria-expanded={open}>
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">출력 PDF</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-72 overflow-hidden rounded-xl border border-white/[0.1] bg-ink-900 shadow-2xl">
          <div className="px-3.5 pt-3 pb-1.5 text-[12px] text-ink-300">출력할 상태를 선택하세요</div>
          <div className="px-2 pb-1">
            {CATEGORY_ORDER.map((c) => {
              const on = sel.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition hover:bg-white/[0.05]"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      on ? 'border-brand-500 bg-brand-500 text-white' : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {on && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 text-ink-100">{CATEGORY_LABEL[c]}</span>
                  <span className="tabular-nums text-[12px] text-ink-500">{counts[c]}건</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-white/[0.06] px-3.5 py-2 text-[11px] text-ink-400">
            선택 <span className="text-ink-100 tabular-nums">{chosen.length}</span>건 · 약{' '}
            <span className="text-ink-100 tabular-nums">{pages}</span>페이지
            <span className="text-ink-500"> (A4 · 4건/페이지)</span>
          </div>
          <div className="p-2">
            <button type="button" onClick={makePdf} className="btn-primary w-full">
              <FileText className="h-4 w-4" /> PDF 만들기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
