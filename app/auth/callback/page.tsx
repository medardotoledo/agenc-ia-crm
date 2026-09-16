'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusText, setStatusText] = useState('Iniciando sesión con Google...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const code = searchParams.get('code');

    if (code) {
      setStatusText('Validando credenciales con Google...');
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('[Auth Callback] Code exchange error:', error.message);
          setErrorMsg(error.message);
          setTimeout(() => router.push('/auth/login'), 2500);
        } else {
          setStatusText('¡Acceso concedido! Entrando a tu panel...');
          router.replace('/admin');
        }
      });
      return;
    }

    // Para flujo con fragmentos hash (#access_token=...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setStatusText('¡Acceso concedido! Entrando a tu panel...');
        router.replace('/admin');
      }
    });

    // Fallback: revisar sesión activa en cliente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatusText('¡Acceso concedido! Entrando a tu panel...');
        router.replace('/admin');
      } else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s2 } }) => {
            if (s2) {
              router.replace('/admin');
            } else {
              router.replace('/admin');
            }
          });
        }, 1200);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"></div>
        <div className="text-base font-medium text-slate-200">
          {errorMsg ? (
            <span className="text-red-400">Error: {errorMsg}. Volviendo al login...</span>
          ) : (
            statusText
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"></div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
