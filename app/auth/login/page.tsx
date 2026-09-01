'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data?.user) throw new Error('No user returned');

      // Esperar a que la sesión esté lista (pequeño delay para sincronización)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirigir a admin
      router.push('/admin/properties');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Real Estate SaaS</h1>
          <p className="text-slate-400">Panel de Control Inmobiliario</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Inicia sesión</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 text-red-400 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded transition"
            >
              {loading ? 'Iniciando sesión...' : 'Inicia sesión'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-sm text-slate-500">o</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          <p className="text-center text-sm text-slate-400">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded text-center text-xs text-slate-500">
          <p className="mb-2">Demo (desarrollo):</p>
          <p className="font-mono text-slate-400">
            test@example.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
