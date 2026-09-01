'use client';

// ════════════════════════════════════════════════════════════════
// AgentsManager — CRUD de agentes (lista + modal de alta/edición)
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, type ReactNode } from 'react';
import { Card, Badge } from '@/design-system';
import { uploadImage } from '@/lib/storage/imageUpload';
import type { Agent } from '@/types/database';
import { agentService } from '../services/agentService';

const inputClass =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary-light';

type Draft = {
  id?: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp: string;
  photo_id: string;
};

const EMPTY: Draft = { name: '', title: '', email: '', phone: '', whatsapp: '', photo_id: '' };

export default function AgentsManager({ accountId }: { accountId: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setAgents(await agentService.list(accountId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar agentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [accountId]);

  const openNew = () => { setDraft(EMPTY); setModalOpen(true); };
  const openEdit = (a: Agent) => {
    setDraft({
      id: a.id,
      name: a.name,
      title: a.title ?? '',
      email: a.email ?? '',
      phone: a.phone ?? '',
      whatsapp: a.whatsapp ?? '',
      photo_id: a.photo_id ?? '',
    });
    setModalOpen(true);
  };

  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadImage(file, accountId);
      set('photo_id', url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!draft.name.trim()) { alert('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        title: draft.title || undefined,
        email: draft.email || undefined,
        phone: draft.phone || undefined,
        whatsapp: draft.whatsapp || undefined,
        photo_id: draft.photo_id || undefined,
      };
      if (draft.id) await agentService.update(accountId, draft.id, payload);
      else await agentService.create(accountId, payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Agent) => {
    if (!confirm(`¿Eliminar al agente "${a.name}"?`)) return;
    try {
      await agentService.delete(accountId, a.id);
      setAgents((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Agentes</h1>
          <p className="mt-1 text-sm text-ink-soft">Tu equipo para asignar a las propiedades</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse transition-colors hover:bg-primary-light">
          + Nuevo Agente
        </button>
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger">{error}</div>}

      {loading ? (
        <div className="py-12 text-center text-ink-soft">Cargando agentes...</div>
      ) : agents.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">
          No hay agentes todavía. Crea el primero con “+ Nuevo Agente”.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center gap-3">
                {a.photo_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photo_id} alt={a.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-inverse">
                    {a.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{a.name}</div>
                  {a.title && <div className="truncate text-xs text-ink-soft">{a.title}</div>}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-ink-soft">
                {a.email && <div className="truncate">✉️ {a.email}</div>}
                {a.phone && <div>📞 {a.phone}</div>}
                {a.whatsapp && <div>💬 {a.whatsapp}</div>}
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
                <button onClick={() => openEdit(a)} className="text-sm font-semibold text-primary-light hover:underline">Editar</button>
                <button onClick={() => handleDelete(a)} className="text-sm font-semibold text-danger hover:underline">Eliminar</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title={draft.id ? 'Editar agente' : 'Nuevo agente'}>
          <div className="space-y-4">
            {/* Foto */}
            <div className="flex items-center gap-4">
              {draft.photo_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.photo_id} alt="Foto" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-soft text-xs text-ink-soft">Sin foto</div>
              )}
              <label className="cursor-pointer rounded-lg border border-line bg-app px-3 py-2 text-sm font-semibold text-ink hover:bg-soft">
                {uploadingPhoto ? 'Subiendo…' : 'Subir foto'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
              </label>
              {draft.photo_id && (
                <button onClick={() => set('photo_id', '')} className="text-sm text-danger hover:underline">Quitar</button>
              )}
            </div>

            <FieldRow label="Nombre" required>
              <input className={inputClass} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Ana Martínez" />
            </FieldRow>
            <FieldRow label="Puesto / título">
              <input className={inputClass} value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Asesor inmobiliario" />
            </FieldRow>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldRow label="Email">
                <input type="email" className={inputClass} value={draft.email} onChange={(e) => set('email', e.target.value)} />
              </FieldRow>
              <FieldRow label="Teléfono">
                <input className={inputClass} value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
              </FieldRow>
            </div>
            <FieldRow label="WhatsApp">
              <input className={inputClass} value={draft.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="Ej. 5215512345678" />
            </FieldRow>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-line bg-app px-4 py-2 text-sm font-semibold text-ink hover:bg-soft">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-inverse hover:bg-primary-light disabled:opacity-50">
              {saving ? 'Guardando…' : draft.id ? 'Guardar' : 'Crear agente'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-line bg-app p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}
