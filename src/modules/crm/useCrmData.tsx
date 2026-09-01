'use client';

/**
 * Hook compartido por las páginas del módulo CRM: carga los datos de la
 * SUBCUENTA ACTIVA en el store (idempotente por dependencias) y aplica
 * "solo datos asignados" según rol. Devuelve la cuenta + estado de carga.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveAccount } from '@/core/account/activeAccount';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/store/useApp';

export function useCrmData() {
  const { account, loading } = useActiveAccount();
  const { user, userRowId, userName, role, onlyAssignedData } = useAuth();
  const router = useRouter();
  const loadAccountData = useApp((s) => s.loadAccountData);

  useEffect(() => {
    if (loading) return;
    if (!account) {
      router.push('/auth/login');
      return;
    }
    const effectiveUserId = userRowId || user?.id || 'admin-user';
    loadAccountData(
      account.id,
      effectiveUserId,
      userName ?? user?.email ?? 'Administrador',
      role ?? 'super_admin',
      onlyAssignedData
    );
  }, [account?.id, userRowId, user?.id, userName, role, loading, onlyAssignedData, loadAccountData, router]);

  return { account, loading };
}
