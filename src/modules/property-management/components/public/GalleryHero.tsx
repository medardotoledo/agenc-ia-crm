'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';

interface Props {
  images: string[];
  title: string;
}

export function GalleryHero({ images, title }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const open = (i: number) => setLightbox(i);
  const close = () => setLightbox(null);
  const prev = () => setLightbox((i) => (i != null ? (i - 1 + images.length) % images.length : 0));
  const next = () => setLightbox((i) => (i != null ? (i + 1) % images.length : 0));

  const main = images[0];
  const thumbs = images.slice(1, 5);
  const extra = images.length - 5;

  if (!images.length) {
    return (
      <div className="flex h-[340px] w-full items-center justify-center rounded-2xl bg-soft text-ink-soft sm:h-[480px]">
        Sin imágenes
      </div>
    );
  }

  return (
    <>
      {/* ─── Grid de galería ─── */}
      <div className="grid gap-2" style={{ gridTemplateColumns: thumbs.length ? '1fr 1fr' : '1fr', gridTemplateRows: 'auto' }}>
        {/* Imagen principal */}
        <div
          className={`relative cursor-pointer overflow-hidden rounded-2xl bg-soft ${thumbs.length ? 'row-span-2 h-[340px] sm:h-[480px]' : 'h-[340px] sm:h-[480px]'}`}
          onClick={() => open(0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main} alt={title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        </div>

        {/* Thumbnails */}
        {thumbs.map((url, i) => (
          <div
            key={i}
            className="relative cursor-pointer overflow-hidden rounded-xl bg-soft"
            style={{ height: '168px' }}
            onClick={() => open(i + 1)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 2}`} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
            {/* Overlay "+N fotos" en la última */}
            {i === 3 && extra > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-inverse">
                <Images size={22} />
                <span className="text-sm font-bold">+{extra} fotos</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── Lightbox ─── */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={close}
        >
          {/* Botón cerrar */}
          <button
            onClick={close}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={18} />
          </button>

          {/* Contador */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
            {lightbox + 1} / {images.length}
          </div>

          {/* Anterior */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Imagen */}
          <div className="mx-20 max-h-[85vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightbox]}
              alt={`${title} — foto ${lightbox + 1}`}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>

          {/* Siguiente */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
