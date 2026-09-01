'use client';

import { useActiveAccount } from '@/core/account/activeAccount';
import PropertyList from '@/modules/property-management/components/PropertyList';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PropertiesPage() {
  // Usa la subcuenta ACTIVA (no la del login) — clave para el dueño de agencia.
  const { account, loading } = useActiveAccount();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !account) {
      router.push('/auth/login');
    }
  }, [account, loading, router]);

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  if (!account) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Propiedades</h1>
          <p className="mt-1 text-sm text-ink-soft">Gestiona todas tus propiedades inmobiliarias</p>
        </div>
        <Link
          href="/admin/properties/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse transition-colors hover:bg-primary-light"
        >
          + Nueva Propiedad
        </Link>
      </div>

      {/* List */}
      <PropertyList accountId={account.id} />
    </div>
  );
}
