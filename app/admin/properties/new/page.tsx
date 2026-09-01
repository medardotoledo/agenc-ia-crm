'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from '@/core/account/activeAccount';
import PropertyForm from '@/modules/property-management/components/PropertyForm';

export default function NewPropertyPage() {
  const { account, loading } = useActiveAccount();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !account) {
      router.push('/auth/login');
    }
  }, [account, loading, router]);

  if (loading) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!account) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/properties" className="text-sm text-ink-soft hover:underline">← Volver a propiedades</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Nueva propiedad</h1>
        </div>
      </div>

      <PropertyForm
        accountId={account.id}
        onSaved={(p) => router.push(`/admin/properties/${p.id}`)}
      />
    </div>
  );
}
