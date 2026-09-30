'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Home, Megaphone, Wand2, Link2, 
  Sparkles, CheckCircle2, ChevronRight, Loader2 
} from 'lucide-react';
import { useActiveAccount } from '@/core/account/activeAccount';
import AdFlowDashboard from '@/modules/adflow/components/AdFlowDashboard';
import AdChannelsLobby, { ChannelItem } from '@/modules/adflow/components/AdChannelsLobby';
import AdFlowSingleOverview, { ProductItem } from '@/modules/adflow/components/AdFlowSingleOverview';
import CreativeHubView from '@/modules/adflow/components/CreativeHubView';
import ConnectPlatformsView from '@/modules/adflow/components/ConnectPlatformsView';

function AdFlowContent() {
  const { account, loading: accountLoading } = useActiveAccount();
  const searchParams = useSearchParams();
  const urlProductId = searchParams.get('productId');
  const urlAction = searchParams.get('action');

  // Pestañas principales de navegación estilo Plai.io
  const [activeMainTab, setActiveMainTab] = useState<'home' | 'advertise' | 'creative' | 'connect'>('home');
  
  // Canal y producto seleccionados para la creación
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canal por defecto (WhatsApp Message Ads)
  const defaultWhatsAppChannel: ChannelItem = {
    id: 'whatsapp_messages',
    name: 'Message Ads (WhatsApp)',
    category: 'Meta & WhatsApp',
    description: 'Anuncio en FB e IG con botón directo a WhatsApp atendido por tu Agente IA.',
    badge: 'Recomendado CRM',
    iconName: '💬',
    bgGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    previewType: 'meta_feed',
  };

  // Cargar productos del CRM / Fábrica de Agentes
  useEffect(() => {
    async function loadProducts() {
      if (!account?.id) return;
      setLoadingProducts(true);
      try {
        const res = await fetch(`/api/adflow/products?accountId=${account.id}`);
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
          
          // Si viene un productId en la URL desde el botón de la sección de Productos de Claude:
          if (urlProductId) {
            const found = data.products.find((p: ProductItem) => p.id === urlProductId);
            if (found) {
              setSelectedProductId(found.id);
              setSelectedChannel(defaultWhatsAppChannel);
              setActiveMainTab('advertise');
              setToastMessage(`Producto "${found.name}" cargado automáticamente desde tu catálogo.`);
              setTimeout(() => setToastMessage(null), 4000);
              return;
            }
          }

          setSelectedProductId(data.products[0].id);
        } else {
          // Si no hay productos aún en la base de datos, proveer uno de demostración
          setProducts([
            {
              id: 'demo-prod-1',
              name: 'Residencia en Preventa Zibatá',
              short_description: 'Exclusiva casa de 3 recámaras con jardín privado y amenidades premium.',
              irresistible_offer: 'Bono de escrituración gratis de $100,000 MXN firmando este mes.',
              target_triggers: 'Familias buscando seguridad, plusvalía y espacios amplios en Querétaro.',
              price_range: '$4,250,000 MXN',
              agent_name: 'Sofía (Setter Inmobiliaria)',
            },
          ]);
          setSelectedProductId('demo-prod-1');
        }
      } catch (err) {
        console.error('Error cargando productos:', err);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, [account?.id, urlProductId]);

  const handleSelectChannel = (channel: ChannelItem) => {
    setSelectedChannel(channel);
    setActiveMainTab('advertise');
  };

  const handleLaunchSuccess = () => {
    setSelectedChannel(null);
    setActiveMainTab('home');
    setToastMessage('¡Campaña lanzada con éxito y activa en redes! 🎉');
    setTimeout(() => setToastMessage(null), 5000);
  };

  if (accountLoading) {
    return <div className="p-8 text-xs font-semibold text-ink-soft">Cargando AdFlow...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast de Éxito */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* HEADER PRINCIPAL CON NAVEGACIÓN ESTILO PLAI.IO */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              📢
            </div>
            <h1 className="text-2xl font-black text-ink tracking-tight">AdFlow</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Smart Ads IA
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            Lanza campañas publicitarias en Meta, TikTok y Google en 60 segundos alimentadas por tu Fábrica de Agentes.
          </p>
        </div>

        {/* 4 PESTAÑAS DE NAVEGACIÓN SUPERIOR */}
        <div className="flex items-center gap-1 p-1 bg-card border border-line rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => {
              setActiveMainTab('home');
              setSelectedChannel(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'home'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-soft'
            }`}
          >
            <Home size={14} /> Inicio
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('advertise');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'advertise'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-soft'
            }`}
          >
            <Megaphone size={14} /> Anunciar
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('creative');
              setSelectedChannel(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'creative'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-soft'
            }`}
          >
            <Wand2 size={14} /> Creative Hub
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('connect');
              setSelectedChannel(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === 'connect'
                ? 'bg-primary text-white shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-soft'
            }`}
          >
            <Link2 size={14} /> Conectar Redes
          </button>
        </div>
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
      {activeMainTab === 'home' && (
        <AdFlowDashboard
          onStartNewAd={() => {
            setActiveMainTab('advertise');
            setSelectedChannel(null);
          }}
        />
      )}

      {activeMainTab === 'advertise' && (
        <>
          {selectedChannel ? (
            <AdFlowSingleOverview
              channel={selectedChannel}
              products={products}
              selectedProductId={selectedProductId}
              onSelectProduct={setSelectedProductId}
              onBackToLobby={() => setSelectedChannel(null)}
              onLaunchSuccess={handleLaunchSuccess}
            />
          ) : (
            <AdChannelsLobby onSelectChannel={handleSelectChannel} />
          )}
        </>
      )}

      {activeMainTab === 'creative' && <CreativeHubView />}

      {activeMainTab === 'connect' && <ConnectPlatformsView />}
    </div>
  );
}

export default function AdFlowPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs font-semibold text-ink-soft">Cargando AdFlow...</div>}>
      <AdFlowContent />
    </Suspense>
  );
}
