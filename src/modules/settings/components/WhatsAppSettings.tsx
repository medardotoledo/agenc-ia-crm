'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, CheckCircle2, AlertCircle, Smartphone, Trash2 } from 'lucide-react';

interface WhatsAppSettingsProps {
  accountId: string;
}

export function WhatsAppSettings({ accountId }: WhatsAppSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'connected' | 'qr_ready' | 'disconnected' | 'loading'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    const effectiveId = accountId || 'default-account';
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/instance?accountId=${effectiveId}`);
      const data = await res.json();

      if (data.status === 'connected') {
        setStatus('connected');
        setQrCode(null);
      } else if (data.status === 'qr_ready' && data.qrcode) {
        setStatus('qr_ready');
        setQrCode(data.qrcode);
        setPairingCode(data.pairingCode || null);
      } else {
        setStatus('disconnected');
        setQrCode(null);
        if (data.error) setError(data.error);
        else if (data.debug_error) setError(`Error interno: ${data.debug_error}`);
      }
    } catch (err: any) {
      setError(err.message || 'Error conectando con el servicio de WhatsApp');
      setStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Seguro que deseas desconectar esta sesión de WhatsApp?')) return;
    setLoading(true);
    try {
      await fetch(`/api/whatsapp/instance?accountId=${accountId}`, { method: 'DELETE' });
      await checkStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Polling cada 8 segundos si está esperando escanear el QR
    const interval = setInterval(() => {
      if (status === 'qr_ready') {
        checkStatus();
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [accountId, status]);

  return (
    <div className="bg-white rounded-xl border border-line p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">WhatsApp Multi-Tenant (QR)</h2>
            <p className="text-xs text-ink-soft">Conecta tu número personal o comercial escaneando el código QR</p>
          </div>
        </div>

        <button
          onClick={checkStatus}
          disabled={loading}
          className="p-2 rounded-lg text-ink-soft hover:bg-soft transition disabled:opacity-50"
          title="Actualizar estado"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status === 'connected' ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-emerald-900">WhatsApp Conectado y Activo</h4>
              <p className="text-xs text-emerald-700">
                Tu sesión está sincronizada. Tu agente de IA y el CRM están listos para recibir y responder mensajes.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={async () => {
                const phone = prompt('Ingresa el número a donde enviar la prueba (incluye código de país sin el +, ej: 5215500000000):');
                if (!phone) return;
                setLoading(true);
                try {
                  const effectiveId = accountId || 'default-account';
                  const res = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      instanceName: `wa_${effectiveId.replace(/[^a-zA-Z0-9]/g, '_')}`,
                      number: phone,
                      text: '¡Hola! Este es un mensaje de prueba desde CRM Agentico. 🤖✨'
                    })
                  });
                  if (!res.ok) throw new Error(await res.text());
                  alert('¡Mensaje enviado con éxito!');
                } catch(e: any) {
                  alert('Error al enviar: ' + e.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg transition"
            >
              Probar Mensaje
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Desconectar WhatsApp
            </button>
          </div>
        </div>
      ) : status === 'qr_ready' && qrCode ? (
        <div className="flex flex-col items-center justify-center p-4 bg-soft rounded-xl border border-line space-y-4">
          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-ink flex items-center justify-center gap-1.5">
              <Smartphone className="w-4 h-4 text-green-600" />
              Escanea el Código QR
            </h4>
            <p className="text-xs text-ink-soft max-w-sm">
              Abre WhatsApp en tu celular ➡️ Ajustes / Configuración ➡️ Dispositivos vinculados ➡️ Vincular un dispositivo.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl shadow-md border border-line">
            <img
              src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
              alt="Código QR de WhatsApp"
              className="w-56 h-56 object-contain"
            />
          </div>

          {pairingCode && (
            <p className="text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-line text-ink">
              Código de emparejamiento: <strong>{pairingCode}</strong>
            </p>
          )}

          <p className="text-[11px] text-ink-soft animate-pulse flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-green-600" />
            Esperando escaneo desde tu teléfono...
          </p>
        </div>
      ) : (
        <div className="text-center py-6 space-y-3">
          <p className="text-xs text-ink-soft">No hay ninguna sesión de WhatsApp vinculada a esta subcuenta.</p>
          <button
            onClick={checkStatus}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            Generar Código QR para Vincular
          </button>
        </div>
      )}
    </div>
  );
}
