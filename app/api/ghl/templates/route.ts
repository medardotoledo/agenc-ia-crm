export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getInstallation(locationId: string): Promise<{ accessToken: string; locationId: string }> {
  try {
    let { rows } = await pool.query(
      'SELECT access_token, location_id FROM ghl_installations WHERE location_id = $1 OR account_id = $1 LIMIT 1;',
      [locationId]
    );
    if (rows.length && rows[0].access_token) {
      return { accessToken: rows[0].access_token, locationId: rows[0].location_id };
    }
    const fallback = await pool.query("SELECT access_token, location_id FROM ghl_installations WHERE location_id = 'OS9czz85LUvBeljk8FEv' LIMIT 1;");
    if (fallback.rows.length && fallback.rows[0].access_token) {
      return { accessToken: fallback.rows[0].access_token, locationId: fallback.rows[0].location_id };
    }
    const anyActive = await pool.query("SELECT access_token, location_id FROM ghl_installations ORDER BY id DESC LIMIT 1;");
    if (anyActive.rows.length && anyActive.rows[0].access_token) {
      return { accessToken: anyActive.rows[0].access_token, locationId: anyActive.rows[0].location_id };
    }
  } catch (err: any) {
    console.warn('[GHL Templates API] DB Query error:', err.message);
  }
  return {
    accessToken: process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966',
    locationId: 'OS9czz85LUvBeljk8FEv'
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || searchParams.get('location_id') || 'OS9czz85LUvBeljk8FEv';

    const { accessToken, locationId: resolvedLocationId } = await getInstallation(locationId);
    const ghlHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-07-28',
      Accept: 'application/json',
    };

    const ghlUrl = `https://services.leadconnectorhq.com/locations/${resolvedLocationId}/templates`;
    const ghlRes = await fetch(ghlUrl, { headers: ghlHeaders });

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      console.error('[GHL Templates Error]', errText);
      return NextResponse.json({ error: 'Error al consultar plantillas de GHL' }, { status: ghlRes.status });
    }

    const data = await ghlRes.json();
    const rawTemplates = data.templates || [];

    const templates = rawTemplates.map((t: any) => ({
      id: t.id,
      name: t.name || 'Sin Título',
      type: t.type || 'sms',
      body: t.template?.body || '',
      attachments: t.template?.attachments || [],
      dateAdded: t.dateAdded,
    }));

    return NextResponse.json({
      templates,
      totalCount: data.totalCount || templates.length,
    });
  } catch (error: any) {
    console.error('Error in /api/ghl/templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
