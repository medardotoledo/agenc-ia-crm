'use client';

/**
 * ════════════════════════════════════════════════════════════════
 * NÚCLEO · CUENTA ACTIVA (selector de subcuenta, estilo GHL)
 * ════════════════════════════════════════════════════════════════
 * El dueño de Agencia (super_admin) administra varias SUBCUENTAS. Este
 * contexto resuelve en qué subcuenta está operando ahora ("cuenta activa")
 * y permite cambiarla. Para un usuario normal, la cuenta activa es la suya.
 *
 * Las páginas de /admin deben usar `useActiveAccount().account` en lugar de
 * `useAuth().account` para que respeten la subcuenta seleccionada.
 * ════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Account } from '@/types/database';

interface ActiveAccountValue {
  /** Cuenta en la que se está operando (subcuenta seleccionada). */
  account: Account | null;
  /** Cuenta "hogar" del usuario (la suya; para el dueño de agencia, la Agencia). */
  homeAccount: Account | null;
  /** Subcuentas entre las que puede cambiar (para el dueño de agencia). */
  accounts: Account[];
  /** ¿El usuario es dueño de Agencia (ve varias subcuentas)? */
  isAgency: boolean;
  setActiveAccount: (id: string) => void;
  loading: boolean;
}

const Ctx = createContext<ActiveAccountValue | null>(null);

export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const { user, account: homeAccount, role, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();

  const isAgency = role === 'super_admin';

  useEffect(() => {
    let mounted = true;
    if (authLoading) return;
    if (!homeAccount) {
      setLoading(false);
      return;
    }

    (async () => {
      let list: Account[] = [homeAccount];

      // Dueño de agencia: puede operar dentro de sus subcuentas (hijas).
      if (isAgency) {
        const { data } = await supabase
          .from('accounts')
          .select('*')
          .eq('parent_account_id', homeAccount.id)
          .order('name', { ascending: true });
        if (data && data.length > 0) list = data as unknown as Account[];
      }

      if (!mounted) return;
      setAccounts(list);

      // Selección persistida por usuario, o la primera disponible.
      const storeKey = `active_account_${user?.id ?? 'anon'}`;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(storeKey) : null;
      const valid = saved && list.some((a) => a.id === saved) ? saved : list[0]?.id ?? null;
      setActiveId(valid);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [authLoading, homeAccount?.id, role]);

  const setActiveAccount = (id: string) => {
    setActiveId(id);
    if (typeof window !== 'undefined' && user?.id) {
      localStorage.setItem(`active_account_${user.id}`, id);
    }
  };

  const account = accounts.find((a) => a.id === activeId) ?? homeAccount ?? null;

  return (
    <Ctx.Provider
      value={{
        account,
        homeAccount,
        accounts,
        isAgency,
        setActiveAccount,
        loading: authLoading || loading,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useActiveAccount(): ActiveAccountValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useActiveAccount debe usarse dentro de <ActiveAccountProvider>');
  }
  return v;
}
