/**
 * ════════════════════════════════════════════════════════════════
 * EASYBROKER SETTINGS COMPONENT
 * ════════════════════════════════════════════════════════════════
 * Panel para configurar credenciales de EasyBroker y sincronizar
 *
 * Replicado desde el WordPress que creamos anteriormente
 */

'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface EasyBrokerSettingsProps {
  accountId: string;
}

export function EasyBrokerSettings({ accountId }: EasyBrokerSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importLimit, setImportLimit] = useState(3);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);

  const supabase = createBrowserSupabaseClient();

  // Cargar la configuración guardada de esta subcuenta (prefill).
  useEffect(() => {
    if (!accountId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('agency_settings')
        .select('easybroker_api_key, easybroker_sync_enabled')
        .eq('account_id', accountId)
        .maybeSingle();
      if (!mounted || !data) return;
      setApiKey((data.easybroker_api_key as string) || '');
      setSyncEnabled(Boolean(data.easybroker_sync_enabled));
    })();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Persiste por subcuenta en agency_settings (upsert por account_id).
      const { error } = await supabase.from('agency_settings').upsert(
        {
          account_id: accountId,
          easybroker_api_key: apiKey.trim() || null,
          easybroker_sync_enabled: syncEnabled,
        },
        { onConflict: 'account_id' }
      );

      if (error) throw error;

      setMessage({ type: 'success', text: 'Ajustes guardados correctamente' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al guardar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportProperties = async () => {
    setIsImporting(true);
    setProgress(0);
    setMessage(null);

    try {
      const response = await fetch('/api/easybroker/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, apiKey, limit: importLimit }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }

      const result = await response.json();
      setProgress(100);
      setMessage({
        type: 'success',
        text: `✅ ${result.imported} propiedades importadas correctamente`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al importar',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Encabezado */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          <span className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded mr-3">
            E
          </span>
          EasyBroker
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Sincronización automática al publicar propiedades
        </p>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSaveSettings} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Pega tu API Key de EasyBroker aquí"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            EasyBroker → Ajustes → API → copiar tu API Key.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="syncEnabled"
            checked={syncEnabled}
            onChange={(e) => setSyncEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="syncEnabled" className="text-sm font-medium text-gray-700">
            Activa — sincronizar automáticamente al publicar
          </label>
        </div>

        {syncEnabled && (
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            ℹ️ Cada propiedad publicada se enviará a EasyBroker con estado{' '}
            <code className="bg-white px-1 rounded">not_published</code>.
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar Ajustes'}
        </button>
      </form>

      {/* Botón Importar */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-3">
          Importar desde EasyBroker
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Haz clic abajo para descargar todas las propiedades de tu cuenta y
          asignarlas automáticamente a tus asesores en WordPress. Las fotos se
          convertirán automáticamente a WebP optimizado y se procesarán por
          lotes para evitar límites de tiempo.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cuántas propiedades importar (para pruebas)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={importLimit}
            onChange={(e) => setImportLimit(Number(e.target.value))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Empieza con 2-3 para validar. Máx 50 por importación.
          </p>
        </div>

        {isImporting && progress < 100 && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">Sincronizando...</p>
          </div>
        )}

        <button
          onClick={handleImportProperties}
          disabled={isImporting || !apiKey}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isImporting ? 'Sincronizando...' : 'Iniciar Sincronización Masiva'}
        </button>
      </div>
    </div>
  );
}
