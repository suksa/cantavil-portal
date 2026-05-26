'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  images: string[];
  startIndex?: number;
  onClose: () => void;
  caption?: string;
}

export default function Lightbox({ images, startIndex = 0, onClose, caption }: Props) {
  const [idx, setIdx] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const total = images.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  if (!total) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="첨부 사진 확대 보기"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white"
        onClick={onClose}
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2.5 text-white"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="이전 사진"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2.5 text-white"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="다음 사진"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className="relative w-full h-full flex items-center justify-center px-4 sm:px-16 py-12"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 50) (dx > 0 ? prev() : next());
          touchStartX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[idx]}
          alt={`${caption ?? '점검 사진'} ${idx + 1}/${total}`}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-xs text-white/80 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur">
        {caption && <span className="hidden sm:inline">{caption}</span>}
        {caption && <span className="opacity-40">·</span>}
        <span>
          {idx + 1} / {total}
        </span>
      </div>
    </div>
  );
}
