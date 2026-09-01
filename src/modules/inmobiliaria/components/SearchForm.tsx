'use client';

/**
 * SearchForm — Filtros clásicos de búsqueda de propiedades.
 * Frente del flip card en el Hero.
 * Al buscar navega a /propiedades con los filtros como query params.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export interface SearchFormProps {
  searchType: 'rent' | 'buy';
  onSearchTypeChange: (type: 'rent' | 'buy') => void;
}

const PROPERTY_TYPES = ['Todos los tipos', 'Casa', 'Departamento', 'Oficina', 'Terreno', 'Local comercial', 'Bodega comercial'];

const CITIES = ['Todas las ciudades', 'Querétaro', 'El Marqués'];

const NEIGHBORHOODS: Record<string, string[]> = {
  'Querétaro': ['Todas las colonias', 'Zibatá', 'Zakia', 'El Refugio', 'Ziré', 'La Vista', 'Juriquilla', 'La Pradera', 'Palmares'],
  'El Marqués': ['Todas las colonias', 'Zákia'],
};

const PRICE_RANGES_RENT = [
  { label: 'Cualquier precio', min: 0, max: 0 },
  { label: 'Hasta $8,000', min: 0, max: 8000 },
  { label: '$8,000 – $15,000', min: 8000, max: 15000 },
  { label: '$15,000 – $25,000', min: 15000, max: 25000 },
  { label: '$25,000 – $40,000', min: 25000, max: 40000 },
  { label: 'Más de $40,000', min: 40000, max: 0 },
];

const PRICE_RANGES_BUY = [
  { label: 'Cualquier precio', min: 0, max: 0 },
  { label: 'Hasta $1,500,000', min: 0, max: 1500000 },
  { label: '$1.5M – $3M', min: 1500000, max: 3000000 },
  { label: '$3M – $5M', min: 3000000, max: 5000000 },
  { label: '$5M – $8M', min: 5000000, max: 8000000 },
  { label: 'Más de $8,000,000', min: 8000000, max: 0 },
];

const FIELD = 'w-full rounded-xl border border-line bg-soft px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all';
const LABEL = 'block text-xs font-semibold text-ink mb-1.5';

export function SearchForm({ searchType, onSearchTypeChange }: SearchFormProps) {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState('Todos los tipos');
  const [city, setCity] = useState('Todas las ciudades');
  const [neighborhood, setNeighborhood] = useState('Todas las colonias');
  const [priceRange, setPriceRange] = useState(0);

  const priceOptions = searchType === 'rent' ? PRICE_RANGES_RENT : PRICE_RANGES_BUY;
  const neighborhoodOptions = NEIGHBORHOODS[city] || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('op', searchType === 'rent' ? 'Renta' : 'Venta');
    if (propertyType !== 'Todos los tipos') params.set('tipo', propertyType);
    if (city !== 'Todas las ciudades') params.set('ciudad', city);
    if (neighborhood !== 'Todas las colonias' && neighborhood) params.set('colonia', neighborhood);
    const selected = priceOptions[priceRange];
    if (selected.min > 0) params.set('min', String(selected.min));
    if (selected.max > 0) params.set('max', String(selected.max));
    router.push(`/propiedades?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="rounded-2xl bg-app p-6 shadow-2xl md:p-8">
      {/* Tabs Renta / Comprar */}
      <div className="mb-6 flex gap-2 border-b border-line pb-5">
        <button
          type="button"
          onClick={() => { onSearchTypeChange('rent'); setPriceRange(0); }}
          className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${searchType === 'rent' ? 'bg-primary text-inverse shadow-md' : 'bg-soft text-ink hover:bg-line-soft'}`}
        >
          Renta
        </button>
        <button
          type="button"
          onClick={() => { onSearchTypeChange('buy'); setPriceRange(0); }}
          className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${searchType === 'buy' ? 'bg-primary text-inverse shadow-md' : 'bg-soft text-ink hover:bg-line-soft'}`}
        >
          Comprar
        </button>
      </div>

      {/* Filtros en grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tipo */}
        <div>
          <label className={LABEL}>Tipo de propiedad</label>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={FIELD}>
            {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label className={LABEL}>Ciudad</label>
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setNeighborhood('Todas las colonias'); }}
            className={FIELD}
          >
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Colonia */}
        <div>
          <label className={LABEL}>Colonia / Zona</label>
          <select
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className={FIELD}
            disabled={!neighborhoodOptions.length}
          >
            {neighborhoodOptions.length
              ? neighborhoodOptions.map((n) => <option key={n}>{n}</option>)
              : <option>Selecciona ciudad primero</option>
            }
          </select>
        </div>

        {/* Rango de precio */}
        <div>
          <label className={LABEL}>Presupuesto</label>
          <select value={priceRange} onChange={(e) => setPriceRange(Number(e.target.value))} className={FIELD}>
            {priceOptions.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Botón */}
      <div className="mt-5">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-inverse shadow-lg hover:bg-accent/90 hover:shadow-xl transition-all"
        >
          <Search size={16} />
          Buscar propiedades
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-ink-soft">
        O usa{' '}
        <span className="font-semibold text-primary">✦ Modo Agente</span>
        {' '}para buscar con lenguaje natural
      </p>
    </form>
  );
}
