'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** max-width tailwind class for the panel. */
  size?: string;
}

/** Lightweight modal: backdrop click + ESC close, scroll-locked while open. */
export default function Modal({ title, onClose, children, size = 'max-w-lg' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm"
    >
      <div
        className={`w-full ${size} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-ink-900 shadow-2xl`}
      >
        {title !== undefined && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-ink-900/95 px-4 py-3 backdrop-blur">
            <h3 className="text-base font-semibold">{title}</h3>
            <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-ink-300 hover:bg-white/[0.06] hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
