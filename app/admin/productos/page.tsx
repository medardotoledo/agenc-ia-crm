'use client';

/**
 * Módulo CRM · Mis Productos & Servicios
 * CRUD de productos con Oferta Irresistible, agente asignado y botón
 * destacado para lanzar anuncios en AdFlow.
 */

import { useEffect } from 'react';
import { Package } from 'lucide-react';
import { useApp } from '@/store/useApp';
import ProductsServicesView from '@/modules/crm/components/ProductsServicesView';

export default function ProductosPage() {
  const { setSection } = useApp();

  useEffect(() => {
    setSection('productos');
  }, [setSection]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-ink">Mis Productos & Servicios</h1>
        </div>
        <p className="text-sm text-ink-soft">
          Configura tu catálogo de productos y servicios. Cada producto tiene su propia Oferta Irresistible y agente IA asignado para atender leads.
        </p>
      </div>

      {/* Component */}
      <ProductsServicesView />
    </div>
  );
}
