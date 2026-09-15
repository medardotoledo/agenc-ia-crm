export const dynamic = 'force-dynamic';
import { requireAgencyOwner, authErrorResponse } from '@/core/auth/serverAuth';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || '';

    if (!accountId) {
      return Response.json({ error: 'accountId requerido' }, { status: 400 });
    }

    const { rows } = await pool.query(
      'SELECT location_id, access_token, updated_at FROM ghl_installations WHERE account_id = $1 LIMIT 1;',
      [accountId]
    );

    if (!rows.length) {
      return Response.json({ configured: false, locationId: '', hasToken: false });
    }

    return Response.json({
      configured: true,
      locationId: rows[0].location_id || '',
      hasToken: Boolean(rows[0].access_token),
      updatedAt: rows[0].updated_at,
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const { agencyAccountId, svc } = await requireAgencyOwner(request);
    const body = await request.json();
    const accountId = String(body?.accountId ?? '').trim();
    const locationId = String(body?.locationId ?? '').trim();
    const accessToken = String(body?.accessToken ?? '').trim();

    if (!accountId || !locationId || !accessToken) {
      return Response.json({ error: 'Faltan campos obligatorios (accountId, locationId, accessToken)' }, { status: 400 });
    }

    // Verificar que la subcuenta pertenezca a la agencia
    const { data: acc } = await svc
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('parent_account_id', agencyAccountId)
      .maybeSingle();

    if (!acc) {
      return Response.json({ error: 'Subcuenta no encontrada o no pertenece a tu agencia' }, { status: 403 });
    }

    // Probar token con GHL antes de guardar
    const testRes = await fetch(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    });

    if (!testRes.ok) {
      const errText = await testRes.text();
      console.warn('[GHL Test Connection Failed]', errText);
      return Response.json({
        error: 'GoHighLevel rechazó las credenciales. Verifica que el Location ID y el Token coincidan con esa subcuenta.'
      }, { status: 400 });
    }

    // Guardar en ghl_installations
    await pool.query(`
      INSERT INTO ghl_installations (location_id, access_token, refresh_token, account_id, updated_at)
      VALUES ($1, $2, '', $3, CURRENT_TIMESTAMP)
      ON CONFLICT (location_id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        account_id = EXCLUDED.account_id,
        updated_at = CURRENT_TIMESTAMP;
    `, [locationId, accessToken, accountId]);

    return Response.json({
      success: true,
      message: 'Conexión con GoHighLevel configurada y validada con éxito.',
      locationId,
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
