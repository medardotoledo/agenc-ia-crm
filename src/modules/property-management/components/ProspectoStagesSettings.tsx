'use client';

/**
 * Renombra las 4 etapas del pipeline de prospectos inmobiliarios.
 * Guarda los labels en account_settings.lead_stage_labels (JSONB).
 * Idéntico en UX a PipelineStagesSettings del CRM.
 */

import { useEffect, useState } from 'react';
import { useActiveAccount } from '@/core/account/activeAccount';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost';

const DEFAULT_LABELS: Record<LeadStatus, string> = {
  new:       'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  lost:      'Perdido',
};

const STATUS_DOTS: Record<LeadStatus, string> = {
  new:       'bg-primary',
  contacted: 'bg-blue-500',
  qualified: 'bg-emerald-500',
  lost:      'bg-red-500',
};

const ALL_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'lost'];

export function ProspectoStagesSettings() {
  const { account } = useActiveAccount();
  const [labels, setLabels] = useState<Record<LeadStatus, string>>({ ...DEFAULT_LABELS });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; x: string } | null>(null);

  useEffect(() => {
    if (!account) return;
    const supabase = createBrowserSupabaseClient();
    supabase
      .from('account_settings')
      .select('lead_stage_labels')
      .eq('account_id', account.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.lead_stage_labels) {
          setLabels({ ...DEFAULT_LABELS, ...(data.lead_stage_labels as Record<LeadStatus, string>) });
        }
      });
  }, [account?.id]);

  const save = async () => {
    if (!account) return;
    setSaving(true);
    setMsg(null);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from('account_settings')
      .upsert({ account_id: account.id, lead_stage_labels: labels });
    if (error) {
      setMsg({ t: 'err', x: error.message });
    } else {
      setMsg({ t: 'ok', x: 'Etapas guardadas. Se reflejan en la bandeja de prospectos.' });
    }
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-bold text-gray-900">
        <span className="mr-3 inline-block rounded bg-primary/10 px-3 py-1 text-primary">≡</span>
        Etapas de prospectos
      </h2>
      <p className="mt-2 mb-4 text-sm text-gray-600">
        Renombra las 4 etapas del pipeline de prospectos inmobiliarios.
      </p>

      {msg && (
        <div className={`mb-4 rounded p-3 text-sm ${
          msg.t === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.x}
        </div>
      )}

      <div className="space-y-2">
        {ALL_STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${STATUS_DOTS[s]} shrink-0`} />
            <span className="w-24 text-xs text-gray-400">{DEFAULT_LABELS[s]}</span>
            <input
              value={labels[s]}
              onChange={(e) => setLabels((prev) => ({ ...prev, [s]: e.target.value }))}
              placeholder={DEFAULT_LABELS[s]}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar etapas'}
      </button>
    </div>
  );
}
