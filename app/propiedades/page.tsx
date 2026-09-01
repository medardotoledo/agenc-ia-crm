'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, BedDouble, Bath, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/design-system/useTheme';

interface Property {
  id: string;
  slug?: string;
  title: string;
  operation: string;
  property_type: string;
  city: string;
  neighborhood?: string;
  price: number;
  currency: string;
  bedrooms?: number;
  bathrooms?: number;
  construction_sqm?: number;
  gallery_images?: string[];
  is_featured?: boolean;
}

const LIMIT = 12;

const OPERATIONS = ['Venta', 'Renta'];
const TYPES = ['Casa', 'Departamento', 'Local comercial', 'Oficina', 'Terreno', 'Bodega'];

const PRICE_RENTA = [
  { label: 'Hasta $10,000', max: 10000 },
  { label: '$10,000 – $20,000', min: 10000, max: 20000 },
  { label: '$20,000 – $35,000', min: 20000, max: 35000 },
  { label: '$35,000 – $60,000', min: 35000, max: 60000 },
  { label: 'Más de $60,000', min: 60000 },
];
const PRICE_VENTA = [
  { label: 'Hasta $1.5M', max: 1500000 },
  { label: '$1.5M – $3M', min: 1500000, max: 3000000 },
  { label: '$3M – $6M', min: 3000000, max: 6000000 },
  { label: '$6M – $12M', min: 6000000, max: 12000000 },
  { label: 'Más de $12M', min: 12000000 },
];

function PropertyCard({ p }: { p: Property }) {
  const href = `/p/${p.slug || p.id}`;
  const opColor = p.operation === 'Renta'
    ? 'bg-emerald-500/15 text-emerald-700'
    : 'bg-primary/15 text-primary';

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-line bg-app overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300"
    >
      {/* Imagen */}
      <div className="relative h-52 overflow-hidden bg-soft">
        {p.gallery_images?.[0] ? (
          <img
            src={p.gallery_images[0]}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🏠</div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${opColor}`}>
          {p.operation}
        </span>
        {p.is_featured && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
            Destacado
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-ink-soft mb-1">{[p.neighborhood, p.city].filter(Boolean).join(', ')}</p>
        <h3 className="font-semibold text-ink line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {p.title}
        </h3>

        {/* Specs */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-soft border-t border-line pt-3">
          {p.bedrooms != null && (
            <span className="flex items-center gap-1"><BedDouble size={12} className="text-primary" />{p.bedrooms} rec</span>
          )}
          {p.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath size={12} className="text-primary" />{p.bathrooms} baños</span>
          )}
          {p.construction_sqm != null && (
            <span className="flex items-center gap-1"><Maximize2 size={12} className="text-primary" />{p.construction_sqm} m²</span>
          )}
        </div>

        {/* Precio */}
        <div className="mt-3 text-xl font-bold text-primary">
          ${p.price?.toLocaleString('es-MX')} <span className="text-sm font-normal text-ink-soft">{p.currency}</span>
          {p.operation === 'Renta' && <span className="text-xs font-normal text-ink-soft">/mes</span>}
        </div>
      </div>
    </Link>
  );
}

export default function PropiedadesPage() {
  const { account_id } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros activos
  const operation = searchParams.get('operation') ?? '';
  const propertyType = searchParams.get('type') ?? '';
  const priceRange = searchParams.get('price') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1');

  const totalPages = Math.ceil(total / LIMIT);
  const prices = operation === 'Renta' ? PRICE_RENTA : PRICE_VENTA;
  const selectedPrice = prices.find((p) => `${p.min ?? ''}-${p.max ?? ''}` === priceRange);

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    router.push(`/propiedades?${p.toString()}`);
  };

  const clearFilters = () => router.push('/propiedades');

  const hasFilters = operation || propertyType || priceRange;

  const load = useCallback(async () => {
    if (!account_id) return;
    setLoading(true);
    const params = new URLSearchParams({ accountId: account_id, limit: String(LIMIT), offset: String((page - 1) * LIMIT) });
    if (operation) params.set('operation', operation);
    if (propertyType) params.set('property_type', propertyType);
    if (selectedPrice?.min) params.set('min_price', String(selectedPrice.min));
    if (selectedPrice?.max) params.set('max_price', String(selectedPrice.max));

    const res = await fetch(`/api/properties?${params}`);
    const data = await res.json();
    setProperties(data.properties ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [account_id, operation, propertyType, priceRange, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-soft">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-app/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-inverse">N</span>
            <span className="hidden sm:block">Nodo Inmobiliario</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-soft md:flex">
            <Link href="/" className="hover:text-ink transition-colors">Inicio</Link>
            <Link href="/propiedades" className="text-ink font-semibold">Propiedades</Link>
          </nav>
          <Link href="/#contacto" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light transition-colors">
            Contactar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Título + controles */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Propiedades</h1>
            <p className="text-sm text-ink-soft">
              {loading ? 'Cargando…' : `${total} resultado${total !== 1 ? 's' : ''}`}
              {hasFilters && ' con filtros aplicados'}
            </p>
          </div>
          <div className="flex gap-2">
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink-soft hover:bg-soft transition-colors">
                <X size={14} /> Limpiar
              </button>
            )}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-app text-ink hover:bg-soft'}`}
            >
              <SlidersHorizontal size={15} />
              Filtros
            </button>
          </div>
        </div>

        {/* Filtros desplegables */}
        {showFilters && (
          <div className="mb-6 rounded-2xl border border-line bg-app p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Operación */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Tipo</label>
                <div className="flex gap-2">
                  {OPERATIONS.map((op) => (
                    <button
                      key={op}
                      onClick={() => setParam('operation', operation === op ? '' : op)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${operation === op ? 'border-primary bg-primary text-inverse' : 'border-line bg-soft text-ink hover:border-primary/50'}`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Propiedad */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Propiedad</label>
                <select
                  value={propertyType}
                  onChange={(e) => setParam('type', e.target.value)}
                  className="w-full rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
                >
                  <option value="">Todos</option>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Precio */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">Presupuesto</label>
                <select
                  value={priceRange}
                  onChange={(e) => setParam('price', e.target.value)}
                  className="w-full rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
                >
                  <option value="">Cualquier precio</option>
                  {prices.map((p) => (
                    <option key={p.label} value={`${p.min ?? ''}-${p.max ?? ''}`}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tags de filtros activos */}
        {hasFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {operation && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {operation} <button onClick={() => setParam('operation', '')}><X size={11} /></button>
              </span>
            )}
            {propertyType && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {propertyType} <button onClick={() => setParam('type', '')}><X size={11} /></button>
              </span>
            )}
            {selectedPrice && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {selectedPrice.label} <button onClick={() => setParam('price', '')}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-line-soft" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={48} className="mb-4 text-ink-soft/30" />
            <p className="font-semibold text-ink">No encontramos propiedades</p>
            <p className="mt-1 text-sm text-ink-soft">Prueba ajustando los filtros</p>
            <button onClick={clearFilters} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light transition-colors">
              Ver todas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setParam('page', String(page - 1))}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-app text-ink disabled:opacity-30 hover:bg-soft transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 text-sm text-ink-soft">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setParam('page', String(page + 1))}
              disabled={page >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-app text-ink disabled:opacity-30 hover:bg-soft transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-line bg-app">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-ink-soft">
          © {new Date().getFullYear()} Nodo Inmobiliario · Todos los derechos reservados
        </div>
      </footer>
    </div>
  );
}
