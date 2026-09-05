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
    console.warn('[GHL Lead Update] DB Query error:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      locationId = 'OS9czz85LUvBeljk8FEv',
      opportunityId,
      contactId,
      patch = {},
    } = body;

    const accessToken = await getAccessToken(locationId);
    const ghlHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const results: Record<string, any> = {};

    // 1. Actualizar Contacto en GHL (si cambió nombre, empresa, teléfono o correo)
    const hasContactFields =
      patch.name !== undefined ||
      patch.company !== undefined ||
      patch.phone !== undefined ||
      patch.email !== undefined;

    if (hasContactFields && contactId) {
      const contactPayload: Record<string, any> = {};
      if (patch.name !== undefined) contactPayload.name = patch.name;
      if (patch.company !== undefined) contactPayload.companyName = patch.company;
      if (patch.email !== undefined) contactPayload.email = patch.email;
      if (patch.phone !== undefined) {
        // Asegurar formato internacional
        const cleanDigits = patch.phone.replace(/\D/g, '');
        contactPayload.phone = cleanDigits ? `+${cleanDigits}` : '';
      }

      const contactRes = await fetch(
        `https://services.leadconnectorhq.com/contacts/${contactId}`,
        {
          method: 'PUT',
          headers: ghlHeaders,
          body: JSON.stringify(contactPayload),
        }
      );
      results.contact = await contactRes.json().catch(() => ({}));
    }

    // 2. Actualizar Oportunidad en GHL (si cambió etapa, valor, estado o nombre)
    const hasOppFields =
      patch.stage !== undefined ||
      patch.value !== undefined ||
      patch.name !== undefined ||
      patch.status !== undefined;

    if (hasOppFields && opportunityId) {
      const oppPayload: Record<string, any> = {};
      if (patch.name !== undefined) oppPayload.name = patch.name;
      if (patch.value !== undefined) oppPayload.monetaryValue = Number(patch.value) || 0;
      if (patch.stage !== undefined) oppPayload.pipelineStageId = patch.stage;
      if (patch.stage === 'perdido') oppPayload.status = 'lost';
      else if (patch.stage === 'cierre') oppPayload.status = 'won';
      else if (patch.status !== undefined) oppPayload.status = patch.status;

      const oppRes = await fetch(
        `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
        {
          method: 'PUT',
          headers: ghlHeaders,
          body: JSON.stringify(oppPayload),
        }
      );
      results.opportunity = await oppRes.json().catch(() => ({}));
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error in /api/ghl/leads/update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
