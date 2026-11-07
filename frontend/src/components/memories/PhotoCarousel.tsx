/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

interface PhotoCarouselProps {
  images: string[];
  alt: string;
  aspectClass?: string;
  placeholderTitle?: string;
  onDoubleClick?: () => void;
  className?: string;
}

/** Carrousel de photos façon Instagram : balayage tactile, flèches (souris) et pastilles. */
export function PhotoCarousel({
  images,
  alt,
  aspectClass = 'aspect-square',
  placeholderTitle,
  onDoubleClick,
  className = '',
}: PhotoCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => setIndex(0), [images.length]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: (index + dir) * el.clientWidth, behavior: 'smooth' });
  };

  if (images.length === 0) {
    return (
      <div
        className={`${aspectClass} ${className} flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#E3EDF2] to-[#B9C3CC] p-6 text-center`}
        onDoubleClick={onDoubleClick}
      >
        <MapPin className="h-10 w-10 text-[#1F5F7B]/70" />
        {placeholderTitle && <p className="line-clamp-3 text-lg font-semibold text-[#46525E]">{placeholderTitle}</p>}
      </div>
    );
  }

  return (
    <div className={`group relative ${className}`} onDoubleClick={onDoubleClick}>
      <div ref={ref} onScroll={onScroll} className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto ${aspectClass}`}>
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="h-full w-full shrink-0 snap-center bg-[#E3EDF2]">
            {broken[i] ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-[#7A8794]">Image indisponible</div>
            ) : (
              <img
                src={src}
                alt={`${alt} (${i + 1}/${images.length})`}
                className="h-full w-full select-none object-cover"
                draggable={false}
                loading={i === 0 ? 'eager' : 'lazy'}
                onError={() => setBroken((b) => ({ ...b, [i]: true }))}
              />
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              aria-label="Photo précédente"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1 shadow transition group-hover:block"
            >
              <ChevronLeft className="h-5 w-5 text-[#111A22]" />
            </button>
          )}
          {index < images.length - 1 && (
            <button
              type="button"
              aria-label="Photo suivante"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1 shadow transition group-hover:block"
            >
              <ChevronRight className="h-5 w-5 text-[#111A22]" />
            </button>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white">
            {index + 1}/{images.length}
          </span>
          <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
