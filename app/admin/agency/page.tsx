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
interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  only_assigned_data: boolean;
  permissions?: Record<string, boolean>;
}

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

  // Edición de usuario existente
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'agent'>('agent');
  const [editOnlyAssigned, setEditOnlyAssigned] = useState(false);
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});
  const [editPass, setEditPass] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);

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
    setEditingUser(null);
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

  function startEditUser(u: TeamUser) {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role === 'admin' ? 'admin' : 'agent');
    setEditOnlyAssigned(Boolean(u.only_assigned_data));
    setEditPerms(u.permissions || {});
    setEditPass('');
  }

  async function saveEditedUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !editingUser) return;
    setUpdatingUser(true);
    setMsg(null);

    const r = await authedFetch('/api/agency/users', {
      method: 'PATCH',
      body: JSON.stringify({
        accountId: selected.id,
        userId: editingUser.id,
        name: editName,
        role: editRole,
        only_assigned_data: editRole === 'agent' ? editOnlyAssigned : false,
        permissions: editRole === 'agent' ? editPerms : {},
        password: editPass.trim() || undefined,
      }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg({ t: 'ok', x: `Cambios guardados para ${editingUser.email}` });
      setEditingUser(null);
      openSub(selected);
    } else {
      setMsg({ t: 'err', x: d.error || 'Error al guardar cambios' });
    }
    setUpdatingUser(false);
  }

  async function deleteUser(u: TeamUser) {
    if (!selected) return;
    if (!confirm(`¿Eliminar al usuario ${u.name} (${u.email}) de ${selected.name}?`)) return;
    setMsg(null);
    const r = await authedFetch(`/api/agency/users?accountId=${selected.id}&userId=${u.id}`, {
      method: 'DELETE',
    });
    const d = await r.json();
    if (r.ok) {
      setMsg({ t: 'ok', x: `Usuario ${u.email} eliminado` });
      if (editingUser?.id === u.id) setEditingUser(null);
      openSub(selected);
    } else {
      setMsg({ t: 'err', x: d.error || 'Error al eliminar usuario' });
    }
  }

  if (accLoading || loading) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!isAgency) return <div className="p-8 text-ink-soft">Solo el dueño de agencia tiene acceso a este panel.</div>;

  // Permisos disponibles para el formulario de usuario: de los módulos activos de la subcuenta.
  const activeModuleManifests = ALL_MODULES.filter((m) => selected?.modules.includes(m.key));

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Agencia · Subcuentas</h1>
        <p className="mt-1 text-sm text-ink-soft">Crea subcuentas, activa sus módulos y administra sus usuarios y permisos.</p>
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
          placeholder="Nombre de la subcuenta (ej: Mario - Dental Art)"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          required
        />
        <div className="flex flex-wrap gap-4">
          {ALL_MODULES.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
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
        <button disabled={creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse disabled:opacity-50 hover:opacity-90 transition">
          {creating ? 'Creando...' : '+ Crear subcuenta'}
        </button>
      </form>

      {/* Lista de subcuentas */}
      <div className="space-y-2">
        <h2 className="font-semibold text-ink">Subcuentas ({subs.length})</h2>
        {subs.length === 0 && <p className="text-sm text-ink-soft">Aún no hay subcuentas.</p>}
        {subs.map((s) => (
          <div key={s.id} className={`flex items-center justify-between rounded-lg border p-3 transition ${selected?.id === s.id ? 'border-primary bg-primary/5' : 'border-line hover:border-line-hover'}`}>
            <div>
              <div className="font-medium text-ink">{s.name}</div>
              <div className="text-xs text-ink-soft">{s.subdomain} · módulos: {s.modules.join(', ') || '—'}</div>
            </div>
            <button onClick={() => openSub(s)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${selected?.id === s.id ? 'border-primary bg-primary text-inverse' : 'border-line text-ink hover:bg-soft'}`}>
              {selected?.id === s.id ? 'Seleccionada' : 'Ver Usuarios'}
            </button>
          </div>
        ))}
      </div>

      {/* Usuarios de la subcuenta seleccionada */}
      {selected && (
        <div className="rounded-xl border border-line bg-app p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Usuarios de {selected.name}</h2>
            <span className="text-xs text-ink-soft">{users.length} usuario(s)</span>
          </div>

          <div className="space-y-2">
            {users.length === 0 && <p className="text-sm text-ink-soft">Sin usuarios todavía.</p>}
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-soft p-3 text-sm border border-line/60">
                <div className="space-y-0.5">
                  <div className="font-medium text-ink flex items-center gap-2">
                    {u.name}
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {u.role === 'admin' ? 'Administrador' : 'Agente'}
                    </span>
                    {u.only_assigned_data && (
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Solo asignados
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-soft">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditUser(u)}
                    className="rounded-lg border border-line bg-app px-2.5 py-1 text-xs font-medium text-ink hover:border-primary hover:text-primary transition"
                  >
                    ✏️ Editar Permisos
                  </button>
                  <button
                    onClick={() => deleteUser(u)}
                    className="rounded-lg border border-line bg-app px-2.5 py-1 text-xs font-medium text-red-600 hover:border-red-500 hover:bg-red-50 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal / Form de Edición de Usuario Existente */}
          {editingUser && (
            <form onSubmit={saveEditedUser} className="space-y-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">
                  Editar permisos de {editingUser.name} ({editingUser.email})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-xs text-ink-soft hover:text-ink"
                >
                  ✕ Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Nombre</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-app"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Rol</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'agent')}
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-app"
                  >
                    <option value="agent">Agente</option>
                    <option value="admin">Administrador (Control total)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Nueva Contraseña (opcional)</label>
                  <input
                    value={editPass}
                    onChange={(e) => setEditPass(e.target.value)}
                    type="text"
                    placeholder="Dejar en blanco para no cambiar"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-app"
                  />
                </div>
              </div>

              {editRole === 'agent' && (
                <div className="space-y-3 rounded-lg bg-app p-4 border border-line">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editOnlyAssigned}
                      onChange={(e) => setEditOnlyAssigned(e.target.checked)}
                    />
                    Ver solo los datos asignados a él/ella (Only Assigned Data)
                  </label>

                  {activeModuleManifests.map((m) => (
                    <div key={m.key} className="space-y-1.5 pt-2 border-t border-line/60">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{m.name}</div>
                      <div className="flex flex-wrap gap-4">
                        {m.permissions.map((p) => (
                          <label key={p.key} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editPerms[p.key]}
                              onChange={(e) => setEditPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={updatingUser}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse disabled:opacity-50 hover:opacity-90 transition"
                >
                  {updatingUser ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-soft transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Formulario de Nuevo Usuario */}
          <form onSubmit={createUser} className="space-y-3 border-t border-line pt-5">
            <h3 className="text-sm font-semibold text-ink">+ Agregar Nuevo Usuario a {selected.name}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="Nombre completo" className="rounded-lg border border-line px-3 py-2 text-sm" required />
              <input value={uEmail} onChange={(e) => setUEmail(e.target.value)} type="email" placeholder="Email (su login)" className="rounded-lg border border-line px-3 py-2 text-sm" required />
              <input value={uPass} onChange={(e) => setUPass(e.target.value)} type="text" placeholder="Contraseña temporal (mín 6)" className="rounded-lg border border-line px-3 py-2 text-sm" required />
              <select value={uRole} onChange={(e) => setURole(e.target.value as 'admin' | 'agent')} className="rounded-lg border border-line px-3 py-2 text-sm">
                <option value="agent">Agente</option>
                <option value="admin">Administrador (de la subcuenta)</option>
              </select>
            </div>

            {uRole === 'agent' && (
              <div className="space-y-2 rounded-lg bg-soft p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                  <input type="checkbox" checked={uOnlyAssigned} onChange={(e) => setUOnlyAssigned(e.target.checked)} />
                  Ver solo los datos asignados a él/ella (Only Assigned Data)
                </label>
                {activeModuleManifests.map((m) => (
                  <div key={m.key}>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{m.name}</div>
                    <div className="flex flex-wrap gap-3">
                      {m.permissions.map((p) => (
                        <label key={p.key} className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer">
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

            <button disabled={savingUser} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse disabled:opacity-50 hover:opacity-90 transition">
              {savingUser ? 'Creando...' : '+ Crear usuario'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
