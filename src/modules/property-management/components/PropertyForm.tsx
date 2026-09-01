'use client';

// ════════════════════════════════════════════════════════════════
// PropertyForm — alta / edición de propiedades (6 pestañas)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, type ReactNode } from 'react';
import type { Property, NearbyPlace, PoiType } from '@/types/database';
import { Card } from '@/design-system';
import { getStates, getCitiesByState, type MxState, type MxCity } from '@/lib/catalog/mexico';
import { usePropertyForm } from '../hooks/usePropertyForm';
import ImageUploader from './ImageUploader';

const OPERATIONS = ['Venta', 'Renta', 'Desarrollo', 'Remate'];
const TYPES = ['Casa', 'Departamento', 'Terreno', 'Local Comercial', 'Oficina', 'Bodega', 'Rancho', 'Villa', 'Penthouse', 'Otro'];
const CONDITIONS = ['Nuevo', 'Excelente', 'Bueno', 'Regular', 'A remodelar', 'En construcción'];
const POI_TYPES: PoiType[] = ['Aeropuerto', 'Escuela', 'Universidad', 'Hospital', 'Supermercado', 'Mall', 'Gimnasio', 'Golf', 'Parque', 'Transporte', 'Banco', 'Restaurante', 'Gasolinera', 'Playa', 'Estadio', 'Iglesia', 'Otro'];

const TABS = ['Ficha Técnica', 'Ubicación', 'Contenido', 'Media', 'SEO', 'Agentes'] as const;
type Tab = (typeof TABS)[number];

const inputClass =
  'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary-light disabled:opacity-50';

// ───────── helpers de campo ─────────
function Field({ label, children, hint, required }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

interface PropertyFormProps {
  accountId: string;
  initialProperty?: Property;
  onSaved?: (property: Property) => void;
}

export default function PropertyForm({ accountId, initialProperty, onSaved }: PropertyFormProps) {
  const { formData, loading, error, hasChanges, updateField, save } = usePropertyForm(initialProperty, accountId);
  const [tab, setTab] = useState<Tab>('Ficha Técnica');
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Catálogo de ubicación
  const [states, setStates] = useState<MxState[]>([]);
  const [cities, setCities] = useState<MxCity[]>([]);

  useEffect(() => {
    getStates().then(setStates).catch(() => setStates([]));
  }, []);

  // Cargar ciudades cuando cambia el estado (por nombre)
  useEffect(() => {
    const st = states.find((s) => s.name === formData.state);
    if (!st) {
      setCities([]);
      return;
    }
    getCitiesByState(st.id).then(setCities).catch(() => setCities([]));
  }, [formData.state, states]);

  const num = (v: string) => (v === '' ? undefined : Number(v));

  const handleSave = async () => {
    setOkMsg(null);
    try {
      const result = await save();
      if (result) {
        setOkMsg('Guardado correctamente');
        onSaved?.(result);
      }
    } catch {
      /* el error se muestra desde el hook */
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t ? 'border-b-2 border-primary text-primary' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}
      {okMsg && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{okMsg}</div>
      )}

      <Card className="p-6">
        {/* ───────── FICHA TÉCNICA ───────── */}
        {tab === 'Ficha Técnica' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Título" required>
                <input className={inputClass} value={formData.title ?? ''} onChange={(e) => updateField('title', e.target.value)} placeholder="Ej. Casa en venta en Lomas de Cuernavaca" />
              </Field>
            </div>
            <Field label="Operación" required>
              <select className={inputClass} value={formData.operation ?? 'Venta'} onChange={(e) => updateField('operation', e.target.value)}>
                {OPERATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Tipo de propiedad" required>
              <select className={inputClass} value={formData.property_type ?? 'Casa'} onChange={(e) => updateField('property_type', e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Precio" required>
              <input type="number" className={inputClass} value={formData.price ?? ''} onChange={(e) => updateField('price', num(e.target.value))} placeholder="0" />
            </Field>
            <Field label="Moneda">
              <select className={inputClass} value={formData.currency ?? 'MXN'} onChange={(e) => updateField('currency', e.target.value)}>
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </Field>
            <Field label="Recámaras"><input type="number" className={inputClass} value={formData.bedrooms ?? ''} onChange={(e) => updateField('bedrooms', num(e.target.value))} /></Field>
            <Field label="Baños completos"><input type="number" step="0.5" className={inputClass} value={formData.bathrooms ?? ''} onChange={(e) => updateField('bathrooms', num(e.target.value))} /></Field>
            <Field label="Medios baños"><input type="number" className={inputClass} value={formData.half_baths ?? ''} onChange={(e) => updateField('half_baths', num(e.target.value))} /></Field>
            <Field label="Estacionamientos"><input type="number" className={inputClass} value={formData.parking_spaces ?? ''} onChange={(e) => updateField('parking_spaces', num(e.target.value))} /></Field>
            <Field label="Construcción (m²)"><input type="number" className={inputClass} value={formData.construction_sqm ?? ''} onChange={(e) => updateField('construction_sqm', num(e.target.value))} /></Field>
            <Field label="Terreno (m²)"><input type="number" className={inputClass} value={formData.lot_sqm ?? ''} onChange={(e) => updateField('lot_sqm', num(e.target.value))} /></Field>
            <Field label="Niveles"><input type="number" className={inputClass} value={formData.levels ?? ''} onChange={(e) => updateField('levels', num(e.target.value))} /></Field>
            <Field label="Antigüedad (años)"><input type="number" className={inputClass} value={formData.age_years ?? ''} onChange={(e) => updateField('age_years', num(e.target.value))} /></Field>
            <Field label="Condición">
              <select className={inputClass} value={formData.condition ?? 'Bueno'} onChange={(e) => updateField('condition', e.target.value)}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        )}

        {/* ───────── UBICACIÓN ───────── */}
        {tab === 'Ubicación' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Calle y número"><input className={inputClass} value={formData.street ?? ''} onChange={(e) => updateField('street', e.target.value)} /></Field>
            <Field label="Colonia / Fraccionamiento"><input className={inputClass} value={formData.neighborhood ?? ''} onChange={(e) => updateField('neighborhood', e.target.value)} /></Field>
            <Field label="Estado" required>
              <select
                className={inputClass}
                value={formData.state ?? ''}
                onChange={(e) => { updateField('state', e.target.value); updateField('city', ''); }}
              >
                <option value="">Selecciona estado</option>
                {states.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Ciudad" required>
              <select className={inputClass} value={formData.city ?? ''} onChange={(e) => updateField('city', e.target.value)} disabled={!formData.state}>
                <option value="">{formData.state ? 'Selecciona ciudad' : 'Elige un estado primero'}</option>
                {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Código postal"><input className={inputClass} value={formData.postal_code ?? ''} onChange={(e) => updateField('postal_code', e.target.value)} /></Field>
            <div className="md:col-span-2">
              <Field label="Notas de ubicación" hint="Referencias, accesos, etc.">
                <textarea rows={3} className={inputClass} value={formData.location_notes ?? ''} onChange={(e) => updateField('location_notes', e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ───────── CONTENIDO ───────── */}
        {tab === 'Contenido' && (
          <div className="space-y-4">
            <Field label="Descripción corta" hint="Resumen de 1-2 líneas para tarjetas y listados.">
              <textarea rows={2} className={inputClass} value={formData.description_short ?? ''} onChange={(e) => updateField('description_short', e.target.value)} />
            </Field>
            <Field label="Descripción larga" hint="Texto principal de la propiedad.">
              <textarea rows={6} className={inputClass} value={formData.description_long ?? ''} onChange={(e) => updateField('description_long', e.target.value)} />
            </Field>
            <Field label="Descripción de la zona" hint="Sobre el entorno, colonia, atractivos cercanos.">
              <textarea rows={4} className={inputClass} value={formData.description_zone ?? ''} onChange={(e) => updateField('description_zone', e.target.value)} />
            </Field>
            <Field label="Amenidades" hint="Sepáralas con comas. Ej: Alberca, Jardín, Seguridad 24h">
              <textarea rows={3} className={inputClass} value={formData.amenities ?? ''} onChange={(e) => updateField('amenities', e.target.value)} />
            </Field>
          </div>
        )}

        {/* ───────── MEDIA ───────── */}
        {tab === 'Media' && (
          <div className="space-y-6">
            <ImageUploader
              accountId={accountId}
              label="Galería de imágenes"
              hint="La primera imagen es la portada. Arrastra para subir varias."
              values={formData.gallery_images ?? []}
              onChange={(v) => updateField('gallery_images', v)}
            />
            <ImageUploader
              accountId={accountId}
              label="Planos"
              values={formData.floor_plans ?? []}
              onChange={(v) => updateField('floor_plans', v)}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Video (URL)"><input className={inputClass} value={formData.video_url ?? ''} onChange={(e) => updateField('video_url', e.target.value)} placeholder="YouTube / Vimeo" /></Field>
              <Field label="Tour virtual (URL)"><input className={inputClass} value={formData.virtual_tour_url ?? ''} onChange={(e) => updateField('virtual_tour_url', e.target.value)} placeholder="Matterport, etc." /></Field>
            </div>
            <NearbyPlacesEditor
              values={formData.nearby_places ?? []}
              onChange={(v) => updateField('nearby_places', v)}
            />
          </div>
        )}

        {/* ───────── SEO ───────── */}
        {tab === 'SEO' && (
          <div className="space-y-4">
            <Field label="Meta título" hint="Título para buscadores (ideal < 60 caracteres).">
              <input className={inputClass} value={formData.meta_title ?? ''} onChange={(e) => updateField('meta_title', e.target.value)} />
            </Field>
            <Field label="Meta descripción" hint="Descripción para buscadores (ideal < 160 caracteres).">
              <textarea rows={3} className={inputClass} value={formData.meta_description ?? ''} onChange={(e) => updateField('meta_description', e.target.value)} />
            </Field>
          </div>
        )}

        {/* ───────── AGENTES ───────── */}
        {tab === 'Agentes' && (
          <AgentsPicker
            accountId={accountId}
            selected={formData.assigned_agents ?? []}
            onChange={(v) => updateField('assigned_agents', v)}
          />
        )}
      </Card>

      {/* Barra de acciones */}
      <div className="flex items-center justify-end gap-3">
        {hasChanges && <span className="text-xs text-ink-soft">Tienes cambios sin guardar</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-inverse transition-colors hover:bg-primary-light disabled:opacity-50"
        >
          {loading ? 'Guardando...' : initialProperty ? 'Guardar cambios' : 'Crear propiedad'}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Subcomponentes
// ════════════════════════════════════════════════════════════════

function NearbyPlacesEditor({ values, onChange }: { values: NearbyPlace[]; onChange: (v: NearbyPlace[]) => void }) {
  const add = () => onChange([...values, { type: 'Escuela', name: '', distance: '' }]);
  const update = (i: number, patch: Partial<NearbyPlace>) => onChange(values.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Puntos de interés cercanos</span>
        <button type="button" onClick={add} className="rounded-lg border border-line bg-app px-3 py-1.5 text-sm font-semibold text-ink hover:bg-soft">+ Agregar</button>
      </div>
      {values.length === 0 && <p className="text-xs text-ink-soft">Sin puntos de interés todavía.</p>}
      <div className="space-y-2">
        {values.map((p, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-soft p-2 md:grid-cols-[1fr_1fr_120px_auto]">
            <select className={inputClass} value={p.type} onChange={(e) => update(i, { type: e.target.value as PoiType })}>
              {POI_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className={inputClass} placeholder="Nombre" value={p.name ?? ''} onChange={(e) => update(i, { name: e.target.value })} />
            <input className={inputClass} placeholder="Distancia" value={p.distance ?? ''} onChange={(e) => update(i, { distance: e.target.value })} />
            <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))} className="rounded-lg px-3 text-sm font-semibold text-danger hover:underline">Quitar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentsPicker({ accountId, selected, onChange }: { accountId: string; selected: string[]; onChange: (v: string[]) => void }) {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/lib/supabase').then(({ createBrowserSupabaseClient }) => {
      const supabase = createBrowserSupabaseClient();
      supabase
        .from('agents')
        .select('id,name')
        .eq('account_id', accountId)
        .order('name')
        .then(({ data }) => {
          setAgents((data ?? []) as { id: string; name: string }[]);
          setLoading(false);
        });
    });
  }, [accountId]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (loading) return <p className="text-sm text-ink-soft">Cargando agentes...</p>;
  if (agents.length === 0)
    return (
      <p className="text-sm text-ink-soft">
        No hay agentes registrados todavía. Más adelante podrás crearlos en la sección <strong>Agentes</strong> y asignarlos aquí.
      </p>
    );

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-ink">Asigna agentes a esta propiedad</span>
      {agents.map((a) => (
        <label key={a.id} className="flex items-center gap-2 rounded-lg border border-line bg-soft px-3 py-2 text-sm">
          <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
          <span className="text-ink">{a.name}</span>
        </label>
      ))}
    </div>
  );
}
