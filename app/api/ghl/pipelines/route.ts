export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    let locationId = 'OS9czz85LUvBeljk8FEv';

    if (!locationId) {
      return NextResponse.json({ error: 'Falta locationId' }, { status: 400 });
    }

    const accessToken = process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';

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




