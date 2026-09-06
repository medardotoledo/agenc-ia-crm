import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getGHLToken(accountId: string): Promise<string> {
  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;',
      [accountId]
    );
    if (rows.length && rows[0].access_token) {
      return rows[0].access_token;
    }
  } catch (err: any) {
    console.warn('[Send WA] DB Query error:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { instanceName, number, text, accountId } = body;

    if (!instanceName && accountId) {
      instanceName = `wa_${accountId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    if (instanceName && instanceName.startsWith('sub_')) {
      // Intentar primero con la convención nueva wa_
      instanceName = instanceName.replace('sub_', 'wa_');
    }

    if (!instanceName || !number || !text) {
      return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 });
    }

    const urlsToTry = [
      EVOLUTION_API_URL,
      'http://2.24.65.127:8085',
      'http://evolution-api:8080',
      'http://localhost:8085',
      'http://host.docker.internal:8085',
      'http://172.17.0.1:8085',
    ];

    let lastError: any = null;
    let actualResponse: Response | null = null;

    for (const baseUrl of urlsToTry) {
      try {
        const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026',
          },
          body: JSON.stringify({
            number,
            text,
            delay: 1200,
            presence: 'composing',
          }),
        });
        
        actualResponse = response;
        break; // Successfully connected to an API instance, regardless of HTTP status
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!actualResponse) {
       return NextResponse.json({ error: lastError?.message || 'Failed to connect to API' }, { status: 500 });
    }

    const data = await actualResponse.json().catch(() => ({}));
    if (!actualResponse.ok) {
       return NextResponse.json({ error: data?.response?.message || data?.message || 'Error from API' }, { status: actualResponse.status });
    }

    // Inyectar inmediatamente en GoHighLevel para sincronizar el hilo saliente
    try {
      let ghlContactId = body.contactId;
      const effectiveAccountId = accountId || (instanceName ? instanceName.replace(/^(sub_|wa_)/, '') : 'OS9czz85LUvBeljk8FEv');
      const ghlToken = await getGHLToken(effectiveAccountId);
      const ghlHeaders = {
        Authorization: `Bearer ${ghlToken}`,
        'Content-Type': 'application/json',
        Version: '2021-04-15',
      };

      if (!ghlContactId && number) {
        const cleanNumber = number.replace(/\D/g, '');
        const searchRes = await fetch(`https://services.leadconnectorhq.com/contacts/?query=%2B${cleanNumber}&locationId=${effectiveAccountId}`, {
          headers: ghlHeaders,
        });
        if (searchRes.ok) {
          const sData = await searchRes.json();
          ghlContactId = sData.contacts?.[0]?.id;
        }
      }

      if (ghlContactId) {
        await fetch('https://services.leadconnectorhq.com/conversations/messages', {
          method: 'POST',
          headers: ghlHeaders,
          body: JSON.stringify({
            type: 'Live_Chat',
            contactId: ghlContactId,
            message: text,
          }),
        });
        console.log('[Send WA] Outbound message synced to GHL for contact:', ghlContactId);
      }
    } catch (ghlErr: any) {
      console.warn('[Send WA] Could not sync outbound to GHL:', ghlErr.message);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
