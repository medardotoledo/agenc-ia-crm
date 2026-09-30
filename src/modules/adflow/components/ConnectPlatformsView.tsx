'use client';

import { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertCircle, 
  ExternalLink, Key, RefreshCw, Zap 
} from 'lucide-react';

export default function ConnectPlatformsView() {
  const [metaConnected, setMetaConnected] = useState(true);
  const [tiktokConnected, setTiktokConnected] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [zernioApiKey, setZernioApiKey] = useState('zn_live_9984********************');
  const [saved, setSaved] = useState(false);

  const handleSaveZernio = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          🔗 Conectar Canales Publicitarios (Zernio Unified API)
        </h2>
        <p className="text-xs text-ink-soft">
          Vincula tus cuentas publicitarias una sola vez. Zernio absorbe la rotación de tokens y permisos para que puedas lanzar campañas en 1 clic.
        </p>
      </div>

      {/* Grid de Plataformas de Anuncios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Meta Ads (Facebook & Instagram) */}
        <div className="p-5 rounded-3xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">👥</span>
              {metaConnected ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Conectado
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-soft text-ink-soft">
                  Desconectado
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-ink">Meta Ads</h3>
              <p className="text-[11px] text-ink-soft mt-0.5">
                Facebook Feed, Instagram Reels, Stories y Message Ads (WhatsApp).
              </p>
            </div>

            {metaConnected && (
              <div className="p-2.5 rounded-xl bg-soft text-[11px] space-y-0.5 border border-line">
                <div className="text-ink-soft">Cuenta: <strong className="text-ink">Toledo Marketing</strong></div>
                <div className="text-ink-soft">ID: <code className="text-[10px] text-ink">act_9482710492</code></div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMetaConnected(!metaConnected)}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
              metaConnected
                ? 'border border-line bg-app text-ink hover:bg-soft'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
            }`}
          >
            {metaConnected ? 'Desconectar' : 'Conectar con Meta'}
          </button>
        </div>

        {/* TikTok Ads */}
        <div className="p-5 rounded-3xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🎵</span>
              {tiktokConnected ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Conectado
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-soft text-ink-soft">
                  Desconectado
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-ink">TikTok Ads</h3>
              <p className="text-[11px] text-ink-soft mt-0.5">
                TikTok Feed para video y audiencias móviles en pantalla completa.
              </p>
            </div>

            {tiktokConnected && (
              <div className="p-2.5 rounded-xl bg-soft text-[11px] space-y-0.5 border border-line">
                <div className="text-ink-soft">Advertiser: <strong className="text-ink">Med Toledo</strong></div>
                <div className="text-ink-soft">ID: <code className="text-[10px] text-ink">tt_adv_204819</code></div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTiktokConnected(!tiktokConnected)}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
              tiktokConnected
                ? 'border border-line bg-app text-ink hover:bg-soft'
                : 'bg-black hover:bg-zinc-800 text-white shadow-sm'
            }`}
          >
            {tiktokConnected ? 'Desconectar' : 'Conectar TikTok'}
          </button>
        </div>

        {/* Google Ads */}
        <div className="p-5 rounded-3xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🔍</span>
              {googleConnected ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Conectado
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Pendiente
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-ink">Google Ads</h3>
              <p className="text-[11px] text-ink-soft mt-0.5">
                Google Search, Display y Performance Max para capturar intención de compra.
              </p>
            </div>

            {!googleConnected && (
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Vincula tu cuenta para activar anuncios de búsqueda patrocinada.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setGoogleConnected(!googleConnected)}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
              googleConnected
                ? 'border border-line bg-app text-ink hover:bg-soft'
                : 'bg-primary hover:bg-primary-light text-white shadow-sm'
            }`}
          >
            {googleConnected ? 'Desconectar' : 'Vincular Google Ads'}
          </button>
        </div>
      </div>

      {/* Credencial Zernio Unified API */}
      <div className="p-6 rounded-3xl border border-line bg-card shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Credencial de Servicio Zernio (Orquestador API)</h3>
            <p className="text-xs text-ink-soft">
              Zernio actúa como middleware en tu VPS para ejecutar `createStandaloneAd` en las redes sociales.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveZernio} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1">
              Zernio Live API Key
            </label>
            <input
              type="password"
              value={zernioApiKey}
              onChange={(e) => setZernioApiKey(e.target.value)}
              className="w-full text-xs font-mono rounded-xl border border-line bg-app p-2.5 text-ink focus:outline-none focus:border-primary"
              placeholder="zn_live_..."
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-emerald-600 font-semibold">
              {saved && '✓ Credencial actualizada con éxito'}
            </span>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-xs transition-all"
            >
              Guardar Credenciales
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
