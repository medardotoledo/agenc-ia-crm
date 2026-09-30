'use client';

import { useState } from 'react';
import { 
  Heart, MessageCircle, Share2, Music2, 
  ExternalLink, Play, Search, Globe, ChevronRight, Sparkles 
} from 'lucide-react';

export type AdPlatform = 'meta_feed' | 'meta_stories' | 'tiktok' | 'google_search' | 'whatsapp';

interface AdPreviewProps {
  platform: AdPlatform;
  headline: string;
  bodyText: string;
  ctaText: string;
  brandName?: string;
  logoUrl?: string | null;
  mediaUrl?: string | null;
  aspectRatio?: '1:1' | '9:16' | '16:9';
  displayUrl?: string;
  phoneOrContact?: string;
}

export default function AdPreview({
  platform,
  headline,
  bodyText,
  ctaText = 'Enviar WhatsApp',
  brandName = 'Mi Negocio',
  logoUrl,
  mediaUrl,
  aspectRatio = '1:1',
  displayUrl = 'minegocio.com',
  phoneOrContact = '+52 442 123 4567',
}: AdPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. VISTA PREVIA: GOOGLE SEARCH AD
  if (platform === 'google_search') {
    return (
      <div className="w-full max-w-[380px] rounded-2xl border border-line bg-app p-4 shadow-sm font-sans text-left">
        <div className="flex items-center gap-1.5 text-xs text-ink-soft mb-2">
          <Search size={14} className="text-primary" />
          <span className="font-bold">Vista previa en Google</span>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Patrocinado</span>
        </div>

        <div className="rounded-xl border border-line bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <div className="h-5 w-5 rounded-full bg-soft flex items-center justify-center text-[10px] font-bold text-ink">
              {brandName.slice(0, 1)}
            </div>
            <div className="truncate">
              <span className="font-semibold text-ink">{brandName}</span>
              <span className="text-ink-soft text-[11px] block truncate">{displayUrl}</span>
            </div>
          </div>

          <h3 className="text-base font-bold text-blue-600 hover:underline cursor-pointer leading-tight">
            {headline || 'Título de tu anuncio en Google Search'}
          </h3>

          <p className="text-xs text-ink-soft line-clamp-3 leading-relaxed">
            {bodyText || 'Descripción completa de tu anuncio en Google. Destaca los mayores beneficios, precios y el llamado a la acción para capturar clics calificados.'}
          </p>

          <div className="pt-2 border-t border-line flex flex-wrap gap-2 text-[11px]">
            <span className="text-blue-600 font-semibold cursor-pointer">Cotizar ahora »</span>
            <span className="text-blue-600 font-semibold cursor-pointer">Atención WhatsApp »</span>
            <span className="text-blue-600 font-semibold cursor-pointer">Ver galería »</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. VISTA PREVIA: TIKTOK ADS (Móvil vertical 9:16)
  if (platform === 'tiktok') {
    return (
      <div className="relative mx-auto w-[300px] h-[550px] rounded-[36px] bg-black border-4 border-zinc-800 shadow-2xl overflow-hidden flex flex-col justify-between text-white select-none">
        {/* Notch superior */}
        <div className="absolute top-2 inset-x-0 flex justify-center z-30">
          <div className="h-4 w-28 bg-zinc-900 rounded-full" />
        </div>

        {/* Barra superior de pestañas TikTok */}
        <div className="relative z-20 pt-8 px-6 flex justify-center gap-4 text-xs font-bold text-white/70">
          <span>Siguiendo</span>
          <span className="text-white border-b-2 border-white pb-1">Para ti</span>
        </div>

        {/* Contenido Multimedia de Fondo */}
        <div className="absolute inset-0 z-0 bg-zinc-900 flex items-center justify-center">
          {mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="Ad creative" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-white/40">
              <Sparkles size={32} className="text-primary animate-pulse" />
              <span className="text-xs font-medium">Generando creativo en 9:16 con IA...</span>
            </div>
          )}

          {/* Botón de Play si es video */}
          <button 
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white">
              <Play size={22} className="ml-1" />
            </div>
          </button>
        </div>

        {/* Botones de interacción lateral derecha */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-3">
          {/* Avatar con botón follow + */}
          <div className="relative mb-2">
            <div className="h-10 w-10 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center font-bold text-sm">
              {brandName.slice(0, 1)}
            </div>
            <div className="absolute -bottom-1 inset-x-0 flex justify-center">
              <span className="h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">+</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-9 w-9 rounded-full bg-black/30 flex items-center justify-center text-white">
              <Heart size={20} fill="currentColor" />
            </div>
            <span className="text-[10px] font-bold text-white/90">24.5K</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-9 w-9 rounded-full bg-black/30 flex items-center justify-center text-white">
              <MessageCircle size={20} />
            </div>
            <span className="text-[10px] font-bold text-white/90">318</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-9 w-9 rounded-full bg-black/30 flex items-center justify-center text-white">
              <Share2 size={20} />
            </div>
            <span className="text-[10px] font-bold text-white/90">Compartir</span>
          </div>
        </div>

        {/* Información inferior del anuncio */}
        <div className="relative z-20 p-4 pb-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">@{brandName.toLowerCase().replace(/\s+/g, '')}</span>
            <span className="text-[9px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded font-bold">Publicidad</span>
          </div>

          <p className="text-xs text-white/90 line-clamp-2 leading-snug">
            {headline ? `${headline} · ` : ''}{bodyText || 'Texto persuasivo del anuncio redactado por la IA...'}
          </p>

          {/* Botón CTA interactivo */}
          <div className="flex items-center justify-between bg-primary hover:bg-primary-light text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md">
            <span>{ctaText || 'Más información'}</span>
            <ChevronRight size={14} />
          </div>

          {/* Barra de audio */}
          <div className="flex items-center gap-2 text-[10px] text-white/70 pt-1">
            <Music2 size={12} className="animate-spin" />
            <span className="truncate">Sonido promocional · {brandName}</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. VISTA PREVIA: META FEED (Instagram & Facebook Feed 1:1)
  return (
    <div className="w-full max-w-[340px] rounded-3xl border border-line bg-card shadow-lg overflow-hidden font-sans text-left">
      {/* Header del Post */}
      <div className="p-3 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
            <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-xs font-bold text-ink">
              {brandName.slice(0, 1)}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-ink flex items-center gap-1">
              {brandName}
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            </div>
            <div className="text-[10px] text-ink-soft">Publicidad · {displayUrl}</div>
          </div>
        </div>
        <Globe size={14} className="text-ink-soft" />
      </div>

      {/* Copy Superior */}
      <div className="p-3 text-xs text-ink space-y-1">
        <p className="line-clamp-3 leading-relaxed">
          {bodyText || 'Cuerpo persuasivo del anuncio generado con IA a partir de la Oferta Irresistible...'}
        </p>
      </div>

      {/* Imagen / Multimedia (Aspecto 1:1) */}
      <div className="relative w-full aspect-square bg-soft overflow-hidden flex items-center justify-center">
        {mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="Ad media" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-ink-soft">
            <Sparkles size={28} className="text-primary animate-pulse" />
            <span className="text-xs font-medium">Creativo publicitario 1:1</span>
          </div>
        )}
      </div>

      {/* Barra Inferior de Acción y CTA */}
      <div className="p-3 bg-soft/40 border-t border-line flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-ink-soft uppercase font-bold block truncate">{displayUrl}</span>
          <h4 className="text-xs font-bold text-ink truncate leading-tight">
            {headline || 'Título irresistible del anuncio'}
          </h4>
        </div>
        <button 
          type="button" 
          className="shrink-0 bg-primary hover:bg-primary-light text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
}
