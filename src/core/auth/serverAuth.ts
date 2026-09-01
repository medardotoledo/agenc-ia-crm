/**
 * ════════════════════════════════════════════════════════════════
 * NÚCLEO · AUTENTICACIÓN DE SERVIDOR (service role)
 * ════════════════════════════════════════════════════════════════
 * Helpers para endpoints de Agencia que necesitan saltarse RLS y usar
 * la Admin API de Supabase Auth (crear logins). SOLO en el servidor.
 * ════════════════════════════════════════════════════════════════
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Cliente con service role (bypassa RLS). Nunca exponer al navegador. */
export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new AuthError(500, 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Verifica que quien llama sea DUEÑO DE AGENCIA (super_admin).
 * El cliente debe mandar el access token en `Authorization: Bearer <token>`.
 * Devuelve el cliente service-role y el id de la cuenta de agencia.
 */
export async function requireAgencyOwner(request: Request): Promise<{
  authUserId: string;
  agencyAccountId: string;
  svc: SupabaseClient;
}> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AuthError(401, 'Falta token de sesión');

  const svc = getServiceClient();
  const {
    data: { user },
    error,
  } = await svc.auth.getUser(token);
  if (error || !user) throw new AuthError(401, 'Sesión inválida');

  const { data: u } = await svc
    .from('users')
    .select('account_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!u) throw new AuthError(403, 'Usuario sin perfil en el Núcleo');
  if (u.role !== 'super_admin') throw new AuthError(403, 'Solo el dueño de agencia puede hacer esto');

  return { authUserId: user.id, agencyAccountId: u.account_id as string, svc };
}

/** Respuesta de error uniforme para los endpoints. */
export function authErrorResponse(e: unknown): Response {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : String(e);
  return Response.json({ error: msg }, { status: 500 });
}

/** Slug simple para subdominios/identificadores. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'subcuenta'
  );
}
