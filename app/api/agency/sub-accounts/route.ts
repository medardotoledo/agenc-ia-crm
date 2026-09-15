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
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

    // Buscar qué subcuentas tienen GoHighLevel configurado en PostgreSQL
    let ghlByAccount = new Map<string, string>();
    try {
      const { rows: ghlRows } = await pool.query('SELECT location_id, account_id FROM ghl_installations WHERE account_id IS NOT NULL;');
      ghlByAccount = new Map(ghlRows.map(r => [r.account_id, r.location_id]));
    } catch (err: any) {
      console.warn('[sub-accounts GET] GHL installations query warning:', err.message);
    }

    return Response.json({
      subAccounts: (subs ?? []).map((s) => ({
        ...s,
        modules: modulesByAccount[s.id] ?? [],
        ghlLocationId: ghlByAccount.get(s.id) || null,
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

    // Si se enviaron credenciales de GoHighLevel, guardarlas
    const ghlLocationId = String(body?.ghlLocationId ?? '').trim();
    const ghlToken = String(body?.ghlToken ?? '').trim();
    if (ghlLocationId && ghlToken) {
      try {
        await pool.query(`
          INSERT INTO ghl_installations (location_id, access_token, refresh_token, account_id, updated_at)
          VALUES ($1, $2, '', $3, CURRENT_TIMESTAMP)
          ON CONFLICT (location_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            account_id = EXCLUDED.account_id,
            updated_at = CURRENT_TIMESTAMP;
        `, [ghlLocationId, ghlToken, acc.id]);
      } catch (err: any) {
        console.warn('[sub-accounts POST] GHL save error:', err.message);
      }
    }

    return Response.json({ account: acc, modules, ghlLocationId: ghlLocationId || null });
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

