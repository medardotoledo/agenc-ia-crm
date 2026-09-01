'use client';

/**
 * Hook ergonómico de permisos del Núcleo.
 * Uso:
 *   const { can, isAccountAdmin } = usePermissions();
 *   if (can('properties.edit')) { ... }
 */

import { useAuth } from '@/hooks/useAuth';
import { can, isAgencyOwner, isAccountAdmin } from './permissions';

export function usePermissions() {
  const { role, permissions, onlyAssignedData } = useAuth();
  return {
    role,
    onlyAssignedData,
    can: (key: string) => can(role, permissions, key),
    isAgencyOwner: isAgencyOwner(role),
    isAccountAdmin: isAccountAdmin(role),
  };
}
