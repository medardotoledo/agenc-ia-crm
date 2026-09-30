'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertCircle, ExternalLink, 
  RefreshCw, Zap, ShieldCheck, Trash2, Loader2 
} from 'lucide-react';

interface PlatformAccount {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  platform?: string;
  accountUsernames?: string[];
  [key: string]: any;
}

interface PlatformStatus {
  connected: boolean;
  account: PlatformAccount | null;
}

interface ZernioStatusResponse {
  configured: boolean;
  apiKeyMasked?: string;
  profileId?: string;
  hasAnalyticsAccess?: boolean;
  accounts?: any[];
  status?: {
    meta: PlatformStatus;
    google: PlatformStatus;
    tiktok: PlatformStatus;
  };
  error?: string;
}

export default function ConnectPlatformsView() {
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [data, setData] = useState<ZernioStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoToast, setInfoToast] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/adflow/zernio?action=status');
      const json: ZernioStatusResponse = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al consultar Zernio API');
      }
      setData(json);
    } catch (err: any) {
      console.error('Error fetching Zernio status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async (platform: 'meta' | 'google' | 'tiktok') => {
    try {
      setConnectingPlatform(platform);
      setError(null);

      const redirectUrl = `${window.location.origin}/admin/adflow?tab=connect&connected=${platform}`;
      const res = await fetch(
        `/api/adflow/zernio?action=connect&platform=${platform}&redirectUrl=${encodeURIComponent(redirectUrl)}`
      );
      const resData = await res.json();

      if (!res.ok || !resData.authUrl) {
        throw new Error(resData.error || 'No se pudo generar la URL de autenticación');
      }

      setInfoToast(`Abriendo ventana de autorización segura para ${platform.toUpperCase()}...`);
      setTimeout(() => setInfoToast(null), 5000);

      // Abrir en ventana emergente (popup)
      const width = 640;
      const height = 720;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        resData.authUrl,
        `ZernioConnect_${platform}`,
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
      );

      // Monitorear si la ventana se cerró para refrescar automáticamente
      if (popup) {
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setConnectingPlatform(null);
            fetchStatus();
          }
        }, 1200);
      } else {
        // Si el navegador bloqueó el popup, redirigir en la misma pestaña
        window.location.href = resData.authUrl;
      }
    } catch (err: any) {
      console.error('Error connecting platform:', err);
      setError(err.message);
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('¿Estás seguro de que deseas desconectar esta cuenta publicitaria?')) return;
    try {
      setDisconnectingId(accountId);
      const res = await fetch(`/api/adflow/zernio?accountId=${accountId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al desconectar');
      }
      setInfoToast('Cuenta desconectada exitosamente.');
      setTimeout(() => setInfoToast(null), 3000);
      await fetchStatus();
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      setError(err.message);
    } finally {
      setDisconnectingId(null);
    }
  };

  const meta = data?.status?.meta;
  const google = data?.status?.google;
  const tiktok = data?.status?.tiktok;

  return (
    <div className="max-w-4xl space-y-6 text-left">
      {/* Encabezado y Estado de Zernio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            🔗 Canales Publicitarios (Zernio Unified Ads API)
          </h2>
          <p className="text-xs text-ink-soft">
            Conecta tus cuentas publicitarias con 1 clic. Zernio gestiona los tokens OAuth, APIs y permisos de Meta, Google y TikTok.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-card hover:bg-soft text-ink text-xs font-semibold shadow-2xs transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Notificación Toast informativa */}
      {infoToast && (
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{infoToast}</span>
        </div>
      )}

      {/* Tarjeta de Orquestador Zernio API */}
      <div className="p-5 rounded-3xl border border-line bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Orquestador Zernio Ads API</h3>
              {data?.configured ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Activo & Certificado
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Pendiente de Clave
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">
              Profile ID: <code className="text-ink font-mono text-[10px]">{data?.profileId || '6a1a...14a'}</code>
              {data?.apiKeyMasked && (
                <> • Key: <code className="text-ink font-mono text-[10px]">{data.apiKeyMasked}</code></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 bg-emerald-50/50 px-2.5 py-1 rounded-xl border border-emerald-100">
            <ShieldCheck size={13} /> Multi-Red Sync
          </span>
        </div>
      </div>

      {/* Grid de Redes Publicitarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* 1. META ADS (FACEBOOK & INSTAGRAM) */}
        <div className="p-5 rounded-3xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">👥</span>
              {meta?.connected ? (
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

            {meta?.connected && meta.account ? (
              <div className="p-2.5 rounded-xl bg-soft text-[11px] space-y-0.5 border border-line">
                <div className="text-ink-soft">Cuenta: <strong className="text-ink">{meta.account.name || meta.account.username || 'Cuenta Meta'}</strong></div>
                <div className="text-ink-soft">ID: <code className="text-[10px] text-ink">{meta.account._id || meta.account.id || 'act_active'}</code></div>
              </div>
            ) : (
              <p className="text-[11px] text-ink-soft/80 italic">
                Autoriza los permisos de Ads Management y WhatsApp con tu cuenta de Facebook/Meta.
              </p>
            )}
          </div>

          <div>
            {meta?.connected && meta.account ? (
              <button
                type="button"
                onClick={() => handleDisconnect(meta.account!._id || meta.account!.id!)}
                disabled={disconnectingId === (meta.account._id || meta.account.id)}
                className="w-full py-2 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5"
              >
                {disconnectingId === (meta.account._id || meta.account.id) ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Desconectar Meta
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleConnect('meta')}
                disabled={connectingPlatform === 'meta'}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {connectingPlatform === 'meta' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ExternalLink size={13} />
                )}
                Conectar con Meta
              </button>
            )}
          </div>
        </div>

        {/* 2. GOOGLE ADS */}
        <div className="p-5 rounded-3xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🔍</span>
              {google?.connected ? (
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
              <h3 className="text-sm font-bold text-ink">Google Ads</h3>
              <p className="text-[11px] text-ink-soft mt-0.5">
                Google Search, Display y Performance Max para capturar intención de compra activa.
              </p>
            </div>

            {google?.connected && google.account ? (
              <div className="p-2.5 rounded-xl bg-soft text-[11px] space-y-0.5 border border-line">
                <div className="text-ink-soft">Cuenta: <strong className="text-ink">{google.account.name || google.account.username || 'Cuenta Google'}</strong></div>
                <div className="text-ink-soft">ID: <code className="text-[10px] text-ink">{google.account._id || google.account.id || 'act_active'}</code></div>
              </div>
            ) : (
              <p className="text-[11px] text-ink-soft/80 italic">
                Vincula tu cuenta de Google Ads mediante inicio de sesión seguro en Google.
              </p>
            )}
          </div>

          <div>
            {google?.connected && google.account ? (
              <button
                type="button"
                onClick={() => handleDisconnect(google.account!._id || google.account!.id!)}
                disabled={disconnectingId === (google.account._id || google.account.id)}
                className="w-full py-2 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5"
              >
                {disconnectingId === (google.account._id || google.account.id) ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Desconectar Google
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleConnect('google')}
                disabled={connectingPlatform === 'google'}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {connectingPlatform === 'google' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ExternalLink size={13} />
                )}
                Vincular Google Ads
              </button>
            )}
          </div>
        </div>

        {/* 3. TIKTOK ADS */}
        <div className="p-5 rounded-3xl border border-line bg-card shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🎵</span>
              {tiktok?.connected ? (
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
                TikTok Feed para video y audiencias de alta retención en pantalla vertical.
              </p>
            </div>

            {tiktok?.connected && tiktok.account ? (
              <div className="p-2.5 rounded-xl bg-soft text-[11px] space-y-0.5 border border-line">
                <div className="text-ink-soft">Cuenta: <strong className="text-ink">{tiktok.account.name || tiktok.account.username || 'Cuenta TikTok'}</strong></div>
                <div className="text-ink-soft">ID: <code className="text-[10px] text-ink">{tiktok.account._id || tiktok.account.id || 'act_active'}</code></div>
              </div>
            ) : (
              <p className="text-[11px] text-ink-soft/80 italic">
                Autoriza con TikTok Ads Manager para habilitar campañas de video nativo.
              </p>
            )}
          </div>

          <div>
            {tiktok?.connected && tiktok.account ? (
              <button
                type="button"
                onClick={() => handleDisconnect(tiktok.account!._id || tiktok.account!.id!)}
                disabled={disconnectingId === (tiktok.account._id || tiktok.account.id)}
                className="w-full py-2 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5"
              >
                {disconnectingId === (tiktok.account._id || tiktok.account.id) ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Desconectar TikTok
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleConnect('tiktok')}
                disabled={connectingPlatform === 'tiktok'}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {connectingPlatform === 'tiktok' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ExternalLink size={13} />
                )}
                Conectar TikTok Ads
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Pie de página informativo sobre el flujo autónomo */}
      <div className="p-4 rounded-2xl bg-soft/50 border border-line text-xs text-ink-soft flex items-center gap-3">
        <ShieldCheck size={18} className="text-primary shrink-0" />
        <p>
          Las credenciales de acceso se almacenan cifradas en Zernio. El CRM nunca almacena tus contraseñas personales de Facebook, Google o TikTok.
        </p>
      </div>
    </div>
  );
}
