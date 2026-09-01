'use client';

/**
 * Configuración del pipeline: renombrar las 5 etapas de la subcuenta activa.
 * (Estructura, colores y "ganado/perdido" son fijos; solo cambia el nombre.)
 */

import { useEffect, useState } from 'react';
import { useActiveAccount } from '@/core/account/activeAccount';
import { stagesService, type StageRow } from '@/modules/crm/services/stagesService';

export function PipelineStagesSettings() {
  const { account } = useActiveAccount();
  const [stages, setStages] = useState<StageRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; x: string } | null>(null);

  useEffect(() => {
    if (!account) return;
    let mounted = true;
    stagesService
      .list(account.id)
      .then((s) => mounted && setStages(s))
      .catch(() => mounted && setStages([]));
    return () => {
      mounted = false;
    };
  }, [account?.id]);

  const setName = (id: string, name: string) =>
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await Promise.all(stages.map((s) => stagesService.rename(s.id, s.name.trim() || 'Etapa')));
      setMsg({ t: 'ok', x: 'Etapas guardadas. Se reflejan al volver al CRM.' });
    } catch (e) {
      setMsg({ t: 'err', x: e instanceof Error ? e.message : 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-bold text-gray-900">
        <span className="mr-3 inline-block rounded bg-indigo-100 px-3 py-1 text-indigo-600">≡</span>
        Etapas del pipeline
      </h2>
      <p className="mt-2 mb-4 text-sm text-gray-600">
        Renombra las 5 etapas según tu proceso de venta. (El orden y "ganado/perdido" se mantienen.)
      </p>

      {msg && (
        <div className={`mb-4 rounded p-3 text-sm ${msg.t === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.x}
        </div>
      )}

      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm font-bold text-gray-400">{i + 1}</span>
            <input
              value={s.name}
              onChange={(e) => setName(s.id, e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {s.is_won && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">ganado</span>}
            {s.is_lost && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">perdido</span>}
          </div>
        ))}
        {stages.length === 0 && <p className="text-sm text-gray-500">No hay etapas para esta subcuenta.</p>}
      </div>

      <button
        onClick={save}
        disabled={saving || stages.length === 0}
        className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar etapas'}
      </button>
    </div>
  );
}
