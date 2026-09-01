'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { AuthSession, User, Account } from '@/types/database';

export type UserRole = 'super_admin' | 'admin' | 'agent';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<Record<string, unknown>>({});
  const [onlyAssignedData, setOnlyAssignedData] = useState(false);
  // id y nombre de la fila en `users` (Núcleo) — para owner_id / autoría en módulos.
  const [userRowId, setUserRowId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let mounted = true;

    // Resuelve el PERFIL del usuario autenticado sobre el Núcleo:
    //   auth.uid() → fila en `users` (rol/permisos + account_id) → `accounts`.
    // Fallback legacy: si aún no hay fila en `users`, usa accounts.user_id.
    // El `account` DEBE quedar poblado antes de apagar `loading` (los guards
    // de /admin redirigen a login si falta).
    async function loadProfile(authUserId: string) {
      // 1) Fila en users (Núcleo): rol, permisos y subcuenta.
      const { data: u } = await supabase
        .from('users')
        .select('id, name, account_id, role, permissions, only_assigned_data')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (!mounted) return;

      let accountId = (u?.account_id as string | undefined) ?? undefined;

      // 2) Fallback legacy por accounts.user_id (usuarios sin fila en users aún).
      if (!accountId) {
        const { data: a } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', authUserId)
          .maybeSingle();
        if (!mounted) return;
        setAccount((a as unknown as Account) ?? null);
        setRole(null);
        setLoading(false);
        return;
      }

      // 3) Cargar la cuenta por id + exponer rol/permisos.
      const { data: acc } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      if (!mounted) return;

      setAccount((acc as unknown as Account) ?? null);
      setRole((u?.role as UserRole) ?? null);
      setPermissions((u?.permissions as Record<string, unknown>) ?? {});
      setOnlyAssignedData(Boolean(u?.only_assigned_data));
      setUserRowId((u?.id as string) ?? null);
      setUserName((u?.name as string) ?? null);
      setLoading(false);
    }

    // ÚNICO listener: onAuthStateChange
    // Supabase automáticamente lee del localStorage al iniciar
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('[useAuth] Auth event:', event, 'has session:', !!session);

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
          });
          // Diferido con setTimeout(0): llamar a la BD DENTRO del callback de
          // onAuthStateChange provoca un deadlock en supabase-js (el callback
          // retiene el lock de auth que la query necesita). Lo sacamos del lock.
          setTimeout(() => {
            void loadProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
          setAccount(null);
          setRole(null);
          setPermissions({});
          setOnlyAssignedData(false);
          setUserRowId(null);
          setUserName(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, agencyName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        // Create account (esquema real: name, subdomain, plan, timezone)
        const subdomain = agencyName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40);

        const { error: accError } = await supabase.from('accounts').insert({
          user_id: data.user.id,
          name: agencyName,
          subdomain: subdomain || `agencia-${data.user.id.slice(0, 8)}`,
          plan: 'free',
          timezone: 'America/Mexico_City',
        });

        if (accError) throw accError;
      }

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      setError(msg);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setAccount(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign out failed';
      setError(msg);
      throw err;
    }
  };

  return {
    user,
    account,
    role,
    permissions,
    onlyAssignedData,
    userRowId,
    userName,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
}
