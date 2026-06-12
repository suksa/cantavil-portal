import { Suspense } from 'react';
import { ShieldAlert } from 'lucide-react';
import IdMark from '@/components/IdMark';
import LoginForm from '@/components/LoginForm';

export default function AdminLoginPanel() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <header className="flex items-center gap-3 mb-8">
          <IdMark className="h-7 w-auto" />
          <div className="leading-tight">
            <div className="text-[11px] tracking-[0.18em] text-ink-300 uppercase">
              Cantavil · Admin
            </div>
            <div className="text-sm font-semibold">관리자 로그인</div>
          </div>
        </header>

        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[12px] leading-relaxed text-ink-200">
            <span className="font-medium text-amber-200">관리자 전용 진입 화면입니다.</span>{' '}
            <span className="text-ink-400">
              지정된 관리자 동·호수와 본인 정보로 로그인하면 운영 설정에 접근할 수 있습니다.
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
      </div>
    </main>
  );
}
