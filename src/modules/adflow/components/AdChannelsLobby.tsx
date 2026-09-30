'use client';

import { 
  Search, MessageSquare, Video, Globe, 
  Smartphone, Share2, Sparkles, ArrowRight 
} from 'lucide-react';
import type { AdPlatform } from './AdPreview';

export interface ChannelItem {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  iconName: string;
  bgGradient: string;
  previewType: AdPlatform;
}

const CHANNELS: ChannelItem[] = [
  {
    id: 'whatsapp_messages',
    name: 'Message Ads (WhatsApp)',
    category: 'Meta & WhatsApp',
    description: 'Anuncio en FB e IG con botón directo a WhatsApp atendido por tu Agente IA.',
    badge: 'Recomendado CRM',
    iconName: '💬',
    bgGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    previewType: 'meta_feed',
  },
  {
    id: 'meta_instagram',
    name: 'Instagram Ads',
    category: 'Meta',
    description: 'Feed, Reels y Stories con imágenes o videos de alta conversión.',
    badge: 'Popular',
    iconName: '📸',
    bgGradient: 'from-rose-500/20 via-purple-500/10 to-transparent',
    previewType: 'meta_feed',
  },
  {
    id: 'meta_facebook',
    name: 'Facebook Ads',
    category: 'Meta',
    description: 'Feed de noticias, marketplace y audiencias maduras en Facebook.',
    iconName: '👥',
    bgGradient: 'from-blue-600/20 via-indigo-500/10 to-transparent',
    previewType: 'meta_feed',
  },
  {
    id: 'tiktok_ads',
    name: 'TikTok Ads',
    category: 'TikTok',
    description: 'Feed vertical en pantalla completa para audiencias dinámicas.',
    badge: 'Tendencia',
    iconName: '🎵',
    bgGradient: 'from-zinc-800/30 via-neutral-900/10 to-transparent',
    previewType: 'tiktok',
  },
  {
    id: 'google_search',
    name: 'Google Search Ads',
    category: 'Google Ads',
    description: 'Aparece en los primeros resultados cuando la gente busca tu producto.',
    iconName: '🔍',
    bgGradient: 'from-amber-500/20 via-blue-500/10 to-transparent',
    previewType: 'google_search',
  },
  {
    id: 'google_display',
    name: 'Google Display & Banners',
    category: 'Google Ads',
    description: 'Banners publicitarios en millones de sitios web y aplicaciones.',
    iconName: '🖼️',
    bgGradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
    previewType: 'google_search',
  },
  {
    id: 'youtube_ads',
    name: 'YouTube Video Ads',
    category: 'Google Ads',
    description: 'Anuncios en video antes o durante videos relevantes en YouTube.',
    iconName: '▶️',
    bgGradient: 'from-red-600/20 via-rose-500/10 to-transparent',
    previewType: 'tiktok',
  },
  {
    id: 'google_pmax',
    name: 'All Google Channels (PMax)',
    category: 'Google Ads',
    description: 'Una sola campaña que corre en Search, Maps, Gmail, YouTube y Discover.',
    badge: 'Automatizado',
    iconName: '🌐',
    bgGradient: 'from-primary/20 via-accent/10 to-transparent',
    previewType: 'google_search',
  },
];

interface AdChannelsLobbyProps {
  onSelectChannel: (channel: ChannelItem) => void;
}

export default function AdChannelsLobby({ onSelectChannel }: AdChannelsLobbyProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-ink">Comenzar un nuevo anuncio</h2>
        <p className="text-xs text-ink-soft">
          Selecciona el canal donde deseas lanzar tu campaña publicitaria con Inteligencia Artificial.
        </p>
      </div>

      {/* Grid de Canales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            onClick={() => onSelectChannel(ch)}
            className="group relative flex flex-col justify-between p-5 rounded-2xl border border-line bg-card hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
          >
            {/* Gradiente sutil de fondo */}
            <div className={`absolute inset-0 bg-gradient-to-br ${ch.bgGradient} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`} />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{ch.iconName}</span>
                {ch.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {ch.badge}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-soft block">
                  {ch.category}
                </span>
                <h3 className="text-sm font-bold text-ink group-hover:text-primary transition-colors">
                  {ch.name}
                </h3>
              </div>

              <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
                {ch.description}
              </p>
            </div>

            <div className="relative z-10 pt-4 mt-2 border-t border-line/60 flex items-center justify-between text-xs font-bold text-ink group-hover:text-primary transition-colors">
              <span>Configurar anuncio</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
