'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useActiveAccount } from '@/core/account/activeAccount';
import { Badge } from '@/design-system';
import PropertyForm from '@/modules/property-management/components/PropertyForm';
import { propertyService } from '@/modules/property-management/services/propertyService';
import type { Property } from '@/types/database';

export default function EditPropertyPage() {
  const { account, loading } = useActiveAccount();
  const router = useRouter();
  const params = useParams();
  const propertyId = String(params.id);

  const [property, setProperty] = useState<Property | null>(null);
  const [loadingProp, setLoadingProp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !account) {
      router.push('/auth/login');
    }
  }, [account, loading, router]);

  useEffect(() => {
    if (!account) return;
    propertyService
      .getById(account.id, propertyId)
      .then(setProperty)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => setLoadingProp(false));
  }, [account, propertyId]);

  if (loading || loadingProp) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!account) return null;

  if (error || !property) {
    return (
      <div className="space-y-4">
        <Link href="/admin/properties" className="text-sm text-ink-soft hover:underline">← Volver a propiedades</Link>
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger">
          {error ?? 'Propiedad no encontrada'}
        </div>
      </div>
    );
  }

  const refresh = async () => {
    const fresh = await propertyService.getById(account.id, propertyId);
    setProperty(fresh);
  };

  const handlePublishToggle = async () => {
    setBusy(true);
    try {
      if (property.is_published) await propertyService.unpublish(account.id, propertyId);
      else await propertyService.publish(account.id, propertyId);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleFeaturedToggle = async () => {
    setBusy(true);
    try {
      await propertyService.toggleFeatured(account.id, propertyId);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Seguro que quieres eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    setBusy(true);
    try {
      await propertyService.delete(account.id, propertyId);
      router.push('/admin/properties');
    } catch (e) {
      setBusy(false);
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/properties" className="text-sm text-ink-soft hover:underline">← Volver a propiedades</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{property.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={property.is_published ? 'success' : 'warning'}>
              {property.is_published ? '✓ Publicada' : 'Borrador'}
            </Badge>
            {property.is_featured && <Badge tone="info">⭐ Destacada</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {property.is_published && (
            <a
              href={`/p/${property.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-line bg-app px-3 py-2 text-sm font-semibold text-primary-light hover:bg-soft"
            >
              Ver página pública ↗
            </a>
          )}
          <button onClick={handleFeaturedToggle} disabled={busy} className="rounded-lg border border-line bg-app px-3 py-2 text-sm font-semibold text-ink hover:bg-soft disabled:opacity-50">
            {property.is_featured ? 'Quitar destacada' : 'Destacar'}
          </button>
          <button onClick={handlePublishToggle} disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-inverse hover:bg-primary-light disabled:opacity-50">
            {property.is_published ? 'Despublicar' : 'Publicar'}
          </button>
          <button onClick={handleDelete} disabled={busy} className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/20 disabled:opacity-50">
            Eliminar
          </button>
        </div>
      </div>

      <PropertyForm accountId={account.id} initialProperty={property} onSaved={setProperty} />
    </div>
  );
}
