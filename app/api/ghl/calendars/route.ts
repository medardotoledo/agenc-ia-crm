export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || searchParams.get('location_id') || 'OS9czz85LUvBeljk8FEv';

    if (!locationId) {
      return NextResponse.json({ error: 'Falta locationId' }, { status: 400 });
    }

    // 1. Obtener token de la base de datos PostgreSQL
    let accessToken: string | null = null;
    try {
      const { rows } = await pool.query(
        'SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;',
        [locationId]
      );
      if (rows.length && rows[0].access_token) {
        accessToken = rows[0].access_token;
      }
    } catch (dbErr: any) {
      console.warn('[GHL Calendars] DB Query fallback:', dbErr.message);
    }

    if (!accessToken) {
      accessToken = process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
    }

    // 2. Consultar API de Calendarios en GoHighLevel
    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-04-15',
        'Accept': 'application/json',
      },
    });

    if (!ghlResponse.ok) {
      const errorData = await ghlResponse.json().catch(() => ({}));
      const isScopeError = ghlResponse.status === 401 && (errorData?.message?.includes('scope') || errorData?.error?.includes('scope'));
      return NextResponse.json(
        {
          error: errorData?.message || 'Error al consultar calendarios de GoHighLevel',
          isScopeError,
          calendars: [],
        },
        { status: ghlResponse.status }
      );
    }

    const data = await ghlResponse.json();
    return NextResponse.json({
      calendars: data.calendars || [],
      total: data.calendars?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in /api/ghl/calendars:', error);
    return NextResponse.json({ error: error.message, calendars: [] }, { status: 500 });
  }
}
