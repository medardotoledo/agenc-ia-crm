export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    let locationId = searchParams.get('locationId') || cookieStore.get('ghl_location_id')?.value;

    if (!locationId) {
      return NextResponse.json({ error: 'Falta locationId' }, { status: 400 });
    }

    const query = `SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;`;
    const { rows } = await pool.query(query, [locationId]);

    if (rows.length === 0 || !rows[0].access_token) {
      return NextResponse.json({ error: 'La cuenta no ha sido conectada o falta el token.' }, { status: 401 });
    }

    const accessToken = rows[0].access_token;

    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`, {
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

