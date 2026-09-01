/**
 * /api/agency/sub-accounts
 *   GET  → lista las subcuentas (inmobiliarias) de la agencia del usuario
 *   POST → crea una subcuenta { name, modules: string[] }
 * Solo dueño de agencia (super_admin). Usa service role.
 */

import {
  requireAgencyOwner,
  authErrorResponse,
  slugify,
} from '@/core/auth/serverAuth';
import { ensureDefaultPipeline } from '@/modules/crm/server/pipeline';

export async function GET(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);

    const { data: subs, error } = await svc
      .from('accounts')
      .select('id, name, subdomain, plan, created_at')
      .eq('parent_account_id', agencyAccountId)
      .order('name', { ascending: true });
    if (error) throw error;

    // Módulos activos por subcuenta (para mostrarlos en el panel).
    const ids = (subs ?? []).map((s) => s.id);
    let modulesByAccount: Record<string, string[]> = {};
    if (ids.length) {
      const { data: mods } = await svc
        .from('account_modules')
        .select('account_id, module_key, enabled')
        .in('account_id', ids)
        .eq('enabled', true);
      modulesByAccount = (mods ?? []).reduce((acc, m) => {
        (acc[m.account_id] ??= []).push(m.module_key);
        return acc;
      }, {} as Record<string, string[]>);
    }

    return Response.json({
      subAccounts: (subs ?? []).map((s) => ({
        ...s,
        modules: modulesByAccount[s.id] ?? [],
      })),
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const modules: string[] = Array.isArray(body?.modules) ? body.modules : [];

    if (!name) {
      return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    // subdominio único
    const base = slugify(name);
    let subdomain = base;
    for (let i = 1; i < 50; i++) {
      const { data: clash } = await svc
        .from('accounts')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle();
      if (!clash) break;
      subdomain = `${base}-${i}`;
    }

    const { data: acc, error } = await svc
      .from('accounts')
      .insert({
        name,
        subdomain,
        plan: 'free',
        parent_account_id: agencyAccountId,
      })
      .select()
      .single();
    if (error) throw error;

    if (modules.length) {
      await svc
        .from('account_modules')
        .insert(modules.map((m) => ({ account_id: acc.id, module_key: m })));
    }

    // Si se activó el CRM, sembrar su pipeline + etapas por defecto.
    if (modules.includes('crm')) {
      await ensureDefaultPipeline(svc, acc.id);
    }

    return Response.json({ account: acc, modules });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);
    const body = await request.json();
    const accountId = String(body?.accountId ?? '');
    const modules: string[] = Array.isArray(body?.modules) ? body.modules : [];

    if (!accountId) {
      return Response.json({ error: 'accountId es obligatorio' }, { status: 400 });
    }

    // Verificar que la subcuenta pertenezca a la agencia
    const { data: acc } = await svc
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('parent_account_id', agencyAccountId)
      .single();

    if (!acc) {
      return Response.json({ error: 'Subcuenta no encontrada o no pertenece a tu agencia' }, { status: 403 });
    }

    // Eliminar módulos anteriores e insertar los nuevos activos
    await svc.from('account_modules').delete().eq('account_id', accountId);

    if (modules.length > 0) {
      await svc
        .from('account_modules')
        .insert(modules.map((m) => ({ account_id: accountId, module_key: m, enabled: true })));
    }

    return Response.json({ success: true, modules });
  } catch (e) {
    return authErrorResponse(e);
  }
}

