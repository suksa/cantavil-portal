'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Swiper from 'swiper';
import { Navigation, Keyboard } from 'swiper/modules';

interface Props {
  images: string[];
  startIndex?: number;
  onClose: () => void;
  caption?: string;
}

export default function Lightbox({ images, startIndex = 0, onClose, caption }: Props) {
  const total = images.length;
  const [idx, setIdx] = useState(startIndex);

  const elRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const pushedRef = useRef(false);
  const backTimer = useRef<number | null>(null);

  // Make the browser / hardware back button close the lightbox instead of
  // navigating away. We push a throwaway history entry on open and pop it back
  // when closing via the UI. The deferred history.back() plus the pushed-guard
  // survive React Strict Mode's double-invoke of effects (dev only) — without
  // them the entry gets popped the instant it's pushed and the lightbox closes
  // immediately on open.
  useEffect(() => {
    const w = window;
    if (backTimer.current !== null) {
      w.clearTimeout(backTimer.current);
      backTimer.current = null;
    }
    if (!pushedRef.current) {
      pushedRef.current = true;
      w.history.pushState({ cantavilLightbox: true }, '');
    }
    const onPop = () => {
      pushedRef.current = false; // our entry was consumed by the back navigation
      onCloseRef.current();
    };
    w.addEventListener('popstate', onPop);
    return () => {
      w.removeEventListener('popstate', onPop);
      if (pushedRef.current) {
        backTimer.current = w.setTimeout(() => {
          backTimer.current = null;
          pushedRef.current = false;
          w.history.back();
        }, 0);
      }
    };
  }, []);

  // Body scroll lock + Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Swiper pager — touch swipe, mouse drag, keyboard arrows.
  useEffect(() => {
    if (!elRef.current) return;
    const sw = new Swiper(elRef.current, {
      modules: [Navigation, Keyboard],
      initialSlide: startIndex,
      spaceBetween: 24,
      threshold: 4,
      grabCursor: true,
      keyboard: { enabled: true },
      navigation: { prevEl: prevRef.current, nextEl: nextRef.current },
      on: {
        slideChange: (s) => setIdx(s.activeIndex),
      },
    });
    return () => {
      sw.destroy(true, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!total) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="첨부 사진 확대 보기"
      className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 rounded-full bg-white/15 hover:bg-white/25 p-2 text-white shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        ref={prevRef}
        type="button"
        aria-label="이전 사진"
        className={`lb-nav absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/15 hover:bg-white/25 p-2.5 text-white shadow-lg ${
          total > 1 ? '' : 'hidden'
        }`}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        ref={nextRef}
        type="button"
        aria-label="다음 사진"
        className={`lb-nav absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/15 hover:bg-white/25 p-2.5 text-white shadow-lg ${
          total > 1 ? '' : 'hidden'
        }`}
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="swiper h-full w-full" ref={elRef}>
        <div className="swiper-wrapper">
          {images.map((src, i) => (
            <div
              className="swiper-slide !flex items-center justify-center px-4 sm:px-16 py-16 sm:py-12"
              key={i}
              onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${caption ?? '점검 사진'} ${i + 1}/${total}`}
                className="max-h-full max-w-full object-contain select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 text-xs text-white/80 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur">
        {caption && <span className="hidden sm:inline">{caption}</span>}
        {caption && <span className="opacity-40">·</span>}
        <span className="tabular-nums">
          {idx + 1} / {total}
        </span>
      </div>
    </div>
  );
}
