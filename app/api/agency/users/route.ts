/**
 * /api/agency/users
 *   GET  ?accountId=...  → lista usuarios de una subcuenta
 *   POST → crea un usuario (login) en una subcuenta:
 *          { accountId, name, email, password, role, only_assigned_data, permissions }
 * Solo dueño de agencia (super_admin). La subcuenta debe colgar de su agencia.
 */

import { requireAgencyOwner, authErrorResponse } from '@/core/auth/serverAuth';
import type { SupabaseClient } from '@supabase/supabase-js';

// Verifica que accountId sea una subcuenta de la agencia del que llama.
async function assertOwnsSubAccount(
  svc: SupabaseClient,
  agencyAccountId: string,
  accountId: string
) {
  const { data } = await svc
    .from('accounts')
    .select('id, parent_account_id')
    .eq('id', accountId)
    .maybeSingle();
  if (!data || data.parent_account_id !== agencyAccountId) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);
    const accountId = new URL(request.url).searchParams.get('accountId') || '';
    if (!accountId) return Response.json({ error: 'accountId requerido' }, { status: 400 });
    if (!(await assertOwnsSubAccount(svc, agencyAccountId, accountId))) {
      return Response.json({ error: 'Subcuenta no pertenece a tu agencia' }, { status: 403 });
    }

    const { data, error } = await svc
      .from('users')
      .select('id, name, email, role, is_active, only_assigned_data, permissions, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return Response.json({ users: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);
    const b = await request.json();
    const accountId = String(b?.accountId ?? '');
    const name = String(b?.name ?? '').trim();
    const email = String(b?.email ?? '').trim().toLowerCase();
    const password = String(b?.password ?? '');
    const role = b?.role === 'admin' ? 'admin' : 'agent';
    const onlyAssigned = Boolean(b?.only_assigned_data);
    const permissions = (b?.permissions && typeof b.permissions === 'object') ? b.permissions : {};

    if (!accountId || !name || !email || !password) {
      return Response.json({ error: 'Faltan datos (cuenta, nombre, email, contraseña)' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }
    if (!(await assertOwnsSubAccount(svc, agencyAccountId, accountId))) {
      return Response.json({ error: 'Subcuenta no pertenece a tu agencia' }, { status: 403 });
    }

    // 1) Crear el login en Supabase Auth (admin).
    const { data: created, error: authErr } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr || !created?.user) {
      return Response.json({ error: `No se pudo crear el login: ${authErr?.message ?? 'desconocido'}` }, { status: 400 });
    }

    // 2) Crear la fila en users (Núcleo), ligada a la subcuenta.
    const { data: u, error: insErr } = await svc
      .from('users')
      .insert({
        account_id: accountId,
        auth_user_id: created.user.id,
        role,
        name,
        email,
        permissions,
        only_assigned_data: onlyAssigned,
        is_active: true,
      })
      .select('id, name, email, role, only_assigned_data')
      .single();

    if (insErr) {
      // rollback del login si falló la fila
      await svc.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: `No se pudo crear el usuario: ${insErr.message}` }, { status: 400 });
    }

    return Response.json({ user: u });
  } catch (e) {
    return authErrorResponse(e);
  }
}
