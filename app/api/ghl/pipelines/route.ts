export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    let locationId = searchParams.get('locationId') || searchParams.get('location_id') || 'OS9czz85LUvBeljk8FEv';

    if (!locationId) {
      return NextResponse.json({ error: 'Falta locationId' }, { status: 400 });
    }

    let resolvedLocationId = locationId;
    let { rows } = await pool.query('SELECT access_token, location_id FROM ghl_installations WHERE location_id = $1 LIMIT 1;', [locationId]);
    if (!rows.length || !rows[0].access_token) {
      const fallback = await pool.query("SELECT access_token, location_id FROM ghl_installations WHERE location_id = 'OS9czz85LUvBeljk8FEv' LIMIT 1;");
      if (fallback.rows.length && fallback.rows[0].access_token) {
        rows = fallback.rows;
        resolvedLocationId = fallback.rows[0].location_id;
      } else {
        const anyActive = await pool.query("SELECT access_token, location_id FROM ghl_installations ORDER BY id DESC LIMIT 1;");
        if (anyActive.rows.length && anyActive.rows[0].access_token) {
          rows = anyActive.rows;
          resolvedLocationId = anyActive.rows[0].location_id;
        } else {
          return NextResponse.json({ error: 'No se configuró el API Key de GoHighLevel para esta subcuenta.' }, { status: 401 });
        }
      }
    }
    const accessToken = rows[0].access_token;

    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${resolvedLocationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (!ghlResponse.ok) {
      const errorData = await ghlResponse.text();
      console.error('[GHL Pipelines API Error]', errorData);
      return NextResponse.json({ error: 'Error al consultar GHL Pipelines API' }, { status: ghlResponse.status });
    }

    const ghlData = await ghlResponse.json();
    return NextResponse.json(ghlData);
  } catch (error: any) {
    console.error('Error in /api/ghl/pipelines:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





