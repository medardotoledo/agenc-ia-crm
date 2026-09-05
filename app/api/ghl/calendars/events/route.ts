export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getAccessToken(locationId: string): Promise<string> {
  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;',
      [locationId]
    );
    if (rows.length && rows[0].access_token) {
      return rows[0].access_token;
    }
  } catch (err: any) {
    console.warn('[GHL Calendar Events] DB Query error:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || searchParams.get('location_id') || 'OS9czz85LUvBeljk8FEv';
    const calendarId = searchParams.get('calendarId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const accessToken = await getAccessToken(locationId);

    // Si no vienen fechas, usar un rango amplio (últimos 30 días a próximos 60 días)
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const defaultEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const start = startTime || defaultStart;
    const end = endTime || defaultEnd;

    let url = `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`;
    if (calendarId && calendarId !== 'all') {
      url += `&calendarId=${encodeURIComponent(calendarId)}`;
    }

    const ghlResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-04-15',
        'Accept': 'application/json',
      },
    });

    if (!ghlResponse.ok) {
      const errorData = await ghlResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData?.message || 'Error al consultar citas de GoHighLevel',
          events: [],
        },
        { status: ghlResponse.status }
      );
    }

    const data = await ghlResponse.json();
    return NextResponse.json({
      events: data.events || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/ghl/calendars/events:', error);
    return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId = 'OS9czz85LUvBeljk8FEv', calendarId, contactId, startTime, endTime, title } = body;

    if (!calendarId || !contactId || !startTime) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (calendarId, contactId, startTime)' }, { status: 400 });
    }

    const accessToken = await getAccessToken(locationId);

    const ghlResponse = await fetch('https://services.leadconnectorhq.com/calendars/events/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-04-15',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        calendarId,
        locationId,
        contactId,
        startTime,
        endTime: endTime || new Date(new Date(startTime).getTime() + 45 * 60 * 1000).toISOString(),
        title: title || 'Cita desde CRM Agentico',
        appointmentStatus: 'confirmed',
      }),
    });

    const data = await ghlResponse.json().catch(() => ({}));
    if (!ghlResponse.ok) {
      return NextResponse.json({ error: data?.message || 'Error al agendar cita en GHL' }, { status: ghlResponse.status });
    }

    return NextResponse.json({ success: true, appointment: data });
  } catch (error: any) {
    console.error('Error in POST /api/ghl/calendars/events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
