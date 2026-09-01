'use client';

/**
 * Hook: módulos ACTIVOS para una subcuenta (lee account_modules).
 * Devuelve los manifests habilitados, en el orden del registro.
 * Si no hay cuenta o falla la consulta, regresa lista vacía.
 */

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { ALL_MODULES, getModuleManifest } from './registry';
import type { ModuleManifest } from './types';

export function useActiveModules(accountId?: string | null): {
  modules: ModuleManifest[];
  loading: boolean;
} {
  const [modules, setModules] = useState<ModuleManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let mounted = true;
    if (!accountId) {
      setModules([]);
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('account_modules')
        .select('module_key, enabled')
        .eq('account_id', accountId)
        .eq('enabled', true);

      if (!mounted) return;

      if (error) {
        // Si falla la consulta, mostrar todos los módulos como fallback
        setModules(ALL_MODULES);
        setLoading(false);
        return;
      }

      // Si no hay filas configuradas, la cuenta aún no tiene módulos registrados
      // → mostrar todos por defecto (comportamiento hasta que se configure Fase 2)
      if (!data || data.length === 0) {
        setModules(ALL_MODULES);
        setLoading(false);
        return;
      }

      const enabledKeys = new Set(data.map((r) => r.module_key as string));
      setModules(ALL_MODULES.filter((m) => enabledKeys.has(m.key)));
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [accountId]);

  return { modules, loading };
}

export { getModuleManifest };
