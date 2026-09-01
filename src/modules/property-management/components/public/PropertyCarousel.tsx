'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Expand } from 'lucide-react';

interface Props {
  images: string[];
  title: string;
}

export function PropertyCarousel({ images, title }: Props) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => setCurrent((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);

  if (!images.length) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center bg-soft text-ink-soft rounded-2xl">
        Sin imágenes
      </div>
    );
  }

  return (
    <>
      {/* ─── Carrusel principal ─── */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ height: '480px' }}>
        {/* Imagen activa */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current}
          src={images[current]}
          alt={`${title} — ${current + 1}`}
          className="h-full w-full object-cover transition-opacity duration-300"
        />

        {/* Gradiente inferior */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Contador */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          {current + 1} / {images.length}
        </div>

        {/* Expandir */}
        <button
          onClick={() => setLightbox(true)}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/70 backdrop-blur-sm transition-colors"
        >
          <Expand size={13} />
          Ver todas
        </button>

        {/* Flecha izquierda */}
        {images.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Flecha derecha */}
        {images.length > 1 && (
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* ─── Thumbnails ─── */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`shrink-0 overflow-hidden rounded-lg transition-all ${i === current ? 'ring-2 ring-primary ring-offset-1 opacity-100' : 'opacity-60 hover:opacity-90'}`}
              style={{ width: 72, height: 52 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ─── Lightbox ─── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={18} />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
            {current + 1} / {images.length}
          </div>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronLeft size={22} />
          </button>
          <div className="mx-20 max-h-[88vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[current]} alt={title} className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronRight size={22} />
          </button>
        </div>
      )}
    </>
  );
}
