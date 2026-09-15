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
    console.warn('[GHL Tags] DB Query error:', err.message);
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

    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/locations/${resolvedLocationId}/tags`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json',
      },
    });

    if (!ghlResponse.ok) {
      const err = await ghlResponse.json().catch(() => ({}));
      return NextResponse.json({ error: err?.message || 'Error al consultar tags de GHL', tags: [] }, { status: ghlResponse.status });
    }

    const data = await ghlResponse.json();
    return NextResponse.json({ tags: data.tags || [] });
  } catch (error: any) {
    console.error('Error in GET /api/ghl/tags:', error);
    return NextResponse.json({ error: error.message, tags: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId = 'OS9czz85LUvBeljk8FEv', contactId, tags } = body;

    if (!contactId || !tags || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Faltan contactId o tags' }, { status: 400 });
    }

    const { accessToken } = await getInstallation(locationId);

    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });

    const data = await ghlResponse.json().catch(() => ({}));
    if (!ghlResponse.ok) {
      return NextResponse.json({ error: data?.message || 'Error al agregar tags en GHL' }, { status: ghlResponse.status });
    }

    return NextResponse.json({ success: true, tags: data.tags || [] });
  } catch (error: any) {
    console.error('Error in POST /api/ghl/tags:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { locationId = 'OS9czz85LUvBeljk8FEv', contactId, tags } = body;

    if (!contactId || !tags || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Faltan contactId o tags' }, { status: 400 });
    }

    const { accessToken } = await getInstallation(locationId);

    const ghlResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });

    const data = await ghlResponse.json().catch(() => ({}));
    if (!ghlResponse.ok) {
      return NextResponse.json({ error: data?.message || 'Error al remover tags en GHL' }, { status: ghlResponse.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/ghl/tags:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
