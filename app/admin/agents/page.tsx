'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from '@/core/account/activeAccount';
import AgentsManager from '@/modules/property-management/components/AgentsManager';

export default function AgentsPage() {
  const { account, loading } = useActiveAccount();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !account) {
      router.push('/auth/login');
    }
  }, [account, loading, router]);

  if (loading) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!account) return null;

  return <AgentsManager accountId={account.id} />;
}
