'use client';

import { useState, useEffect } from 'react';
import { Save, Check, Key } from 'lucide-react';

export function GHLSettings({ accountId }: { accountId: string }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    fetch(/api/settings/ghl?location_id= + accountId)
      .then(res => res.json())
      .then(data => {
        if (data.token) setToken(data.token);
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  const handleSave = async () => {
    if (!token.trim() || !accountId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: accountId, access_token: token.trim() })
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Error al guardar Token de GHL');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-line p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <Key size={18} />
          </div>
          GoHighLevel
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Configura tu Private Integration Token (PIT) para conectar esta subcuenta con GoHighLevel.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            API Key (PIT Token)
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full rounded-lg border border-line bg-soft px-3 py-2 text-sm outline-none focus:border-primary focus:bg-app transition-colors"
            disabled={loading || saving}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading || saving || !token.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar Token'}
        </button>
      </div>
    </div>
  );
}
