import Link from 'next/link';
import { Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LockedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02]">
          <Lock className="h-6 w-6 text-brand-400" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-3">접속이 일시 차단되었습니다</h1>
        <p className="text-sm text-ink-400 leading-relaxed">
          관리자가 점검 포털을 일시적으로 차단했습니다. 차단이 해제되면 다시 접속할 수 있습니다.
        </p>
        <div className="mt-8">
          <Link href="/" className="btn-ghost">
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
