import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import IdMark from '@/components/IdMark';

export default function NotFound() {
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
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02]">
            <Compass className="h-6 w-6 text-brand-400" />
          </div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.22em] text-brand-400">404</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">페이지를 찾을 수 없습니다</h1>
          <p className="text-sm leading-relaxed text-ink-400">
            주소가 바뀌었거나 더 이상 존재하지 않는 페이지입니다.
          </p>
          <div className="mt-7">
            <Link href="/dashboard" className="btn-primary">
              <Home className="h-4 w-4" /> 점검 목록으로
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
