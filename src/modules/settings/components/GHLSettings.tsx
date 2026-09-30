'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface GHLSettingsProps {
  accountId: string;
}

export function GHLSettings({ accountId }: GHLSettingsProps) {
  const [locationId, setLocationId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [reminderHours, setReminderHours] = useState(1);
  const [escalationHours, setEscalationHours] = useState(24);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    if (!accountId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('accounts')
        .select('ghl_location_id, ghl_api_key, agent_notify_email, agent_email_from, agent_reminder_hours, agent_escalation_hours')
        .eq('id', accountId)
        .maybeSingle();
      if (!mounted || !data) return;
      setLocationId((data.ghl_location_id as string) || '');
      setApiKey((data.ghl_api_key as string) || '');
      setNotifyEmail((data.agent_notify_email as string) || '');
      setEmailFrom((data.agent_email_from as string) || '');
      setReminderHours(data.agent_reminder_hours || 1);
      setEscalationHours(data.agent_escalation_hours || 24);
    })();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          ghl_location_id: locationId.trim() || null,
          ghl_api_key: apiKey.trim() || null,
          agent_notify_email: notifyEmail.trim() || null,
          agent_email_from: emailFrom.trim() || null,
          agent_reminder_hours: Number(reminderHours) || 1,
          agent_escalation_hours: Number(escalationHours) || 24,
        })
        .eq('id', accountId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Configuración del Pipeline Agent y GoHighLevel guardada exitosamente.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al guardar configuración',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncPipelines = async () => {
    if (!accountId) return;
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/ghl/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          action: 'pipeline.sync',
          payload: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar con GHL');
      setMessage({ type: 'success', text: '¡Pipelines y etapas sincronizados con éxito desde GoHighLevel!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error en la sincronización' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          <span className="inline-block bg-green-100 text-green-600 px-3 py-1 rounded mr-3">
            🤖
          </span>
          GoHighLevel & Pipeline Agent
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Vincular esta subcuenta con GoHighLevel y configurar las reglas de auditoría y escalación del Agente IA.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location ID (ID de Subcuenta GHL)
          </label>
          <input
            type="text"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="e.g. ve9EPM428h8vShlRW1KT"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            GHL → Settings → Business Profile → General Info → Location ID.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Private Integration Token (API Key de GHL)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            GHL → Settings → Private Integrations → Create Access Token.
          </p>
        </div>

        <hr className="my-4 border-gray-200" />
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          ⚙️ Reglas de Auditoría y Fiscalización
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo del Dueño / Gerente (Escalaciones)
          </label>
          <input
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            placeholder="dueno@inmobiliaria.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            El Agente enviará alertas rojas a este correo cuando un vendedor ignore llamadas o tareas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recordatorio a Asesor (Horas)
            </label>
            <input
              type="number"
              min="1"
              max="72"
              value={reminderHours}
              onChange={(e) => setReminderHours(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Horas tras vencer tarea antes de avisar al vendedor.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Escalación al Dueño (Horas)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={escalationHours}
              onChange={(e) => setEscalationHours(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Horas de omisión antes de escalar al dueño.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50 text-sm"
          >
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>

          <button
            type="button"
            onClick={handleSyncPipelines}
            disabled={isSyncing || !locationId}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition disabled:opacity-50 text-sm border border-gray-300"
          >
            {isSyncing ? 'Sincronizando...' : '🔄 Sincronizar Pipelines'}
          </button>
        </div>
      </form>
    </div>
  );
}
