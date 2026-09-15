'use client';

/**
 * PANEL DE AGENCIA (solo dueño de agencia / super_admin)
 * - Crear y listar subcuentas + activar módulos.
 * - Conexión directa a GoHighLevel por subcuenta (Location ID y Token).
 * - Sincronización automática de usuarios desde GoHighLevel.
 * - Modal emergente para gestión de usuarios y permisos.
 */

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useActiveAccount } from '@/core/account/activeAccount';
import { ALL_MODULES } from '@/core/modules/registry';
import { RefreshCw, Users, Key, Settings, Check, X, Trash2, Edit2, Shield, Plus, Building2 } from 'lucide-react';

interface SubAccount {
  id: string;
  name: string;
  subdomain: string;
  modules: string[];
  ghlLocationId?: string | null;
}

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
  const [newGhlLocationId, setNewGhlLocationId] = useState('');
  const [newGhlToken, setNewGhlToken] = useState('');
  const [showGhlInCreate, setShowGhlInCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Subcuenta seleccionada para gestión de usuarios (Modal)
  const [selected, setSelected] = useState<SubAccount | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [syncingGhl, setSyncingGhl] = useState(false);
  const [userModalMsg, setUserModalMsg] = useState<{ t: 'ok' | 'err'; x: string } | null>(null);

  // Modal para configurar GoHighLevel en subcuenta existente
  const [ghlModalSub, setGhlModalSub] = useState<SubAccount | null>(null);
  const [ghlLocationInput, setGhlLocationInput] = useState('');
  const [ghlTokenInput, setGhlTokenInput] = useState('');
  const [savingGhl, setSavingGhl] = useState(false);
  const [loadingGhlInfo, setLoadingGhlInfo] = useState(false);
  const [ghlModalMsg, setGhlModalMsg] = useState<{ t: 'ok' | 'err'; x: string } | null>(null);

  // Form: nuevo usuario manual
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRole, setURole] = useState<'admin' | 'agent'>('agent');
  const [uOnlyAssigned, setUOnlyAssigned] = useState(true);
  const [uPerms, setUPerms] = useState<Record<string, boolean>>({});
  const [savingUser, setSavingUser] = useState(false);
  const [showManualUserForm, setShowManualUserForm] = useState(false);

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
      body: JSON.stringify({
        name: newName,
        modules: newModules,
        ghlLocationId: newGhlLocationId.trim() || undefined,
        ghlToken: newGhlToken.trim() || undefined,
      }),
    });
    const d = await r.json();
    if (r.ok) {
      setMsg({ t: 'ok', x: `Subcuenta "${newName}" creada exitosamente con sus módulos y conexiones.` });
      setNewName('');
      setNewGhlLocationId('');
      setNewGhlToken('');
      setShowGhlInCreate(false);
      loadSubs();
    } else {
      setMsg({ t: 'err', x: d.error || 'No se pudo crear la subcuenta' });
    }
    setCreating(false);
  }

  async function openSub(s: SubAccount) {
    setSelected(s);
    setUsers([]);
    setEditingUser(null);
    setShowManualUserForm(false);
    setUserModalMsg(null);
    setLoadingUsers(true);
    try {
      const r = await authedFetch(`/api/agency/users?accountId=${s.id}`);
      const d = await r.json();
      if (r.ok) setUsers(d.users || []);
    } catch (e: any) {
      setUserModalMsg({ t: 'err', x: 'Error al consultar usuarios' });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function openGhlConfig(s: SubAccount) {
    setGhlModalSub(s);
    setGhlLocationInput(s.ghlLocationId || '');
    setGhlTokenInput('');
    setGhlModalMsg(null);
    setLoadingGhlInfo(true);
    try {
      const r = await authedFetch(`/api/agency/sub-accounts/ghl?accountId=${s.id}`);
      const d = await r.json();
      if (r.ok && d.locationId) {
        setGhlLocationInput(d.locationId);
      }
    } catch (e: any) {
      console.warn('Error fetching GHL info', e);
    } finally {
      setLoadingGhlInfo(false);
    }
  }

  async function saveGhlConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!ghlModalSub) return;
    setSavingGhl(true);
    setGhlModalMsg(null);
    try {
      const r = await authedFetch('/api/agency/sub-accounts/ghl', {
        method: 'POST',
        body: JSON.stringify({
          accountId: ghlModalSub.id,
          locationId: ghlLocationInput.trim(),
          accessToken: ghlTokenInput.trim(),
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setGhlModalMsg({ t: 'ok', x: '✅ Conexión con GoHighLevel validada y guardada con éxito.' });
        loadSubs();
        setTimeout(() => setGhlModalSub(null), 1600);
      } else {
        setGhlModalMsg({ t: 'err', x: d.error || 'Error al conectar con GoHighLevel' });
      }
    } catch (e: any) {
      setGhlModalMsg({ t: 'err', x: e.message || 'Error de red' });
    } finally {
      setSavingGhl(false);
    }
  }

  async function handleSyncGhlUsers() {
    if (!selected) return;
    setSyncingGhl(true);
    setUserModalMsg(null);
    try {
      const r = await authedFetch('/api/agency/users/sync-ghl', {
        method: 'POST',
        body: JSON.stringify({ accountId: selected.id }),
      });
      const d = await r.json();
      if (r.ok) {
        setUserModalMsg({ t: 'ok', x: d.message || `Se sincronizaron ${d.count} usuarios correctamente.` });
        openSub(selected);
      } else {
        setUserModalMsg({ t: 'err', x: d.error || 'Error al sincronizar usuarios de GoHighLevel' });
      }
    } catch (e: any) {
      setUserModalMsg({ t: 'err', x: e.message || 'Error de conexión' });
    } finally {
      setSyncingGhl(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingUser(true);
    setUserModalMsg(null);
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
      setUserModalMsg({ t: 'ok', x: `Usuario ${uEmail} creado con éxito.` });
      setUName(''); setUEmail(''); setUPass(''); setUPerms({});
      setShowManualUserForm(false);
      openSub(selected);
    } else {
      setUserModalMsg({ t: 'err', x: d.error || 'No se pudo crear el usuario' });
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
    setUserModalMsg(null);

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
      setUserModalMsg({ t: 'ok', x: `Cambios guardados para ${editingUser.email}` });
      setEditingUser(null);
      openSub(selected);
    } else {
      setUserModalMsg({ t: 'err', x: d.error || 'Error al guardar cambios' });
    }
    setUpdatingUser(false);
  }

  async function deleteUser(u: TeamUser) {
    if (!selected) return;
    if (!confirm(`¿Eliminar al usuario ${u.name} (${u.email}) de ${selected.name}?`)) return;
    setUserModalMsg(null);
    const r = await authedFetch(`/api/agency/users?accountId=${selected.id}&userId=${u.id}`, {
      method: 'DELETE',
    });
    const d = await r.json();
    if (r.ok) {
      setUserModalMsg({ t: 'ok', x: `Usuario ${u.email} eliminado` });
      if (editingUser?.id === u.id) setEditingUser(null);
      openSub(selected);
    } else {
      setUserModalMsg({ t: 'err', x: d.error || 'Error al eliminar usuario' });
    }
  }

  async function toggleSubModule(sub: SubAccount, moduleKey: string) {
    const current = sub.modules || [];
    const next = current.includes(moduleKey)
      ? current.filter((m) => m !== moduleKey)
      : [...current, moduleKey];

    setSubs((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, modules: next } : s))
    );

    const r = await authedFetch('/api/agency/sub-accounts', {
      method: 'PATCH',
      body: JSON.stringify({ accountId: sub.id, modules: next }),
    });
    if (!r.ok) {
      setMsg({ t: 'err', x: 'Error al actualizar módulos de la subcuenta' });
      loadSubs();
    } else {
      setMsg({ t: 'ok', x: `Módulos de ${sub.name} actualizados` });
    }
  }

  if (accLoading || loading) return <div className="p-8 text-ink-soft">Cargando panel de agencia...</div>;
  if (!isAgency) return <div className="p-8 text-ink-soft">Solo el dueño de agencia tiene acceso a este panel.</div>;

  const activeModuleManifests = ALL_MODULES.filter((m) => selected?.modules.includes(m.key));

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Building2 className="text-primary" size={26} />
          Agencia · Subcuentas
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Crea subcuentas para tus clientes, conéctalas a GoHighLevel, activa sus módulos y sincroniza a sus usuarios con un clic.
        </p>
      </div>

      {msg && (
        <div className={`rounded-lg border p-3 text-sm flex items-center justify-between ${msg.t === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <span>{msg.x}</span>
          <button onClick={() => setMsg(null)} className="text-xs font-semibold opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Formulario: Crear subcuenta */}
      <form onSubmit={createSub} className="rounded-xl border border-line bg-app p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink text-base">+ Nueva Subcuenta</h2>
          <button
            type="button"
            onClick={() => setShowGhlInCreate(!showGhlInCreate)}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Key size={13} />
            {showGhlInCreate ? 'Ocultar GoHighLevel' : 'Conectar GoHighLevel ahora'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-soft mb-1">Nombre de la clínica / empresa</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: Dental Art Cuernavaca"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-soft focus:bg-app focus:border-primary outline-none transition"
            required
          />
        </div>

        {showGhlInCreate && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-3">
            <div className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
              <Key size={14} /> Conexión con GoHighLevel (Opcional)
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-ink-soft mb-1">Location ID de GHL</label>
                <input
                  value={newGhlLocationId}
                  onChange={(e) => setNewGhlLocationId(e.target.value)}
                  placeholder="Ej: hvprmktlUfAPTK6IVOvW"
                  className="w-full rounded-lg border border-line px-3 py-1.5 text-xs bg-app"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-soft mb-1">API Key / Token (PIT) de GHL</label>
                <input
                  type="password"
                  value={newGhlToken}
                  onChange={(e) => setNewGhlToken(e.target.value)}
                  placeholder="pit-xxxxxxxx-xxxx-xxxx..."
                  className="w-full rounded-lg border border-line px-3 py-1.5 text-xs bg-app"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-ink-soft mb-2">Módulos activos:</label>
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
        </div>

        <button
          disabled={creating}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-inverse disabled:opacity-50 hover:opacity-90 transition flex items-center gap-2"
        >
          <Plus size={16} />
          {creating ? 'Creando subcuenta...' : 'Crear subcuenta'}
        </button>
      </form>

      {/* Lista de subcuentas */}
      <div className="space-y-3">
        <h2 className="font-semibold text-ink text-base">Subcuentas Registradas ({subs.length})</h2>
        {subs.length === 0 && <p className="text-sm text-ink-soft">Aún no hay subcuentas creadas.</p>}
        {subs.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-xl border border-line bg-app p-4 transition hover:border-line-hover sm:flex-row sm:items-center sm:justify-between shadow-xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink text-base">{s.name}</span>
                {s.ghlLocationId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-700 border border-green-500/20">
                    <Check size={11} /> GHL: {s.ghlLocationId.slice(0, 8)}...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                    Sin GHL
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-soft">{s.subdomain}</div>

              {/* Switches de Módulos */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Módulos:</span>
                {ALL_MODULES.map((m) => {
                  const isActive = (s.modules || []).includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleSubModule(s, m.key)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition ${
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                          : 'border-line bg-soft text-ink-soft hover:border-line-hover'
                      }`}
                    >
                      <span>{isActive ? '✓' : '○'}</span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <button
                onClick={() => openGhlConfig(s)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-soft transition"
                title="Configurar Location ID y Token de GoHighLevel"
              >
                <Key size={14} className="text-amber-500" />
                GoHighLevel
              </button>
              <button
                onClick={() => openSub(s)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-inverse hover:opacity-90 transition shadow-xs"
              >
                <Users size={14} />
                Usuarios
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ================= MODAL: USUARIOS DE LA SUBCUENTA ================= */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-app p-6 shadow-2xl space-y-5">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                  <Users className="text-primary" size={22} />
                  Usuarios de {selected.name}
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Gestiona los accesos del equipo de esta subcuenta y sus permisos asignados.
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-soft hover:text-ink transition"
              >
                <X size={20} />
              </button>
            </div>

            {userModalMsg && (
              <div className={`rounded-lg border p-3 text-xs ${userModalMsg.t === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {userModalMsg.x}
              </div>
            )}

            {/* Banner GoHighLevel Sync */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Key size={14} /> Sincronización con GoHighLevel
                </div>
                <p className="text-xs text-ink-soft">
                  Importa a todos los miembros de {selected.name} dados de alta en GHL sin tener que crearlos a mano.
                </p>
              </div>
              <button
                onClick={handleSyncGhlUsers}
                disabled={syncingGhl}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition shrink-0 shadow-xs"
              >
                <RefreshCw size={14} className={syncingGhl ? 'animate-spin' : ''} />
                {syncingGhl ? 'Sincronizando...' : '📥 Sincronizar de GHL'}
              </button>
            </div>

            {/* Lista de Usuarios */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Equipo ({users.length} usuarios)</h3>
                <button
                  type="button"
                  onClick={() => setShowManualUserForm(!showManualUserForm)}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={13} />
                  {showManualUserForm ? 'Ocultar formulario manual' : '+ Agregar usuario manual'}
                </button>
              </div>

              {loadingUsers ? (
                <p className="text-xs text-ink-soft py-4 text-center">Cargando usuarios...</p>
              ) : users.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-soft">
                  Aún no hay usuarios en esta subcuenta. Pulsa <strong>"📥 Sincronizar de GHL"</strong> para traer al equipo automáticamente.
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-xl bg-soft p-3 text-sm border border-line/60">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-ink flex items-center gap-2">
                          {u.name}
                          <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-700'
                          }`}>
                            {u.role === 'admin' ? 'Administrador' : 'Agente'}
                          </span>
                          {u.only_assigned_data && (
                            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              Solo asignados
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-soft">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditUser(u)}
                          className="rounded-lg border border-line bg-app p-1.5 text-xs text-ink hover:border-primary hover:text-primary transition"
                          title="Editar permisos"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          className="rounded-lg border border-line bg-app p-1.5 text-xs text-red-600 hover:border-red-500 hover:bg-red-50 transition"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario de Edición */}
            {editingUser && (
              <form onSubmit={saveEditedUser} className="space-y-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    Editar permisos: {editingUser.name} ({editingUser.email})
                  </h3>
                  <button type="button" onClick={() => setEditingUser(null)} className="text-xs text-ink-soft hover:text-ink">
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-soft mb-1">Nombre</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-line px-3 py-1.5 text-xs bg-app"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-soft mb-1">Rol</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'admin' | 'agent')}
                      className="w-full rounded-lg border border-line px-3 py-1.5 text-xs bg-app"
                    >
                      <option value="agent">Agente</option>
                      <option value="admin">Administrador (Total)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-soft mb-1">Nueva Clave (opcional)</label>
                    <input
                      value={editPass}
                      onChange={(e) => setEditPass(e.target.value)}
                      type="text"
                      placeholder="Dejar en blanco para no cambiar"
                      className="w-full rounded-lg border border-line px-3 py-1.5 text-xs bg-app"
                    />
                  </div>
                </div>

                {editRole === 'agent' && (
                  <div className="space-y-3 rounded-lg bg-app p-3.5 border border-line">
                    <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editOnlyAssigned}
                        onChange={(e) => setEditOnlyAssigned(e.target.checked)}
                      />
                      Ver solo los datos asignados a él/ella (Only Assigned Data)
                    </label>

                    {activeModuleManifests.map((m) => (
                      <div key={m.key} className="space-y-1 pt-2 border-t border-line/60">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">{m.name}</div>
                        <div className="flex flex-wrap gap-3">
                          {m.permissions.map((p) => (
                            <label key={p.key} className="flex items-center gap-1 text-xs text-ink cursor-pointer">
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

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={updatingUser}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-inverse disabled:opacity-50 hover:opacity-90 transition"
                  >
                    {updatingUser ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-soft transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Formulario Manual de Nuevo Usuario */}
            {showManualUserForm && (
              <form onSubmit={createUser} className="space-y-3 rounded-xl border border-line bg-soft p-4">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wide">+ Crear Usuario Local Manualmente</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="Nombre completo" className="rounded-lg border border-line px-3 py-1.5 text-xs bg-app" required />
                  <input value={uEmail} onChange={(e) => setUEmail(e.target.value)} type="email" placeholder="Email de login" className="rounded-lg border border-line px-3 py-1.5 text-xs bg-app" required />
                  <input value={uPass} onChange={(e) => setUPass(e.target.value)} type="text" placeholder="Contraseña (mín 6)" className="rounded-lg border border-line px-3 py-1.5 text-xs bg-app" required />
                  <select value={uRole} onChange={(e) => setURole(e.target.value as 'admin' | 'agent')} className="rounded-lg border border-line px-3 py-1.5 text-xs bg-app">
                    <option value="agent">Agente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <button disabled={savingUser} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-inverse disabled:opacity-50 hover:opacity-90 transition">
                  {savingUser ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </form>
            )}

            {/* Footer Modal */}
            <div className="flex justify-end border-t border-line pt-3">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-line px-4 py-1.5 text-xs font-medium text-ink hover:bg-soft transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIGURAR GOHIGHLEVEL ================= */}
      {ghlModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-app p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Key className="text-amber-500" size={18} />
                GoHighLevel · {ghlModalSub.name}
              </h3>
              <button onClick={() => setGhlModalSub(null)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {ghlModalMsg && (
              <div className={`rounded-lg border p-3 text-xs ${ghlModalMsg.t === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {ghlModalMsg.x}
              </div>
            )}

            <form onSubmit={saveGhlConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Location ID de GoHighLevel</label>
                <input
                  value={ghlLocationInput}
                  onChange={(e) => setGhlLocationInput(e.target.value)}
                  placeholder="Ej: hvprmktlUfAPTK6IVOvW"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-soft focus:bg-app focus:border-primary outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">API Key / Token (PIT) de GHL</label>
                <input
                  type="password"
                  value={ghlTokenInput}
                  onChange={(e) => setGhlTokenInput(e.target.value)}
                  placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-soft focus:bg-app focus:border-primary outline-none transition"
                  required
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  En GHL de {ghlModalSub.name}: Settings &gt; Developers &gt; Private Integration Tokens.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setGhlModalSub(null)}
                  className="rounded-lg border border-line px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-soft transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGhl}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-inverse hover:opacity-90 disabled:opacity-50 transition"
                >
                  {savingGhl ? 'Probando y Guardando...' : 'Guardar y Validar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
