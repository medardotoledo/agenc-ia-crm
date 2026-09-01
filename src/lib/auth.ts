// Autenticación con Supabase Auth + vínculo con la tabla users del espejo.
import { createBrowserSupabaseClient } from './supabase'
import type { Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  account_id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'agent'
}

export async function signIn(email: string, password: string) {
  const supabase = createBrowserSupabaseClient()
  if (!supabase) throw new Error('Sin conexión a la nube')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  const supabase = createBrowserSupabaseClient()
  await supabase?.auth.signOut()
}

/** Busca el perfil en la tabla users por email y lo vincula al auth user
 *  la primera vez (auth_user_id). Devuelve null si el email no es miembro. */
export async function resolveProfile(session: Session): Promise<Profile | null> {
  if (!supabase) return null
  const email = session.user.email
  if (!email) return null

  const { data: byAuth } = await supabase
    .from('users').select('id, account_id, name, email, role')
    .eq('auth_user_id', session.user.id).maybeSingle()
  if (byAuth) return byAuth as Profile

  const { data: byEmail } = await supabase
    .from('users').select('id, account_id, name, email, role')
    .eq('email', email).maybeSingle()
  if (!byEmail) return null

  await supabase.from('users').update({ auth_user_id: session.user.id }).eq('id', byEmail.id)
  return byEmail as Profile
}
