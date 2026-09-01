'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileDown } from 'lucide-react';
import type { Property } from '@/types/database';
import { Card, Badge } from '@/design-system';
import { getStates, getCitiesByState, type MxState, type MxCity } from '@/lib/catalog/mexico';
import { propertyService } from '../services/propertyService';

interface PropertyListProps {
  accountId: string;
  agentId?: string;
}

export default function PropertyList({ accountId, agentId }: PropertyListProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catálogo estados/ciudades
  const [states, setStates] = useState<MxState[]>([]);
  const [cities, setCities] = useState<MxCity[]>([]);

  const [filters, setFilters] = useState({
    stateId: '', // id del estado seleccionado (para cargar ciudades)
    state: '', // nombre del estado (para filtrar)
    city: '', // nombre de la ciudad (para filtrar)
    operation: '',
  });

  // Cargar estados una vez
  useEffect(() => {
    getStates().then(setStates).catch(() => setStates([]));
  }, []);

  // Cuando cambia el estado, cargar sus ciudades
  useEffect(() => {
    if (!filters.stateId) {
      setCities([]);
      return;
    }
    getCitiesByState(Number(filters.stateId))
      .then(setCities)
      .catch(() => setCities([]));
  }, [filters.stateId]);

  const handleStateChange = (stateId: string) => {
    const selected = states.find((s) => String(s.id) === stateId);
    // Al cambiar de estado, se resetea la ciudad
    setFilters((f) => ({ ...f, stateId, state: selected?.name ?? '', city: '' }));
  };

  useEffect(() => {
    loadProperties();
  }, [accountId, filters]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyService.list(accountId, {
        city: filters.city || undefined,
        state: filters.state || undefined,
        operation: filters.operation || undefined,
        limit: 50,
      });
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading properties');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    try {
      await propertyService.delete(accountId, id);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink-soft">Cargando propiedades...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger">
        Error: {error}
      </div>
    );
  }

  const inputClass =
    'rounded-lg border border-line bg-app px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary-light';

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {/* Estado */}
        <select
          value={filters.stateId}
          onChange={(e) => handleStateChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Todos los estados</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Ciudad — depende del estado */}
        <select
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          disabled={!filters.stateId}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <option value="">
            {filters.stateId ? 'Todas las ciudades' : 'Selecciona un estado primero'}
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Operación */}
        <select
          value={filters.operation}
          onChange={(e) => setFilters({ ...filters, operation: e.target.value })}
          className={inputClass}
        >
          <option value="">Todas las operaciones</option>
          <option value="Venta">Venta</option>
          <option value="Renta">Renta</option>
          <option value="Desarrollo">Desarrollo</option>
          <option value="Remate">Remate</option>
        </select>
      </div>

      {/* Tabla */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-soft">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-ink-soft">Título</th>
              <th className="px-4 py-3 text-left font-semibold text-ink-soft">Ubicación</th>
              <th className="px-4 py-3 text-left font-semibold text-ink-soft">Precio</th>
              <th className="px-4 py-3 text-left font-semibold text-ink-soft">Operación</th>
              <th className="px-4 py-3 text-left font-semibold text-ink-soft">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-ink-soft">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {properties.map((property) => (
              <tr key={property.id} className="transition-colors hover:bg-soft">
                <td className="px-4 py-3 font-medium text-ink">{property.title}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {property.city}, {property.state}
                </td>
                <td className="px-4 py-3 font-semibold text-ink">
                  ${property.price.toLocaleString()} {property.currency}
                </td>
                <td className="px-4 py-3 text-ink-soft">{property.operation}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={property.is_published ? 'success' : 'warning'}>
                      {property.is_published ? '✓ Publicada' : 'Borrador'}
                    </Badge>
                    {property.is_featured && <Badge tone="info">⭐ Destacada</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/properties/${property.id}`}
                      className="text-sm font-semibold text-primary-light hover:underline"
                    >
                      Editar
                    </Link>
                    <a
                      href={`/api/properties/${property.slug || property.id}/pdf${agentId ? `?agentId=${agentId}` : ''}`}
                      download
                      title="Descargar ficha técnica PDF"
                      className="flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-primary transition-colors"
                    >
                      <FileDown size={14} />
                      Ficha
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(property.id, property.title)}
                      className="text-sm font-semibold text-danger hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {properties.length === 0 && (
        <div className="py-12 text-center text-ink-soft">
          No hay propiedades. Crea una nueva para comenzar.
        </div>
      )}

      <div className="text-sm text-ink-soft">Total: {properties.length} propiedades</div>
    </div>
  );
}
