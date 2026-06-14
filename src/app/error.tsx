'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import IdMark from '@/components/IdMark';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[cantavil] page error:', error?.message, error?.digest);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center gap-3 px-6 pt-6 sm:px-10 sm:pt-8 text-ink-100">
        <IdMark className="h-6 w-auto" />
        <div className="leading-tight">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-300">Cantavil</div>
          <div className="text-sm font-semibold">신검단중앙역 칸타빌 더 스위트</div>
        </div>
      </header>
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="absolute inset-0 grid-overlay pointer-events-none opacity-30" />
        <div className="relative max-w-md">
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/[0.08]">
            <AlertTriangle className="h-6 w-6 text-brand-400" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">일시적인 문제가 발생했습니다</h1>
          <p className="text-sm leading-relaxed text-ink-400">
            화면을 불러오는 중 오류가 생겼어요. 다시 시도하거나 잠시 후 접속해 주세요.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={reset} className="btn-primary">
              <RotateCcw className="h-4 w-4" /> 다시 시도
            </button>
            <Link href="/dashboard" className="btn-ghost justify-center">
              <Home className="h-4 w-4" /> 점검 목록으로
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
