'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, ImagePlus, X, Loader2, Globe } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  href: string | null;
  position: number;
}

interface Props {
  accountId: string;
}

export function ZonesManager({ accountId }: Props) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | Zone | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/website/zones?accountId=${accountId}`)
      .then((r) => r.json())
      .then((d) => setZones(d.zones ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [accountId]);

  const deleteZone = async (id: string) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    await fetch(`/api/website/zones/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Zonas Destacadas</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Aparecen en la sección &quot;Ubicaciones Exclusivas&quot; de tu sitio web.
          </p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light transition-colors"
        >
          <Plus size={15} />
          Agregar zona
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-ink-soft" />
        </div>
      ) : zones.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line py-16 text-center">
          <Globe size={40} className="mb-4 text-ink-soft/40" />
          <p className="font-semibold text-ink">Todavía no hay zonas</p>
          <p className="mt-1 text-sm text-ink-soft">
            Agrega zonas para mostrarlas en tu sitio web.
          </p>
          <button
            onClick={() => setModal('add')}
            className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light transition-colors"
          >
            <Plus size={15} />
            Agregar primera zona
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {zones.map((z) => (
            <div
              key={z.id}
              className="group relative rounded-xl border border-line bg-app overflow-hidden hover:shadow-md transition-all"
            >
              {/* Imagen */}
              <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary-light/20">
                {z.image_url ? (
                  <img src={z.image_url} alt={z.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImagePlus size={32} className="text-ink-soft/30" />
                  </div>
                )}
                {/* Acciones (aparecen en hover) */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal(z)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-app/90 shadow text-ink hover:bg-app"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteZone(z.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/90 shadow text-inverse hover:bg-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-4">
                <p className="font-semibold text-ink">{z.name}</p>
                {z.description && (
                  <p className="mt-1 text-sm text-ink-soft line-clamp-2">{z.description}</p>
                )}
                {z.href && (
                  <p className="mt-2 truncate text-xs text-accent">{z.href}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal add/edit */}
      {modal && (
        <ZoneModal
          accountId={accountId}
          zone={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────── Modal ─────────────────────────────── */

function ZoneModal({
  accountId,
  zone,
  onClose,
  onSaved,
}: {
  accountId: string;
  zone: Zone | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(zone?.name ?? '');
  const [description, setDescription] = useState(zone?.description ?? '');
  const [href, setHref] = useState(zone?.href ?? '');
  const [imageUrl, setImageUrl] = useState(zone?.image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('accountId', accountId);
    const res = await fetch('/api/website/upload', { method: 'POST', body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error ?? 'Error subiendo imagen'); return; }
    setImageUrl(data.url);
  };

  const save = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    setError('');
    const body = { name: name.trim(), description: description.trim() || null, image_url: imageUrl || null, href: href.trim() || null };
    const res = zone
      ? await fetch(`/api/website/zones/${zone.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/website/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, ...body }) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error guardando'); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-app p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{zone ? 'Editar zona' : 'Nueva zona'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-soft">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Imagen */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Imagen</label>
            <div
              className="relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-soft hover:border-primary/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-sm font-semibold text-inverse">Cambiar foto</span>
                  </div>
                </>
              ) : uploading ? (
                <Loader2 size={24} className="animate-spin text-ink-soft" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-ink-soft">
                  <ImagePlus size={28} />
                  <span className="text-sm">Haz clic para subir</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Zibatá, El Refugio..."
              className="w-full rounded-lg border border-line bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve descripción de la zona..."
              className="w-full resize-none rounded-lg border border-line bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>

          {/* URL de búsqueda */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Enlace (opcional)</label>
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/propiedades?colonia=zibata"
              className="w-full rounded-lg border border-line bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/50 font-mono"
            />
            <p className="mt-1 text-xs text-ink-soft">Si lo dejas vacío, lleva a /propiedades?q=Nombre</p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-soft">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || uploading}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-inverse hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {zone ? 'Guardar cambios' : 'Crear zona'}
          </button>
        </div>
      </div>
    </div>
  );
}
