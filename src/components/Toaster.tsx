'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { onToast, type ToastDetail, type ToastKind } from '@/lib/toast';

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  error: <AlertCircle className="h-4 w-4 text-brand-400" />,
  info: <Info className="h-4 w-4 text-sky-400" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-400" />,
};

const RING: Record<ToastKind, string> = {
  success: 'border-emerald-500/30',
  error: 'border-brand-500/30',
  info: 'border-sky-500/30',
  warn: 'border-amber-500/30',
};

/** Mount once near the root of a client page; listens to the toast bus. */
export default function Toaster() {
  const [items, setItems] = useState<ToastDetail[]>([]);

  useEffect(() => {
    return onToast((t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, t.duration);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1400] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom,0)]">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border ${RING[t.kind]} bg-ink-900/95 px-3.5 py-2.5 text-sm text-ink-100 shadow-2xl backdrop-blur animate-[toastin_0.2s_ease-out]`}
        >
          <span className="shrink-0">{ICON[t.kind]}</span>
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
