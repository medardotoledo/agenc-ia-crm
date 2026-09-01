'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from '@/design-system/useTheme';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  href: string | null;
  position: number;
}

export function FeaturedLocations() {
  const { account_id } = useTheme();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account_id) return;
    fetch(`/api/website/zones?accountId=${account_id}`)
      .then((r) => r.json())
      .then((d) => setZones(d.zones ?? []))
      .finally(() => setLoading(false));
  }, [account_id]);

  if (loading || zones.length === 0) return null;

  return (
    <section className="py-20 md:py-32 bg-soft">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wide">
            Ubicaciones Exclusivas
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-ink mt-4">
            Zonas Destacadas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {zones.map((zone) => (
            <Link
              key={zone.id}
              href={zone.href ?? `/propiedades/?q=${encodeURIComponent(zone.name)}`}
              className="group relative rounded-xl overflow-hidden h-64 md:h-80 hover:shadow-2xl transition-all bg-gradient-to-br from-primary to-primary-light"
            >
              {zone.image_url && (
                <img
                  src={zone.image_url}
                  alt={zone.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all" />
              <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
                <h3 className="text-2xl md:text-3xl font-bold text-inverse mb-3">
                  {zone.name}
                </h3>
                {zone.description && (
                  <p className="text-inverse/90 text-sm md:text-base leading-relaxed">
                    {zone.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
