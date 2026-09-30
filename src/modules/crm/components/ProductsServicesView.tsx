'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Rocket, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useApp } from '@/store/useApp';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types';

interface ProductWithAgent extends Product {
  agent_name?: string;
  agent_avatar?: string;
  irresistible_offer?: string;
}

export default function ProductsServicesView() {
  const router = useRouter();
  const { ctx } = useApp();
  const [products, setProducts] = useState<ProductWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const url = ctx?.accountId ? `/api/adflow/products?accountId=${ctx.accountId}` : '/api/adflow/products';
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
  }, [ctx?.accountId]);

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
          <h3 className="font-semibold text-ink">{product.name}</h3>
          <p className="text-xs text-ink-soft">Producto / Servicio</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(product.id)}
            className="p-1.5 text-ink-soft transition-colors hover:bg-line hover:text-ink rounded"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 text-ink-soft transition-colors hover:bg-red-500/10 hover:text-red-500 rounded"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Oferta Irresistible */}
      {product.irresistible_offer && (
        <div className="mb-4 rounded-md bg-app-light p-3">
          <p className="text-xs font-semibold text-ink-soft mb-1">
            📢 Oferta Irresistible
          </p>
          <p className="text-sm text-ink line-clamp-2">
            {product.irresistible_offer}
          </p>
        </div>
      )}

      {/* Agente asignado */}
      {product.agent_name && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-app-light p-3">
          {avatar && (
            <img
              src={avatar}
              alt={product.agent_name}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <div className="text-xs">
            <p className="font-semibold text-ink-soft">Agente Asignado</p>
            <p className="text-ink">{product.agent_name}</p>
          </div>
        </div>
      )}

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
