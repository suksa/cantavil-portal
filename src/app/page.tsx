import LoginForm from '@/components/LoginForm';
import LogoParticles from '@/components/LogoParticles';
import { Building2, ShieldCheck, Layers3 } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT — 3D logo + hero panel */}
      <section className="relative flex-1 overflow-hidden order-2 lg:order-1 min-h-[50vh] lg:min-h-screen">
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
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-500/95 text-white font-bold tracking-tight">
              ID
            </span>
            <div className="leading-tight">
              <div className="text-[11px] tracking-[0.18em] text-ink-300 uppercase">Cantavil</div>
              <div className="text-sm font-semibold">신검단중앙역 더 스위트</div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <LogoParticles className="h-[260px] sm:h-[340px] lg:h-[420px] w-full max-w-[640px]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-ink-300">
            <Feature icon={<Building2 className="h-4 w-4" />} title="입주자 전용">
              105동 외 1,219세대 입주자 점검 포털
            </Feature>
            <Feature icon={<ShieldCheck className="h-4 w-4" />} title="세션 미러링">
              dtspace 인증을 안전한 서버 프록시로 중계
            </Feature>
            <Feature icon={<Layers3 className="h-4 w-4" />} title="네 단계 상태">
              접수 · 작업완료 · 재접수 · 최종완료
            </Feature>
          </div>
        </div>
      </section>

      {/* RIGHT — form panel */}
      <section className="relative flex w-full lg:max-w-[480px] xl:max-w-[520px] order-1 lg:order-2 lg:border-l lg:border-white/[0.06]">
        <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />
        <div className="relative z-10 mx-auto flex w-full flex-col justify-center px-6 py-10 sm:px-10 sm:py-14">
          <div className="mb-7">
            <p className="text-[11px] uppercase tracking-[0.22em] text-brand-400 mb-2">Resident Portal</p>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
              입주자 정보로<br />점검 내역을 확인하세요.
            </h1>
            <p className="mt-3 text-sm text-ink-400">
              단지·동·호수와 이름, 전화번호를 입력하면 사전점검 시 접수된 모든 하자 항목과 처리
              상태를 확인할 수 있습니다.
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
            © Cantavil The Suite Mirror · 비공식 입주자 편의 미러 사이트입니다.
            <br />원본 시스템: m4.dtspace.co.kr
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
