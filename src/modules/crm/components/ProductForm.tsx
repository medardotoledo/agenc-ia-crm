'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/useApp';
import type { Product } from '@/types';

interface Agent {
  id: string;
  name: string;
  role?: string;
  avatar_url?: string;
}

interface ProductFormProps {
  product?: Product | null;
  isEditing?: boolean;
}

export default function ProductForm({ product, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const { ctx } = useApp();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    short_description: product?.short_description || '',
    irresistible_offer: product?.irresistible_offer || '',
    target_triggers: product?.target_triggers || '',
    price_range: product?.price_range || '',
    knowledge_sheet: product?.knowledge_sheet || '',
    agent_id: product?.agent_id || '',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        short_description: product.short_description || '',
        irresistible_offer: product.irresistible_offer || '',
        target_triggers: product.target_triggers || '',
        price_range: product.price_range || '',
        knowledge_sheet: product.knowledge_sheet || '',
        agent_id: product.agent_id || '',
      });
    }
  }, [product]);

  // Cargar agentes disponibles
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setAgentsLoading(true);
        const response = await fetch('/api/agents');
        if (!response.ok) throw new Error('Error al cargar agentes');
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Error al cargar agentes:', err);
        setError('No se pudieron cargar los agentes');
      } finally {
        setAgentsLoading(false);
      }
    };

    loadAgents();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación básica
    if (!formData.name.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    if (!formData.agent_id) {
      setError('Debes seleccionar un agente para atender este producto');
      return;
    }

    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/products/${product?.id}` : '/api/products';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          account_id: ctx?.accountId || 'default',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar el producto');
      }

      // Redirigir a la lista de productos
      router.push('/admin/productos');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('Error al guardar:', err);
    } finally {
      setLoading(false);
    }
  };

  const FIELD =
    'w-full rounded-lg border border-line bg-app p-2.5 text-sm outline-none focus:border-primary-light';
  const LABEL = 'mb-1 block text-xs font-semibold text-ink-soft';

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Nombre */}
      <div>
        <label className={LABEL}>Nombre del Producto *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Casa en Coyoacán, Consultoría Empresarial"
          className={FIELD}
          disabled={loading}
        />
      </div>

      {/* Descripción corta */}
      <div>
        <label className={LABEL}>Descripción Corta</label>
        <input
          type="text"
          name="short_description"
          value={formData.short_description}
          onChange={handleChange}
          placeholder="Una línea descriptiva del producto"
          className={FIELD}
          disabled={loading}
        />
      </div>

      {/* Oferta Irresistible */}
      <div>
        <label className={LABEL}>📢 Oferta Irresistible *</label>
        <textarea
          name="irresistible_offer"
          value={formData.irresistible_offer}
          onChange={handleChange}
          placeholder="La propuesta de valor única para atraer a los clientes. Se usa en los anuncios."
          className={`${FIELD} min-h-24 resize-none`}
          disabled={loading}
        />
      </div>

      {/* Gatillos de Dolor */}
      <div>
        <label className={LABEL}>🎯 Gatillos de Dolor y Necesidades</label>
        <textarea
          name="target_triggers"
          value={formData.target_triggers}
          onChange={handleChange}
          placeholder="Los dolores y problemas que tu producto resuelve"
          className={`${FIELD} min-h-20 resize-none`}
          disabled={loading}
        />
      </div>

      {/* Rango de Precio */}
      <div>
        <label className={LABEL}>Rango de Precio / Inversión</label>
        <input
          type="text"
          name="price_range"
          value={formData.price_range}
          onChange={handleChange}
          placeholder="Ej: 2.5M - 3.5M MXN, $500 - $1000 USD"
          className={FIELD}
          disabled={loading}
        />
      </div>

      {/* Ficha Técnica / Knowledge Sheet */}
      <div>
        <label className={LABEL}>📋 Ficha Técnica (JSON)</label>
        <textarea
          name="knowledge_sheet"
          value={formData.knowledge_sheet}
          onChange={handleChange}
          placeholder={`Información detallada en formato JSON. Ej:\n{\n  "especificaciones": "...",\n  "beneficios": "..."\n}`}
          className={`${FIELD} min-h-24 resize-none font-mono text-xs`}
          disabled={loading}
        />
      </div>

      {/* Agente Asignado */}
      <div>
        <label className={LABEL}>👤 Agente de IA Asignado *</label>
        {agentsLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-app p-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-ink-soft">Cargando agentes...</span>
          </div>
        ) : (
          <select
            name="agent_id"
            value={formData.agent_id}
            onChange={handleChange}
            className={FIELD}
            disabled={loading || agents.length === 0}
          >
            <option value="">-- Selecciona un agente --</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.role ? `(${agent.role})` : ''}
              </option>
            ))}
          </select>
        )}
        {agents.length === 0 && !agentsLoading && (
          <p className="mt-2 text-xs text-red-500">
            ⚠️ No hay agentes disponibles. Crea un agente primero.
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading || agentsLoading}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditing ? 'Actualizar Producto' : 'Crear Producto'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="rounded-lg border border-line px-6 py-2.5 font-semibold text-ink transition-colors hover:bg-app-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>

      <p className="text-xs text-ink-soft">
        Los campos marcados con * son obligatorios.
      </p>
    </form>
  );
}
