'use client';

import { useEffect, useRef, useState } from 'react';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';

interface Props {
  images: string[];
  onOpen: (index: number) => void;
  /** Tailwind aspect class for each slide. */
  aspectClassName?: string;
}

/**
 * Instagram/Facebook-style image carousel (feed view), powered by Swiper.
 * Touch swipe, mouse drag (PC), momentum, and snap all come from Swiper.
 * `slidesPerView: 1.12` leaves the next image peeking so users know to swipe.
 */
export default function ImageCarousel({ images, onOpen, aspectClassName = 'aspect-[4/5]' }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const single = images.length <= 1;

  useEffect(() => {
    if (single || !elRef.current) return;
    const sw = new Swiper(elRef.current, {
      modules: [Pagination],
      slidesPerView: 1.12,
      spaceBetween: 8,
      grabCursor: true,
      threshold: 4,
      resistanceRatio: 0.6,
      pagination: { el: '.swiper-pagination', clickable: true },
      on: {
        slideChange: (s) => setActive(s.activeIndex),
      },
    });
    return () => {
      sw.destroy(true, true);
    };
  }, [single, images.length]);

  if (single) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        aria-label="사진 크게 보기"
        className={`relative block w-full ${aspectClassName} bg-ink-900`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </button>
    );
  }

  return (
    <div className="relative bg-ink-900">
      <div className="swiper" ref={elRef}>
        <div className="swiper-wrapper">
          {images.map((src, i) => (
            <div className="swiper-slide" key={i}>
              <button
                type="button"
                onClick={() => onOpen(i)}
                aria-label={`사진 ${i + 1} 크게 보기`}
                className={`relative block w-full ${aspectClassName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            </div>
          ))}
        </div>
        <div className="swiper-pagination" />
      </div>

      <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white/90 backdrop-blur">
        {active + 1} / {images.length}
      </div>
    </div>
  );
}
