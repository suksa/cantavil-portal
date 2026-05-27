import MorphingParticles from '@/components/MorphingParticles';
import IdMark from '@/components/IdMark';

export const dynamic = 'force-static';

export const metadata = {
  title: '서비스 종료 안내 · Cantavil',
  description: '신검단중앙역 칸타빌 더 스위트 점검 포털은 운영을 종료했습니다.',
};

export default function ClosedPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center gap-3 px-6 pt-6 sm:px-10 sm:pt-8 text-ink-100">
        <IdMark className="h-6 w-auto" />
        <div className="leading-tight">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-300">Cantavil</div>
          <div className="text-sm font-semibold">신검단중앙역 칸타빌 더 스위트</div>
        </div>
      </header>

      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="absolute inset-0 grid-overlay pointer-events-none opacity-40" />

        <MorphingParticles className="relative w-full max-w-[820px] h-[clamp(340px,58vh,620px)]" />

        <div className="relative mt-4 sm:mt-8 max-w-md text-center">
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-brand-400">
            Service ended
          </p>
          <h1 className="mb-3 text-2xl sm:text-3xl font-semibold tracking-tight">
            점검 포털 운영을 종료했습니다
          </h1>
          <p className="text-sm leading-relaxed text-ink-400">
            점검 내역 조회는 더 이상 제공되지 않습니다.
          </p>
        </div>
      </section>

      <footer className="px-6 pb-6 sm:px-10 sm:pb-8 text-center text-[11px] leading-relaxed text-ink-500">
        © Cantavil The Suite · 입주자 점검 포털
      </footer>
    </main>
  );
}
