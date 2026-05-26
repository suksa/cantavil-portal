import LoginForm from '@/components/LoginForm';
import LogoParticles from '@/components/LogoParticles';
import IdMark from '@/components/IdMark';
import { Sparkles, Maximize2, RefreshCw, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile: shown first (top). Desktop: left column. */}
      <section className="relative flex-1 overflow-hidden min-h-[46vh] sm:min-h-[60vh] lg:min-h-screen">
        <Image
          src="/hero.jpeg"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover opacity-60 select-none pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950/95 via-ink-950/70 to-ink-950/40" />
        <div className="absolute inset-0 grid-overlay opacity-60" />

        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10 lg:p-14">
          <div className="flex items-center gap-3 text-ink-100">
            <IdMark className="h-7 w-auto" />
            <div className="leading-tight">
              <div className="text-[11px] tracking-[0.18em] text-ink-300 uppercase">Cantavil</div>
              <div className="text-sm font-semibold">신검단중앙역 칸타빌 더 스위트</div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <LogoParticles className="h-[320px] sm:h-[440px] lg:h-[560px] w-full max-w-[820px]" />
          </div>

          <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-ink-300">
            <Feature icon={<Sparkles className="h-4 w-4" />} title="간편한 진입">
              동·호수와 본인 정보만으로 1초 만에 접속
            </Feature>
            <Feature icon={<Maximize2 className="h-4 w-4" />} title="고해상도 보기">
              현장 사진을 풀스크린으로 좌우 넘기며 확대
            </Feature>
            <Feature icon={<RefreshCw className="h-4 w-4" />} title="실시간 갱신">
              접수부터 최종 확인까지 한 화면에서 추적
            </Feature>
          </div>
        </div>
      </section>

      {/* Mobile: shown second (bottom). Desktop: right column. */}
      <section className="relative flex w-full lg:max-w-[480px] xl:max-w-[520px] lg:border-l lg:border-white/[0.06]">
        <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />
        <div className="relative z-10 mx-auto flex w-full flex-col justify-center px-6 py-10 sm:px-10 sm:py-14">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-brand-400 mb-2">Resident Portal</p>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
              입주자 정보로<br />점검 내역을 확인하세요.
            </h1>
            <p className="mt-3 text-sm text-ink-400">
              단지·동·호수와 이름, 전화번호를 입력하면 사전점검 시 접수된 모든 하자 항목과 처리
              상태를 확인할 수 있습니다.
            </p>
          </div>

          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-3.5 py-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-[12px] leading-relaxed text-ink-200">
              <span className="font-medium text-emerald-200">개인정보를 수집·저장하지 않습니다.</span>{' '}
              <span className="text-ink-400">
                입력하신 정보는 본인 확인을 위한 일회성 인증에만 사용되며 서버에 보관되지 않습니다.
              </span>
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-[440px] rounded-xl skeleton" aria-label="loading form" />
            }
          >
            <LoginForm />
          </Suspense>

          <footer className="mt-10 pt-6 border-t border-white/[0.06] text-[11px] text-ink-500 leading-relaxed">
            © Cantavil The Suite · 입주자 점검 포털
            <br />입주자 본인 확인 후 등록된 점검 내역을 조회할 수 있습니다.
          </footer>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-3.5 py-3">
      <div className="flex items-center gap-2 text-ink-100 mb-1">
        <span className="text-brand-400">{icon}</span>
        <span className="text-[11px] uppercase tracking-wider font-medium">{title}</span>
      </div>
      <p className="text-[11px] leading-snug text-ink-400">{children}</p>
    </div>
  );
}
