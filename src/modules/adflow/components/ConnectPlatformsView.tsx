'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, AlertCircle, ExternalLink, 
  RefreshCw, Zap, ShieldCheck, Trash2, Loader2,
  Key, Sparkles, HelpCircle
} from 'lucide-react';
import { useActiveAccount } from '@/core/account/activeAccount';

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
  const { account } = useActiveAccount();
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [data, setData] = useState<ZernioStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoToast, setInfoToast] = useState<string | null>(null);

  // Soporte para clave personalizada de cliente / subcuenta
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [hasCustomKey, setHasCustomKey] = useState(false);

  const storageKey = `zernio_custom_key_${account?.id || 'default'}`;

  const getActiveHeaders = useCallback((): HeadersInit => {
    const custom = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    const headers: Record<string, string> = {};
    if (custom && custom.trim()) {
      headers['x-zernio-api-key'] = custom.trim();
    }
    return headers;
  }, [storageKey]);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/adflow/zernio?action=status', {
        headers: getActiveHeaders(),
      });
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
  }, [getActiveHeaders]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCustomKeyInput(stored);
        setHasCustomKey(true);
      } else {
        setCustomKeyInput('');
        setHasCustomKey(false);
      }
    }
    fetchStatus();
  }, [account?.id, storageKey, fetchStatus]);

  const handleSaveCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKeyInput.trim()) {
      localStorage.removeItem(storageKey);
      setHasCustomKey(false);
      setInfoToast('Usando API Key global del servidor.');
    } else {
      localStorage.setItem(storageKey, customKeyInput.trim());
      setHasCustomKey(true);
      setInfoToast('API Key personalizada guardada para esta subcuenta.');
    }
    setShowKeyConfig(false);
    setTimeout(() => setInfoToast(null), 3500);
    fetchStatus();
  };

  const handleRemoveCustomKey = () => {
    localStorage.removeItem(storageKey);
    setCustomKeyInput('');
    setHasCustomKey(false);
    setInfoToast('Restablecida la API Key global del servidor.');
    setTimeout(() => setInfoToast(null), 3500);
    fetchStatus();
  };

  const handleConnect = async (platform: 'meta' | 'google' | 'tiktok') => {
    try {
      setConnectingPlatform(platform);
      setError(null);

      const redirectUrl = `${window.location.origin}/admin/adflow?tab=connect&connected=${platform}`;
      const res = await fetch(
        `/api/adflow/zernio?action=connect&platform=${platform}&redirectUrl=${encodeURIComponent(redirectUrl)}`,
        {
          headers: getActiveHeaders(),
        }
      );
      const resData = await res.json();

      if (!res.ok || !resData.authUrl) {
        throw new Error(resData.error || 'No se pudo generar la URL de autenticación');
      }

      setInfoToast(`Abriendo ventana de inicio de sesión seguro para ${platform.toUpperCase()}...`);
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
        headers: getActiveHeaders(),
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

      {/* BANNER EDUCATIVO: TIER GRATIS DE 2 CUENTAS PARA CLIENTES */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl p-2 bg-emerald-500/10 rounded-2xl shrink-0">🎁</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                Plan Gratuito Zernio: Hasta 2 Cuentas $0 USD/mes
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Sin tarjeta
              </span>
            </div>
            <p className="text-ink-soft text-[11px] mt-0.5 leading-relaxed">
              Cada cliente o negocio puede abrir su cuenta gratuita en Zernio, vincular sus redes (ej. Facebook Ads) y colocar su propia API Key sin generar costo para la agencia.
            </p>
          </div>
        </div>

        <a
          href="https://zernio.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-all shadow-xs"
        >
          Crear cuenta en Zernio <ExternalLink size={12} />
        </a>
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
      <div className="p-5 rounded-3xl border border-line bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                {hasCustomKey && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Clave de Cliente
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
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-line bg-soft hover:bg-line text-ink flex items-center gap-1.5 transition-colors"
            >
              <Key size={13} />
              {showKeyConfig ? 'Cerrar Ajustes' : 'Configurar Clave Propia'}
            </button>
          </div>
        </div>

        {/* Panel Desplegable para que el cliente ingrese su propia API Key de Zernio */}
        {showKeyConfig && (
          <form onSubmit={handleSaveCustomKey} className="p-4 rounded-2xl bg-soft/60 border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" /> API Key Personalizada de Zernio (Subcuenta: {account?.name || 'Actual'})
              </span>
              {hasCustomKey && (
                <button
                  type="button"
                  onClick={handleRemoveCustomKey}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  Restablecer a Clave de Agencia
                </button>
              )}
            </div>
            <p className="text-[11px] text-ink-soft">
              Pega aquí la API Key generada desde tu cuenta personal de Zernio (`sk_...`). Las campañas y conexiones se asociarán a tu propia cuenta gratuita.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="sk_ea31e60..."
                className="flex-1 text-xs font-mono rounded-xl border border-line bg-card p-2.5 text-ink focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                Guardar Clave
              </button>
            </div>
          </form>
        )}
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
