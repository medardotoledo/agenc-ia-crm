'use client';

/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * NÃšCLEO Â· CUENTA ACTIVA (selector de subcuenta, estilo GHL)
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * El dueÃ±o de Agencia (super_admin) administra varias SUBCUENTAS. Este
 * contexto resuelve en quÃ© subcuenta estÃ¡ operando ahora ("cuenta activa")
 * y permite cambiarla. Para un usuario normal, la cuenta activa es la suya.
 *
 * Las pÃ¡ginas de /admin deben usar `useActiveAccount().account` en lugar de
 * `useAuth().account` para que respeten la subcuenta seleccionada.
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Account } from '@/types/database';

interface ActiveAccountValue {
  /** Cuenta en la que se estÃ¡ operando (subcuenta seleccionada). */
  account: Account | null;
  /** Cuenta "hogar" del usuario (la suya; para el dueÃ±o de agencia, la Agencia). */
  homeAccount: Account | null;
  /** Subcuentas entre las que puede cambiar (para el dueÃ±o de agencia). */
  accounts: Account[];
  /** Â¿El usuario es dueÃ±o de Agencia (ve varias subcuentas)? */
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

      // DueÃ±o de agencia: puede operar dentro de sus subcuentas (hijas).
      if (isAgency) {
        list = [homeAccount];
      }

      if (!mounted) return;
      setAccounts(list);

      // SelecciÃ³n persistida por usuario, o la primera disponible.
      const storeKey = `active_account_${user?.id ?? 'anon'}`;
      const saved = typeof window !== 'undefined' ? (function(){try{return localStorage.getItem(storeKey)}catch(e){return null}})() : null;
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


