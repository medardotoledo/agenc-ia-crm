'use client';

/**
 * PANEL DE AGENCIA (solo dueño de agencia / super_admin)
 * - Crear y listar subcuentas (inmobiliarias) + activar módulos.
 * - Por subcuenta: crear y listar usuarios con rol + permisos por módulo
 *   + "solo datos asignados" (estilo GoHighLevel).
 */

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useActiveAccount } from '@/core/account/activeAccount';
import { ALL_MODULES } from '@/core/modules/registry';

interface SubAccount { id: string; name: string; subdomain: string; modules: string[] }
interface TeamUser { id: string; name: string; email: string; role: string; only_assigned_data: boolean }

async function authedFetch(path: string, opts: RequestInit = {}) {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
}

export default function AgencyPage() {
  const { isAgency, loading: accLoading } = useActiveAccount();

  const [subs, setSubs] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; x: string } | null>(null);

  // Form: nueva subcuenta
  const [newName, setNewName] = useState('');
  const [newModules, setNewModules] = useState<string[]>(['crm', 'inmobiliario']);
  const [creating, setCreating] = useState(false);

  // Subcuenta seleccionada + sus usuarios
  const [selected, setSelected] = useState<SubAccount | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);

  // Form: nuevo usuario
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRole, setURole] = useState<'admin' | 'agent'>('agent');
  const [uOnlyAssigned, setUOnlyAssigned] = useState(true);
  const [uPerms, setUPerms] = useState<Record<string, boolean>>({});
  const [savingUser, setSavingUser] = useState(false);

  async function loadSubs() {
    setLoading(true);
    const r = await authedFetch('/api/agency/sub-accounts');
    const d = await r.json();
    if (r.ok) setSubs(d.subAccounts || []);
    else setMsg({ t: 'err', x: d.error || 'Error al cargar subcuentas' });
    setLoading(false);
  }

  useEffect(() => {
    if (!accLoading && isAgency) loadSubs();
    else if (!accLoading) setLoading(false);
  }, [accLoading, isAgency]);

  async function createSub(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    const r = await authedFetch('/api/agency/sub-accounts', {
      method: 'POST',
      body: JSON.stringify({ name: newName, modules: newModules }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg({ t: 'ok', x: `Subcuenta "${newName}" creada` });
      setNewName('');
      loadSubs();
    } else {
      setMsg({ t: 'err', x: d.error || 'No se pudo crear' });
    }
    setCreating(false);
  }

  async function openSub(s: SubAccount) {
    setSelected(s);
    setUsers([]);
    const r = await authedFetch(`/api/agency/users?accountId=${s.id}`);
    const d = await r.json();
    if (r.ok) setUsers(d.users || []);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingUser(true);
    setMsg(null);
    const r = await authedFetch('/api/agency/users', {
      method: 'POST',
      body: JSON.stringify({
        accountId: selected.id,
        name: uName,
        email: uEmail,
        password: uPass,
        role: uRole,
        only_assigned_data: uRole === 'agent' ? uOnlyAssigned : false,
        permissions: uRole === 'agent' ? uPerms : {},
      }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg({ t: 'ok', x: `Usuario ${uEmail} creado en ${selected.name}` });
      setUName(''); setUEmail(''); setUPass(''); setUPerms({});
      openSub(selected);
    } else {
      setMsg({ t: 'err', x: d.error || 'No se pudo crear el usuario' });
    }
    setSavingUser(false);
  }

  if (accLoading || loading) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!isAgency) return <div className="p-8 text-ink-soft">Solo el dueño de agencia tiene acceso a este panel.</div>;

  // Permisos disponibles para el formulario de usuario: de los módulos activos de la subcuenta.
  const activeModuleManifests = ALL_MODULES.filter((m) => selected?.modules.includes(m.key));

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Agencia · Subcuentas</h1>
        <p className="mt-1 text-sm text-ink-soft">Crea inmobiliarias (subcuentas), activa sus módulos y administra sus usuarios.</p>
      </div>

      {msg && (
        <div className={`rounded-lg border p-3 text-sm ${msg.t === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg.x}
        </div>
      )}

      {/* Crear subcuenta */}
      <form onSubmit={createSub} className="rounded-xl border border-line bg-app p-5 space-y-3">
        <h2 className="font-semibold text-ink">Nueva subcuenta</h2>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la inmobiliaria (ej: Inmobiliaria del Sur)"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          required
        />
        <div className="flex flex-wrap gap-4">
          {ALL_MODULES.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={newModules.includes(m.key)}
                onChange={(e) =>
                  setNewModules((prev) => (e.target.checked ? [...prev, m.key] : prev.filter((k) => k !== m.key)))
                }
              />
              {m.name}
            </label>
          ))}
        </div>
        <button disabled={creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse disabled:opacity-50">
          {creating ? 'Creando...' : '+ Crear subcuenta'}
        </button>
      </form>

      {/* Lista de subcuentas */}
      <div className="space-y-2">
        <h2 className="font-semibold text-ink">Subcuentas ({subs.length})</h2>
        {subs.length === 0 && <p className="text-sm text-ink-soft">Aún no hay subcuentas.</p>}
        {subs.map((s) => (
          <div key={s.id} className={`flex items-center justify-between rounded-lg border p-3 ${selected?.id === s.id ? 'border-primary bg-soft' : 'border-line'}`}>
            <div>
              <div className="font-medium text-ink">{s.name}</div>
              <div className="text-xs text-ink-soft">{s.subdomain} · módulos: {s.modules.join(', ') || '—'}</div>
            </div>
            <button onClick={() => openSub(s)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-soft">
              Usuarios
            </button>
          </div>
        ))}
      </div>

      {/* Usuarios de la subcuenta seleccionada */}
      {selected && (
        <div className="rounded-xl border border-line bg-app p-5 space-y-4">
          <h2 className="font-semibold text-ink">Usuarios de {selected.name}</h2>

          <div className="space-y-1">
            {users.length === 0 && <p className="text-sm text-ink-soft">Sin usuarios todavía.</p>}
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-soft px-3 py-2 text-sm">
                <span className="text-ink">{u.name} · <span className="text-ink-soft">{u.email}</span></span>
                <span className="text-xs font-semibold text-primary">{u.role}{u.only_assigned_data ? ' · solo asignados' : ''}</span>
              </div>
            ))}
          </div>

          <form onSubmit={createUser} className="space-y-3 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">Nuevo usuario</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="Nombre" className="rounded-lg border border-line px-3 py-2 text-sm" required />
              <input value={uEmail} onChange={(e) => setUEmail(e.target.value)} type="email" placeholder="Email (su login)" className="rounded-lg border border-line px-3 py-2 text-sm" required />
              <input value={uPass} onChange={(e) => setUPass(e.target.value)} type="text" placeholder="Contraseña temporal (mín 6)" className="rounded-lg border border-line px-3 py-2 text-sm" required />
              <select value={uRole} onChange={(e) => setURole(e.target.value as 'admin' | 'agent')} className="rounded-lg border border-line px-3 py-2 text-sm">
                <option value="agent">Agente</option>
                <option value="admin">Admin (de la subcuenta)</option>
              </select>
            </div>

            {uRole === 'agent' && (
              <div className="space-y-2 rounded-lg bg-soft p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input type="checkbox" checked={uOnlyAssigned} onChange={(e) => setUOnlyAssigned(e.target.checked)} />
                  Ver solo los datos asignados a él/ella (Only Assigned Data)
                </label>
                {activeModuleManifests.map((m) => (
                  <div key={m.key}>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{m.name}</div>
                    <div className="flex flex-wrap gap-3">
                      {m.permissions.map((p) => (
                        <label key={p.key} className="flex items-center gap-1.5 text-xs text-ink-soft">
                          <input
                            type="checkbox"
                            checked={!!uPerms[p.key]}
                            onChange={(e) => setUPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button disabled={savingUser} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse disabled:opacity-50">
              {savingUser ? 'Creando...' : '+ Crear usuario'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
