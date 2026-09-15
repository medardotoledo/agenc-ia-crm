export const dynamic = 'force-dynamic';
import { requireAgencyOwner, authErrorResponse } from '@/core/auth/serverAuth';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);
    const body = await request.json();
    const accountId = String(body?.accountId ?? '');

    if (!accountId) {
      return Response.json({ error: 'accountId requerido' }, { status: 400 });
    }

    // 1. Verificar que la subcuenta pertenezca a la agencia
    const { data: acc } = await svc
      .from('accounts')
      .select('id, name, parent_account_id')
      .eq('id', accountId)
      .maybeSingle();

    if (!acc || acc.parent_account_id !== agencyAccountId) {
      return Response.json({ error: 'Subcuenta no pertenece a tu agencia' }, { status: 403 });
    }

    // 2. Obtener la credencial de GHL para esta subcuenta
    const { rows } = await pool.query(
      'SELECT location_id, access_token FROM ghl_installations WHERE account_id = $1 OR location_id = $1 LIMIT 1;',
      [accountId]
    );

    if (!rows.length || !rows[0].access_token) {
      return Response.json({
        error: 'No se ha configurado la conexión de GoHighLevel (Location ID y Token) para esta subcuenta.'
      }, { status: 400 });
    }

    const { location_id, access_token } = rows[0];

    // 3. Consultar usuarios en GoHighLevel
    const ghlRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${location_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    });

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      console.error('[GHL Sync Users Error]', errText);
      return Response.json({ error: `Error al consultar usuarios en GHL: ${ghlRes.statusText}` }, { status: ghlRes.status });
    }

    const ghlData = await ghlRes.json();
    const ghlUsers: any[] = ghlData.users || [];

    if (!ghlUsers.length) {
      return Response.json({ success: true, count: 0, message: 'No se encontraron usuarios en GoHighLevel para esta ubicación.' });
    }

    // 4. Obtener usuarios existentes en Supabase para este account_id
    const { data: existingUsers } = await svc
      .from('users')
      .select('id, email, auth_user_id')
      .eq('account_id', accountId);

    const existingEmails = new Map<string, any>((existingUsers || []).map(u => [u.email.toLowerCase(), u]));

    // Obtener todos los auth users para reutilizar ID si ya existen en Supabase Auth
    const { data: authUsersData } = await svc.auth.admin.listUsers({ perPage: 1000 });
    const authUsersByEmail = new Map<string, string>(
      (authUsersData?.users || []).map(au => [(au.email || '').toLowerCase(), au.id])
    );

    const syncedResults: any[] = [];

    for (const gu of ghlUsers) {
      const email = (gu.email || '').trim().toLowerCase();
      if (!email) continue;

      const name = (gu.name || `${gu.firstName || ''} ${gu.lastName || ''}`).trim() || 'Usuario GHL';
      const isGhlAdmin = gu.roles?.role === 'admin' || gu.roles?.type === 'admin';
      const role = isGhlAdmin ? 'admin' : 'agent';

      let authUserId = authUsersByEmail.get(email);

      // Si no existe login en Supabase Auth, crearlo
      if (!authUserId) {
        const defaultPassword = 'DentalArt2026!' + Math.floor(100 + Math.random() * 900);
        const { data: createdAuth, error: authErr } = await svc.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { name },
        });

        if (!authErr && createdAuth?.user) {
          authUserId = createdAuth.user.id;
          authUsersByEmail.set(email, authUserId);
        }
      }

      if (!authUserId) continue;

      const existingInSub = existingEmails.get(email);
      if (existingInSub) {
        // Actualizar datos del usuario existente
        const { data: updated } = await svc
          .from('users')
          .update({
            name,
            role,
            is_active: true,
          })
          .eq('id', existingInSub.id)
          .select('id, name, email, role')
          .single();

        if (updated) syncedResults.push(updated);
      } else {
        // Insertar nuevo usuario en la subcuenta
        const { data: inserted, error: insErr } = await svc
          .from('users')
          .insert({
            account_id: accountId,
            auth_user_id: authUserId,
            name,
            email,
            role,
            is_active: true,
            only_assigned_data: false,
          })
          .select('id, name, email, role')
          .single();

        if (!insErr && inserted) {
          syncedResults.push(inserted);
        }
      }
    }

    return Response.json({
      success: true,
      count: syncedResults.length,
      users: syncedResults,
      message: `Se sincronizaron ${syncedResults.length} usuario(s) correctamente desde GoHighLevel.`
    });
  } catch (e) {
    console.error('Error in /api/agency/users/sync-ghl:', e);
    return authErrorResponse(e);
  }
}
