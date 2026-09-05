export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    let locationId = 'OS9czz85LUvBeljk8FEv';
    let pipelineId = searchParams.get('pipelineId');

    if (!locationId) {
      return NextResponse.json({ error: 'Falta locationId' }, { status: 400 });
    }

    const accessToken = process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';

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





