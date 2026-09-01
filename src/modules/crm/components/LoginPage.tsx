import { useState } from 'react'
import { Lock, Mail, LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage({ onDemo }: { onDemo?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn } = useAuth()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      console.log('[LoginPage] Attempting sign in...')
      await signIn(email.trim(), password)
      console.log('[LoginPage] Sign in successful')
      // onAuthStateChange en App se encarga del resto
    } catch (err) {
      const msg = (err as Error).message
      console.error('[LoginPage] Sign in error:', msg)
      setError(msg.includes('Invalid login') ? 'Correo o contraseña incorrectos' : msg)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark p-4">
      <div className="animate-rise w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold tracking-tight text-inverse">Lead-Suite</div>
          <div className="mt-1 text-[11px] font-bold tracking-[0.18em] text-accent">BY MARCADOTECN-IA</div>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-app p-6 shadow-2xl">
          <h1 className="mb-1 text-lg font-bold">Inicia sesión</h1>
          <p className="mb-5 text-sm text-ink-soft">Tu CRM agéntico te está esperando</p>

          <label className="mb-1 block text-xs font-semibold text-ink-soft">Correo electrónico</label>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-soft/50 px-3 focus-within:border-primary-light">
            <Mail size={15} className="shrink-0 text-ink-soft" />
            <input
              type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com" autoComplete="email"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>

          <label className="mb-1 block text-xs font-semibold text-ink-soft">Contraseña</label>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-soft/50 px-3 focus-within:border-primary-light">
            <Lock size={15} className="shrink-0 text-ink-soft" />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-stage-lost-bg px-3 py-2 text-xs font-semibold text-stage-lost-text">{error}</p>
          )}

          <button
            type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-inverse hover:bg-primary-light disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Entrar
          </button>

          <p className="mt-4 text-center text-[11px] text-ink-soft">
            ¿No tienes cuenta? Pídele acceso al administrador de tu equipo.
          </p>
        </form>

        {process.env.NODE_ENV === 'development' && onDemo && (
          <button onClick={onDemo} className="mt-4 w-full text-center text-xs text-inverse/40 hover:text-inverse/70">
            Continuar en modo demo (solo desarrollo) →
          </button>
        )}
      </div>
    </div>
  )
}
