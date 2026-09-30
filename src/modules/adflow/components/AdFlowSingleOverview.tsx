'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowLeft, Check, Edit2, MapPin, 
  Target, DollarSign, Loader2, PartyPopper, AlertCircle, RefreshCw 
} from 'lucide-react';
import AdPreview, { AdPlatform } from './AdPreview';
import type { ChannelItem } from './AdChannelsLobby';

export interface ProductItem {
  id: string;
  name: string;
  short_description?: string;
  irresistible_offer?: string;
  target_triggers?: string;
  price_range?: string;
  agent_name?: string;
  agent_channel?: string;
}

interface AdFlowSingleOverviewProps {
  channel: ChannelItem;
  products: ProductItem[];
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  onBackToLobby: () => void;
  onLaunchSuccess: () => void;
}

export default function AdFlowSingleOverview({
  channel,
  products,
  selectedProductId,
  onSelectProduct,
  onBackToLobby,
  onLaunchSuccess,
}: AdFlowSingleOverviewProps) {
  // Estado de Campaña
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [ctaText, setCtaText] = useState('Enviar WhatsApp');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [budgetDaily, setBudgetDaily] = useState<number>(150);
  const [forecastPeriod, setForecastPeriod] = useState<'1' | '7' | '30'>('7');
  
  // Targeting
  const [interests, setInterests] = useState<string[]>(['#Inversiones', '#Oportunidad', 'Emprendedores']);
  const [locations, setLocations] = useState<string[]>(['México', 'Ciudad de México']);
  
  // Estados de UI
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<AdPlatform>(channel.previewType);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingSection, setEditingSection] = useState<'none' | 'creative' | 'targeting'>('none');
  const [err, setErr] = useState('');

  // Producto seleccionado actualmente
  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Generar copy y prompts automáticamente cuando cambia el producto
  useEffect(() => {
    if (!currentProduct) return;

    async function generateBriefing() {
      setIsGenerating(true);
      setErr('');
      try {
        const res = await fetch('/api/adflow/generate-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: currentProduct.name,
            irresistibleOffer: currentProduct.irresistible_offer,
            targetTriggers: currentProduct.target_triggers,
            shortDescription: currentProduct.short_description,
            priceRange: currentProduct.price_range,
            agentName: currentProduct.agent_name,
          }),
        });

        const data = await res.json();
        setHeadline(data.single_headline || `Oportunidad: ${currentProduct.name}`);
        setBodyText(data.single_body || currentProduct.short_description || 'Contáctanos hoy mismo.');
        setCtaText(data.single_cta || 'Enviar WhatsApp');
        if (data.suggested_interests?.length) {
          setInterests(data.suggested_interests);
        }

        // Generar una imagen inicial con Sandbox
        const imgRes = await fetch('/api/adflow/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: data.prompt_1_1 || currentProduct.name,
            aspectRatio: channel.previewType === 'tiktok' ? '9:16' : '1:1',
            provider: 'sandbox',
          }),
        });
        const imgData = await imgRes.json();
        if (imgData.url) setMediaUrl(imgData.url);
      } catch (e: any) {
        console.error(e);
        setErr('Error generando contenido con IA.');
      } finally {
        setIsGenerating(false);
      }
    }

    generateBriefing();
  }, [selectedProductId, currentProduct, channel.previewType]);

  // Cálculos de Proyección según presupuesto y periodo
  const multiplier = Number(forecastPeriod);
  const totalSpend = budgetDaily * multiplier;
  const estimatedClicksMin = Math.round(budgetDaily * 0.08 * multiplier);
  const estimatedClicksMax = Math.round(budgetDaily * 0.25 * multiplier);
  const estimatedReachMin = Math.round(budgetDaily * 8 * multiplier);
  const estimatedReachMax = Math.round(budgetDaily * 22 * multiplier);
  const estimatedLeadsMin = Math.max(1, Math.round(estimatedClicksMin * 0.15));
  const estimatedLeadsMax = Math.max(3, Math.round(estimatedClicksMax * 0.22));

  const handleConfirmLaunch = async () => {
    setIsLaunching(true);
    try {
      await fetch('/api/adflow/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${currentProduct?.name || 'Campaña'} - ${channel.name}`,
          productId: selectedProductId,
          platform: channel.previewType === 'tiktok' ? 'tiktok' : channel.previewType === 'google_search' ? 'google' : 'whatsapp',
          budgetDaily: budgetDaily,
          headline: headline,
          bodyText: bodyText,
          ctaText: ctaText,
          mediaUrl: mediaUrl,
          destinationUrl: 'https://adflow.online',
          targetingInterests: interests,
          targetingLocations: locations,
        }),
      });
    } catch (launchErr) {
      console.warn('Error guardando en BD:', launchErr);
    } finally {
      setIsLaunching(false);
      setShowConfirmModal(false);
      onLaunchSuccess();
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra superior de regreso */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToLobby}
          className="flex items-center gap-2 text-xs font-bold text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} /> Volver a selección de canales
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Canal: {channel.name}
          </span>
        </div>
      </div>

      {/* LAYOUT DE 3 COLUMNAS ESTILO PLAI.IO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA 1: CHECKLIST INTELIGENTE Y CONFIGURACIÓN (5 cols) */}
        <div className="lg:col-span-5 space-y-5 bg-card border border-line rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                📢 Anunciar en minutos
              </h2>
              <p className="text-xs text-ink-soft">Configurado con tu Fábrica de Agentes</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Objetivo: Leads WhatsApp
            </span>
          </div>

          {err && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle size={14} /> {err}
            </div>
          )}

          {/* COMBOBOX DE PRODUCTOS */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold tracking-wider text-ink-soft flex items-center justify-between">
              <span>Producto o Servicio del CRM</span>
              {isGenerating && (
                <span className="text-primary flex items-center gap-1 font-semibold normal-case">
                  <Loader2 size={12} className="animate-spin" /> Extrayendo cerebro...
                </span>
              )}
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => onSelectProduct(e.target.value)}
              className="w-full rounded-xl border border-line bg-app px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:border-primary"
            >
              {products.length === 0 ? (
                <option value="">(Sin productos registrados en la Fábrica de Agentes)</option>
              ) : (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.name} {p.agent_name ? `· (Atendido por ${p.agent_name})` : ''}
                  </option>
                ))
              )}
            </select>
            {currentProduct?.irresistible_offer && (
              <p className="text-[11px] text-ink-soft italic bg-soft/50 p-2 rounded-lg border border-line">
                💡 <span className="font-semibold text-ink">Oferta Irresistible:</span> {currentProduct.irresistible_offer}
              </p>
            )}
          </div>

          {/* PASO 1: TARGETING RECOMENDADO */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Target size={14} className="text-primary" /> 1. Segmentación Recomendada
              </span>
              <button 
                type="button" 
                onClick={() => setEditingSection(editingSection === 'targeting' ? 'none' : 'targeting')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Edit2 size={12} /> {editingSection === 'targeting' ? 'Listo' : 'Editar'}
              </button>
            </div>

            {editingSection === 'targeting' ? (
              <div className="space-y-2 p-3 rounded-xl bg-soft border border-line animate-in fade-in">
                <label className="text-[10px] font-bold text-ink-soft uppercase">Ubicación</label>
                <input
                  type="text"
                  value={locations.join(', ')}
                  onChange={(e) => setLocations(e.target.value.split(',').map((s) => s.trim()))}
                  className="w-full text-xs rounded-lg border border-line px-2.5 py-1.5 bg-card text-ink"
                  placeholder="Ej. Querétaro, México"
                />
                <label className="text-[10px] font-bold text-ink-soft uppercase block pt-1">Intereses (Separados por coma)</label>
                <input
                  type="text"
                  value={interests.join(', ')}
                  onChange={(e) => setInterests(e.target.value.split(',').map((s) => s.trim()))}
                  className="w-full text-xs rounded-lg border border-line px-2.5 py-1.5 bg-card text-ink"
                  placeholder="Ej. #BienesRaices, Inversiones"
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {locations.map((loc) => (
                  <span key={loc} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <MapPin size={10} /> {loc}
                  </span>
                ))}
                {interests.map((it) => (
                  <span key={it} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-soft text-ink border border-line">
                    {it}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* PASO 2: CREATIVO RECOMENDADO */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" /> 2. Creativo & Copia
              </span>
              <button 
                type="button" 
                onClick={() => setEditingSection(editingSection === 'creative' ? 'none' : 'creative')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Edit2 size={12} /> {editingSection === 'creative' ? 'Listo' : 'Editar'}
              </button>
            </div>

            {editingSection === 'creative' ? (
              <div className="space-y-3 p-3 rounded-xl bg-soft border border-line animate-in fade-in">
                <div>
                  <label className="text-[10px] font-bold text-ink-soft uppercase block mb-1">Titular (Headline)</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full text-xs rounded-lg border border-line px-2.5 py-1.5 bg-card text-ink font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-soft uppercase block mb-1">Texto Principal (Copy AIDA)</label>
                  <textarea
                    rows={4}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full text-xs rounded-lg border border-line p-2 bg-card text-ink"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-soft uppercase block mb-1">Botón de Acción (CTA)</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full text-xs rounded-lg border border-line px-2.5 py-1.5 bg-card text-ink font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-line bg-soft/40">
                <div className="h-14 w-14 rounded-lg bg-soft border border-line overflow-hidden shrink-0 flex items-center justify-center">
                  {mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="Thumb" className="h-full w-full object-cover" />
                  ) : (
                    <Sparkles size={16} className="text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-ink truncate">{headline || 'Campaña con IA'}</h4>
                  <p className="text-[11px] text-ink-soft line-clamp-2">{bodyText}</p>
                </div>
              </div>
            )}
          </div>

          {/* PASO 3: PRESUPUESTO DIARIO */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <DollarSign size={14} className="text-primary" /> 3. Presupuesto Diario
              </span>
              <span className="text-sm font-bold text-primary">
                ${budgetDaily} MXN / día
              </span>
            </div>

            <input
              type="range"
              min={channel.previewType === 'tiktok' ? 400 : 50}
              max={2500}
              step={25}
              value={budgetDaily}
              onChange={(e) => setBudgetDaily(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-ink-soft font-semibold">
              <span>Mínimo: ${channel.previewType === 'tiktok' ? 400 : 50} MXN</span>
              <span>Recomendado: $200 MXN</span>
              <span>Escala: $2,500 MXN</span>
            </div>
          </div>

          {/* BOTÓN FINAL DE LANZAMIENTO */}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Crear Anuncio
            </button>
          </div>
        </div>

        {/* COLUMNA 2: PREVISUALIZADOR EN VIVO (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center">
          {/* Conmutador de redes arriba del celular */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl bg-card border border-line shadow-xs">
            <button
              type="button"
              onClick={() => setActivePreviewPlatform('meta_feed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activePreviewPlatform === 'meta_feed' ? 'bg-primary text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Meta Feed
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewPlatform('tiktok')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activePreviewPlatform === 'tiktok' ? 'bg-black text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              TikTok
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewPlatform('google_search')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activePreviewPlatform === 'google_search' ? 'bg-blue-600 text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Google
            </button>
          </div>

          <AdPreview
            platform={activePreviewPlatform}
            headline={headline}
            bodyText={bodyText}
            ctaText={ctaText}
            brandName={currentProduct?.name || 'Mi Negocio'}
            mediaUrl={mediaUrl}
            displayUrl="adflow.online"
          />
        </div>

        {/* COLUMNA 3: RESULTADOS PROYECTADOS (FORECASTED RESULTS) (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-line rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Resultados Estimados
              </h3>
              <span className="text-[10px] text-ink-soft">IA Forecast</span>
            </div>

            {/* Selector de periodo: 1 día | 7 días | 30 días */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-soft rounded-xl border border-line">
              {(['1', '7', '30'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForecastPeriod(p)}
                  className={`py-1 rounded-lg text-xs font-bold transition-all ${
                    forecastPeriod === p ? 'bg-card text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {p} {p === '1' ? 'día' : 'días'}
                </button>
              ))}
            </div>

            {/* Tarjeta 1: Inversión */}
            <div className="p-3.5 rounded-2xl border border-line bg-app space-y-1">
              <span className="text-[10px] font-bold uppercase text-ink-soft block">Inversión (Spend)</span>
              <div className="text-lg font-extrabold text-ink">
                ${totalSpend.toLocaleString()} MXN
              </div>
            </div>

            {/* Tarjeta 2: Clics Calificados */}
            <div className="p-3.5 rounded-2xl border border-line bg-app space-y-1">
              <span className="text-[10px] font-bold uppercase text-ink-soft block">Clics Estimados</span>
              <div className="text-lg font-extrabold text-blue-600">
                {estimatedClicksMin} - {estimatedClicksMax}
              </div>
            </div>

            {/* Tarjeta 3: Alcance (Personas) */}
            <div className="p-3.5 rounded-2xl border border-line bg-app space-y-1">
              <span className="text-[10px] font-bold uppercase text-ink-soft block">Alcance (Reach)</span>
              <div className="text-lg font-extrabold text-indigo-600">
                {estimatedReachMin.toLocaleString()} - {estimatedReachMax.toLocaleString()}
              </div>
            </div>

            {/* Tarjeta 4: Conversaciones / Leads a WhatsApp */}
            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Prospectos WhatsApp</span>
              <div className="text-lg font-extrabold text-emerald-700">
                {estimatedLeadsMin} - {estimatedLeadsMax} leads
              </div>
              <span className="text-[10px] text-emerald-600 block">
                Atendidos por: {currentProduct?.agent_name || 'Setter IA'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL FESTIVO DE CONFIRMACIÓN (ESTILO PLAI.IO 🎉) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-line p-8 text-center space-y-5 shadow-2xl">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl shadow-inner animate-bounce">
                🎉
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-ink">¡Todo listo para lanzar!</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Estás a punto de activar tu anuncio para <span className="font-bold text-ink">{currentProduct?.name}</span> con un presupuesto de <span className="font-bold text-primary">${budgetDaily} MXN/día</span>.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-soft border border-line text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-soft">Canal:</span>
                <span className="font-bold text-ink">{channel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Recepción de Leads:</span>
                <span className="font-bold text-emerald-600">WhatsApp directos al CRM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Agente Responsable:</span>
                <span className="font-bold text-ink">{currentProduct?.agent_name || 'Setter Comercial'}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-line bg-app text-xs font-bold text-ink hover:bg-soft transition-all"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmLaunch}
                disabled={isLaunching}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isLaunching ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Publicando...
                  </>
                ) : (
                  'Confirmar y Lanzar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
