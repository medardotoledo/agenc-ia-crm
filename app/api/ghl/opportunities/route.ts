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
    let pipelineId = searchParams.get('pipelineId');

    if (!locationId) {
      return NextResponse.json({ error: 'Falta locationId' }, { status: 400 });
    }

    const { rows } = await pool.query('SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;', [locationId]);
    if (!rows.length || !rows[0].access_token) {
      return NextResponse.json({ error: 'No se configurÃ³ el API Key de GoHighLevel para esta subcuenta.' }, { status: 401 });
    }
    const accessToken = rows[0].access_token;

    // GHL Search Opportunities API (can filter by pipelineId)
        let url = `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}${pipelineId ? `&pipeline_id=${pipelineId}` : ''}&limit=100`;
    let allOpportunities: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const ghlResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      });

      if (!ghlResponse.ok) {
        const errorData = await ghlResponse.text();
        console.error('[GHL Opportunities API Error]', errorData);
        return NextResponse.json({ error: 'Error al consultar GHL Opportunities API' }, { status: ghlResponse.status });
      }

      const ghlData = await ghlResponse.json();
      if (ghlData.opportunities) {
        allOpportunities = allOpportunities.concat(ghlData.opportunities);
      }

      if (ghlData.meta && ghlData.meta.nextPageUrl) {
        url = ghlData.meta.nextPageUrl;
      } else {
        hasMore = false;
      }
    }

    return NextResponse.json({ opportunities: allOpportunities, meta: { total: allOpportunities.length } });
  } catch (error: any) {
    console.error('Error in /api/ghl/opportunities:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}







