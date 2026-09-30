'use client';

import { useEffect, useState } from 'react';
import { Edit2, Loader2 } from 'lucide-react';
import { useApp } from '@/store/useApp';
import { useParams } from 'next/navigation';
import ProductForm from '@/modules/crm/components/ProductForm';
import type { Product } from '@/types';

export default function EditProductoPage() {
  const { setSection } = useApp();
  const routeParams = useParams();
  const id = routeParams?.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSection('productos');
  }, [setSection]);

  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        // Obtener producto desde la API
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error('Producto no encontrado');
        const data = await response.json();
        setProduct(data.product);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar el producto';
        setError(message);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-ink-soft">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Error</h1>
          <p className="text-sm text-ink-soft">{error || 'Producto no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Edit2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-ink">Editar Producto</h1>
        </div>
        <p className="text-sm text-ink-soft">
          Actualiza la información de <span className="font-semibold text-ink">{product.name}</span>
        </p>
      </div>

      {/* Form */}
      <ProductForm product={product} isEditing={true} />
    </div>
  );
}
