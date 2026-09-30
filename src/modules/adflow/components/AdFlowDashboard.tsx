'use client';

import { useState, useEffect } from 'react';
import { 
  Play, Pause, Plus, TrendingUp, Calendar, 
  BarChart3, ExternalLink, Trash2, Edit2, MessageCircle 
} from 'lucide-react';

export interface CampaignSummary {
  id: string;
  name: string;
  platform: 'facebook' | 'tiktok' | 'google' | 'whatsapp';
  status: 'active' | 'paused' | 'draft';
  budget_daily: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  media_url?: string;
  destination_url: string;
  start_date: string;
}

const MOCK_CAMPAIGNS: CampaignSummary[] = [
  {
    id: 'camp-1',
    name: 'Casa en Preventa Zibatá - WhatsApp',
    platform: 'facebook',
    status: 'active',
    budget_daily: 200,
    spend: 2050.58,
    impressions: 18450,
    clicks: 412,
    leads: 28,
    media_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&fit=crop',
    destination_url: 'https://casa-en-zibata.homerealty.us/home-9159',
    start_date: '2026-09-15',
  },
  {
    id: 'camp-2',
    name: 'Campaña TikTok - Inteligencia Artificial',
    platform: 'tiktok',
    status: 'paused',
    budget_daily: 400,
    spend: 850.0,
    impressions: 12200,
    clicks: 198,
    leads: 12,
    media_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&fit=crop',
    destination_url: 'https://adflow.online',
    start_date: '2026-09-20',
  },
  {
    id: 'camp-3',
    name: 'Google Search - Asesor Inmobiliario',
    platform: 'google',
    status: 'active',
    budget_daily: 150,
    spend: 640.2,
    impressions: 4800,
    clicks: 145,
    leads: 18,
    media_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&fit=crop',
    destination_url: 'https://medtoledo.com',
    start_date: '2026-09-22',
  },
];

interface AdFlowDashboardProps {
  onStartNewAd: () => void;
}

export default function AdFlowDashboard({ onStartNewAd }: AdFlowDashboardProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'performance' | 'drafts'>('recent');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>(MOCK_CAMPAIGNS);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const res = await fetch('/api/adflow/campaigns');
        const data = await res.json();
        if (data.campaigns && data.campaigns.length > 0) {
          const mapped: CampaignSummary[] = data.campaigns.map((c: any) => ({
            id: c.id,
            name: c.name,
            platform: c.platform,
            status: c.status,
            budget_daily: Number(c.budget_daily),
            spend: Number(c.spend),
            impressions: c.impressions,
            clicks: c.clicks,
            leads: c.leads,
            media_url: c.media_url,
            destination_url: c.destination_url,
            start_date: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '2026-09-29',
          }));
          setCampaigns(mapped);
        }
      } catch (err) {
        console.warn('Error cargando campañas:', err);
      }
    }
    loadCampaigns();
  }, []);

  const toggleCampaignStatus = async (id: string) => {
    const camp = campaigns.find((c) => c.id === id);
    if (!camp) return;
    const nextStatus = camp.status === 'active' ? 'paused' : 'active';
    try {
      await fetch('/api/adflow/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const avgCpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      {/* TARJETAS SUPERIORES DE MEDIA SPEND POR CANAL (ESTILO PLAI.IO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Ads */}
        <div className="p-4 rounded-3xl border border-line bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span className="text-lg">🔍</span> Media spend · Google Ads
            </div>
            <span className="text-[10px] text-ink-soft bg-soft px-2 py-0.5 rounded-full">
              Cuenta vinculada
            </span>
          </div>
          <div className="text-2xl font-black text-ink">$640.20 <span className="text-xs font-medium text-ink-soft">MTD</span></div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp size={12} /> +12.4% vs mes anterior
          </div>
        </div>

        {/* Facebook / Meta Ads */}
        <div className="p-4 rounded-3xl border border-line bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span className="text-lg">👥</span> Media spend · Meta Ads
            </div>
            <span className="text-[10px] text-ink-soft bg-soft px-2 py-0.5 rounded-full">
              Toledo Marketing
            </span>
          </div>
          <div className="text-2xl font-black text-ink">$2,050.58 <span className="text-xs font-medium text-ink-soft">MTD</span></div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp size={12} /> +228.0% vs mes anterior
          </div>
        </div>

        {/* TikTok Ads */}
        <div className="p-4 rounded-3xl border border-line bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <span className="text-lg">🎵</span> Media spend · TikTok Ads
            </div>
            <span className="text-[10px] text-ink-soft bg-soft px-2 py-0.5 rounded-full">
              Med Toledo
            </span>
          </div>
          <div className="text-2xl font-black text-ink">$850.00 <span className="text-xs font-medium text-ink-soft">MTD</span></div>
          <div className="text-[11px] text-amber-600 font-semibold">
            Presupuesto optimizado
          </div>
        </div>
      </div>

      {/* BARRA DE PESTAÑAS (Recent Ads, Performance, Drafts) + BOTÓN NUEVO AD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'recent'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-soft'
            }`}
          >
            Anuncios Recientes ({campaigns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'performance'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-soft'
            }`}
          >
            Rendimiento & Métricas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'drafts'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-soft'
            }`}
          >
            Borradores (0)
          </button>
        </div>

        <button
          type="button"
          onClick={onStartNewAd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/15 transition-all"
        >
          <Plus size={16} /> Crear Anuncio con IA
        </button>
      </div>

      {/* PESTAÑA 1: RECENT ADS (GRID VISUAL IDÉNTICO A PLAI.IO) */}
      {activeTab === 'recent' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="rounded-3xl border border-line bg-card overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Imagen / Video Preview */}
              <div className="relative aspect-video bg-zinc-900 overflow-hidden flex items-center justify-center">
                {camp.media_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={camp.media_url} alt={camp.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-zinc-600 text-xs">Sin creativo</div>
                )}

                {/* Botón de Play simulado */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center shadow-lg">
                    <Play size={18} className="ml-0.5" />
                  </div>
                </div>

                {/* Badge de Estado en la esquina inferior derecha */}
                <button
                  type="button"
                  onClick={() => toggleCampaignStatus(camp.id)}
                  className={`absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md transition-all ${
                    camp.status === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {camp.status === 'active' ? 'Active' : 'Paused'}
                </button>
              </div>

              {/* Información y detalles */}
              <div className="p-4 space-y-2.5 text-left flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-ink">
                    <span className="capitalize">{camp.platform} Ads</span>
                    <span className="text-[11px] text-primary">${camp.budget_daily}/día</span>
                  </div>
                  <h4 className="text-xs font-bold text-ink line-clamp-1">{camp.name}</h4>
                  <a
                    href={camp.destination_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-ink-soft hover:text-primary truncate block flex items-center gap-1"
                  >
                    <ExternalLink size={10} /> {camp.destination_url}
                  </a>
                </div>

                {/* Métricas clave al pie de la tarjeta */}
                <div className="pt-2 border-t border-line grid grid-cols-3 gap-1 text-center text-[10px]">
                  <div>
                    <span className="text-ink-soft block">Clics</span>
                    <span className="font-bold text-ink">{camp.clicks}</span>
                  </div>
                  <div>
                    <span className="text-ink-soft block">Leads</span>
                    <span className="font-bold text-emerald-600">{camp.leads}</span>
                  </div>
                  <div>
                    <span className="text-ink-soft block">Inversión</span>
                    <span className="font-bold text-ink">${Math.round(camp.spend)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PESTAÑA 2: CAMPAIGN PERFORMANCE (TABLA DETALLADA) */}
      {activeTab === 'performance' && (
        <div className="rounded-3xl border border-line bg-card overflow-hidden shadow-xs">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Desempeño de Campañas</h3>
            <span className="text-xs font-semibold text-ink-soft">
              Inversión Total: <strong className="text-ink">${totalSpend.toLocaleString()} MXN</strong> · Leads: <strong className="text-emerald-600">{totalLeads}</strong> · CPL Promedio: <strong className="text-primary">${avgCpl} MXN</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-soft/50 text-[10px] uppercase font-bold text-ink-soft border-b border-line">
                <tr>
                  <th className="p-3.5">Campaña</th>
                  <th className="p-3.5">Plataforma</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 text-right">Inversión</th>
                  <th className="p-3.5 text-right">Impresiones</th>
                  <th className="p-3.5 text-right">Clics</th>
                  <th className="p-3.5 text-right">Leads CRM</th>
                  <th className="p-3.5 text-right">Costo / Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium text-ink">
                {campaigns.map((c) => {
                  const cpl = c.leads > 0 ? (c.spend / c.leads).toFixed(2) : '-';
                  return (
                    <tr key={c.id} className="hover:bg-soft/30 transition-colors">
                      <td className="p-3.5 font-bold truncate max-w-[200px]">{c.name}</td>
                      <td className="p-3.5 capitalize">{c.platform}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold">${c.spend.toLocaleString()}</td>
                      <td className="p-3.5 text-right text-ink-soft">{c.impressions.toLocaleString()}</td>
                      <td className="p-3.5 text-right">{c.clicks}</td>
                      <td className="p-3.5 text-right font-bold text-emerald-600">{c.leads}</td>
                      <td className="p-3.5 text-right font-bold text-primary">${cpl}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: DRAFTS (Borradores vacíos inicialmente) */}
      {activeTab === 'drafts' && (
        <div className="p-12 text-center rounded-3xl border border-dashed border-line bg-card space-y-3">
          <div className="text-3xl">📝</div>
          <h4 className="text-sm font-bold text-ink">No tienes borradores pendientes</h4>
          <p className="text-xs text-ink-soft max-w-sm mx-auto">
            Cuando estés creando un anuncio y decidas guardarlo para después, aparecerá aquí listo para continuar.
          </p>
        </div>
      )}
    </div>
  );
}
