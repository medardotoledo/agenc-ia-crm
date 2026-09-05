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
    console.warn('[GHL Lead Create] DB Query error:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      locationId = 'OS9czz85LUvBeljk8FEv',
      name = 'Nuevo Lead',
      company = '',
      phone = '',
      email = '',
      stage = '',
      value = 0,
      pipelineId = 'czJFUMy4psgBs7tn8nE8',
    } = body;

    const accessToken = await getAccessToken(locationId);
    const ghlHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // 1. Crear Contacto en GHL
    const cleanDigits = phone.replace(/\D/g, '');
    const contactPayload: Record<string, any> = {
      name,
      locationId,
    };
    if (company) contactPayload.companyName = company;
    if (email) contactPayload.email = email;
    if (cleanDigits) contactPayload.phone = `+${cleanDigits}`;

    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify(contactPayload),
    });

    const contactData = await contactRes.json();
    const contactId = contactData?.contact?.id || contactData?.id;

    if (!contactId) {
      return NextResponse.json({ error: contactData?.message || 'Error al crear contacto en GHL' }, { status: 400 });
    }

    // 2. Crear Oportunidad asociada en GHL
    const oppPayload: Record<string, any> = {
      name,
      pipelineId,
      locationId,
      contactId,
      status: 'open',
      monetaryValue: Number(value) || 0,
    };
    if (stage && stage !== 'default') {
      oppPayload.pipelineStageId = stage;
    }

    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify(oppPayload),
    });

    const oppData = await oppRes.json();
    const oppId = oppData?.opportunity?.id || oppData?.id;

    return NextResponse.json({
      success: true,
      oppId: oppId || 'opp_' + Date.now(),
      contactId,
    });
  } catch (error: any) {
    console.error('Error in /api/ghl/leads/create:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
