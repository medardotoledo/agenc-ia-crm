'use client';

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '@/store/useApp';
import ProductForm from '@/modules/crm/components/ProductForm';

export default function NuevoProductoPage() {
  const { setSection } = useApp();

  useEffect(() => {
    setSection('productos');
  }, [setSection]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Plus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-ink">Crear Nuevo Producto</h1>
        </div>
        <p className="text-sm text-ink-soft">
          Agrega un nuevo producto o servicio a tu catálogo. Este será el que verán los leads en tus anuncios de AdFlow.
        </p>
      </div>

      {/* Form */}
      <ProductForm />
    </div>
  );
}
