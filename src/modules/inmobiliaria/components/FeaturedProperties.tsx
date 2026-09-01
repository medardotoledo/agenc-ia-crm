'use client';

/**
 * ════════════════════════════════════════════════════════════════
 * FEATURED PROPERTIES — Propiedades destacadas
 * ════════════════════════════════════════════════════════════════
 * Carga propiedades reales desde BD (EasyBroker sync)
 */

import Link from 'next/link';
import { useProperties } from '@/hooks/useProperties';
import { useTheme } from '@/design-system/useTheme';

export function FeaturedProperties() {
  const { account_id } = useTheme();
  const { properties, isLoading, error } = useProperties(account_id, {
    featured: true,
    limit: 6,
  });

  // Fallback mientras carga
  if (isLoading) {
    return (
      <section className="py-20 md:py-32 bg-app">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-accent font-semibold text-sm uppercase tracking-wide">
                Nuestro Catálogo
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-ink mt-4">
                Propiedades destacadas
              </h2>
            </div>
            <Link
              href="/propiedades"
              className="text-primary font-bold hover:text-primary-light transition-colors"
            >
              Ver todo el catálogo →
            </Link>
          </div>
          <div className="text-center text-ink-soft">Cargando propiedades...</div>
        </div>
      </section>
    );
  }

  // Si hay error
  if (error) {
    console.error('[FeaturedProperties] Error:', error);
    return (
      <section className="py-20 md:py-32 bg-app">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center text-red-600">
            Error al cargar propiedades: {error.message}
          </div>
        </div>
      </section>
    );
  }

  // Si no hay propiedades destacadas
  if (!properties || properties.length === 0) {
    return (
      <section className="py-20 md:py-32 bg-app">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center text-ink-soft">
            No hay propiedades destacadas aún. Configura EasyBroker para importar.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-32 bg-app">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <span className="text-accent font-semibold text-sm uppercase tracking-wide">
              Nuestro Catálogo
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-ink mt-4">
              Propiedades destacadas
            </h2>
          </div>
          <Link
            href="/propiedades"
            className="text-primary font-bold hover:text-primary-light transition-colors"
          >
            Ver todo el catálogo →
          </Link>
        </div>

        {/* Grid de propiedades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/p/${property.slug || property.id}`}
              className="group bg-soft rounded-lg overflow-hidden hover:shadow-xl transition-all border border-line hover:border-accent"
            >
              {/* Imagen */}
              <div className="h-48 bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-6xl group-hover:scale-105 transition-transform overflow-hidden">
                {property.gallery_images?.[0] ? (
                  <img
                    src={property.gallery_images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>🏠</span>
                )}
              </div>

              {/* Contenido */}
              <div className="p-6">
                {/* Tipo y ubicación */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      property.operation === 'Renta'
                        ? 'bg-success/20 text-success'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {property.operation}
                  </span>
                  <p className="text-xs text-ink-soft">{property.city}</p>
                </div>

                {/* Título */}
                <h3 className="text-lg font-bold text-ink mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {property.title}
                </h3>

                {/* Precio */}
                <div className="text-2xl font-bold text-primary mb-4">
                  ${property.price?.toLocaleString('es-MX')} {property.currency}
                </div>

                {/* Specs */}
                <div className="flex gap-4 text-sm text-ink-soft mb-4 pb-4 border-b border-line">
                  {property.bedrooms && (
                    <span>🛏️ {property.bedrooms} rec</span>
                  )}
                  {property.bathrooms && (
                    <span>🚿 {property.bathrooms} baños</span>
                  )}
                  {property.construction_sqm && (
                    <span>📏 {property.construction_sqm} m²</span>
                  )}
                </div>

                {/* CTA */}
                <div className="text-primary font-bold text-sm group-hover:text-primary-light transition-colors">
                  Ver propiedad →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
