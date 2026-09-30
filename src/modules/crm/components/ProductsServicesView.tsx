'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Rocket, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useActiveAccount } from '@/core/account/activeAccount';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';

interface ProductWithAgent extends Product {
  agent_name?: string;
  agent_avatar?: string;
  irresistible_offer?: string;
}

export default function ProductsServicesView() {
  const router = useRouter();
  const { account } = useActiveAccount();
  const [products, setProducts] = useState<ProductWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const accId = account?.id;
        const url = accId ? `/api/adflow/products?accountId=${accId}` : '/api/adflow/products';
        const response = await fetch(url);

        if (!response.ok) throw new Error('Error al cargar productos');

        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [account?.id]);

  const filtered = products.filter((p) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.irresistible_offer || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLaunchAd = (productId: string) => {
    router.push(`/admin/adflow?productId=${productId}`);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar');

      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Buscar productos, servicios u ofertas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-line bg-app pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary-light"
          />
        </div>
        <button
          onClick={() => router.push('/admin/productos/nuevo')}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-app-light p-8 text-center">
          <p className="text-sm text-ink-soft">
            {searchQuery
              ? 'No se encontraron productos que coincidan con tu búsqueda'
              : 'Aún no tienes productos o servicios agregados'}
          </p>
        </div>
      )}

      {/* Products Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onLaunchAd={handleLaunchAd}
              onEdit={(id) => router.push(`/admin/productos/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: ProductWithAgent;
  onLaunchAd: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function ProductCard({ product, onLaunchAd, onEdit, onDelete }: ProductCardProps) {
  const avatar = product.agent_avatar || product.agent_avatar_url;

  return (
    <div className="rounded-lg border border-line bg-app p-5 transition-shadow hover:shadow-md">
      {/* Header con nombre y acciones */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink">{product.name}</h3>
            {product.knowledge_sheet ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                ✓ Ficha Lista
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                ⚡ Ficha Pendiente
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-ink-soft">Producto / Servicio</p>
            {product.price_range && (
              <span className="text-xs font-semibold text-primary">· {product.price_range}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(product.id)}
            className="p-1.5 text-ink-soft transition-colors hover:bg-line hover:text-ink rounded cursor-pointer"
            title="Abrir Estudio / Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 text-ink-soft transition-colors hover:bg-red-500/10 hover:text-red-500 rounded cursor-pointer"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Oferta Irresistible */}
      {product.irresistible_offer && (
        <div className="mb-4 rounded-xl bg-app-light p-3 border border-line">
          <p className="text-xs font-semibold text-ink-soft mb-1 flex items-center gap-1.5">
            📢 Oferta Irresistible Hormozi
          </p>
          <p className="text-sm text-ink line-clamp-2 italic">
            &ldquo;{product.irresistible_offer}&rdquo;
          </p>
        </div>
      )}

      {/* Agentes asignados (Muchos a Muchos) */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-app-light p-2.5 border border-line">
        <div className="flex items-center gap-2 min-w-0">
          {avatar && (
            <img
              src={avatar}
              alt={product.agent_name || 'Agente'}
              className="h-7 w-7 rounded-full object-cover shrink-0"
            />
          )}
          <div className="text-xs min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-ink truncate">
                {product.agent_name || 'Agente Asignado'}
              </p>
              {product.assigned_agents && product.assigned_agents.length > 1 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  +{product.assigned_agents.length - 1} más
                </span>
              )}
            </div>
            <p className="text-[10px] text-ink-soft truncate">
              {product.agent_role || 'Agente Principal AdFlow'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEdit(product.id)}
          className="text-[11px] font-bold text-primary hover:underline shrink-0 ml-2"
        >
          Estudio IA →
        </button>
      </div>

      {/* Botón destacado AdFlow */}
      <button
        onClick={() => onLaunchAd(product.id)}
        className="w-full rounded-lg bg-gradient-to-r from-primary to-primary-light py-2.5 px-3 font-semibold text-white transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Rocket className="h-4 w-4" />
        Lanzar Anuncio en AdFlow
      </button>
    </div>
  );
}
