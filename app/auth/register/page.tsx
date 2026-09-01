'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { signUp } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signUp(email, password, agencyName);
      // Wait for confirmation email in production
      // For now, redirect to login
      router.push('/auth/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Real Estate SaaS</h1>
          <p className="text-slate-400">Crea tu cuenta de inmobiliaria</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Nuevo registro</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 text-red-400 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Agency Name */}
            <div>
              <label htmlFor="agencyName" className="block text-sm font-medium text-slate-300 mb-1">
                Nombre de la Agencia
              </label>
              <input
                id="agencyName"
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Mi Inmobiliaria"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@agencia.com"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded focus:outline-none focus:border-blue-500 transition"
                minLength={8}
                required
              />
              <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded transition"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-sm text-slate-500">o</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-sm text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Inicia sesión aquí
            </Link>
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded text-center text-xs text-slate-500">
          <p>
            Al registrarte, aceptas nuestros{' '}
            <Link href="#" className="text-blue-400 hover:text-blue-300">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link href="#" className="text-blue-400 hover:text-blue-300">
              Política de Privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
