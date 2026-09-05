export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function getGHLToken(accountId: string): Promise<string> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;',
        [accountId]
      );
      if (result.rows.length > 0 && result.rows[0].access_token) {
        return result.rows[0].access_token;
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[Webhook] DB Query warning:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Webhook WA] Event received:', body.event, 'Instance:', body.instance);

    const { event, instance, data } = body;

    // Solo procesar nuevos mensajes
    const isUpsert = event === 'messages.upsert' || event === 'MESSAGES_UPSERT';
    if (!isUpsert) {
      return NextResponse.json({ received: true, ignored: 'not_upsert' });
    }

    // Extraer datos del mensaje según estructura de Evolution API v1 o v2
    const key = data?.key || body.key;
    const message = data?.message || body.message;

    // Ignorar mensajes salientes enviados por nosotros mismos
    if (key?.fromMe) {
      return NextResponse.json({ received: true, ignored: 'from_me' });
    }

    const remoteJid = key?.remoteJid || body.sender || data?.sender;
    if (!remoteJid || remoteJid.includes('@g.us')) {
      return NextResponse.json({ received: true, ignored: 'group_or_no_jid' });
    }

    // Extraer texto del mensaje
    const textContent =
      message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      message?.videoMessage?.caption ||
      message?.documentMessage?.caption ||
      '';

    if (!textContent) {
      return NextResponse.json({ received: true, ignored: 'no_text' });
    }

    const senderName = data?.pushName || body.pushName || 'WhatsApp Contact';
    const rawPhone = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');

    // Extraer subcuenta / locationId
    let accountId = 'OS9czz85LUvBeljk8FEv';
    if (instance && instance.startsWith('sub_')) {
      accountId = instance.replace('sub_', '');
    }

    // 1. Obtener Token de GoHighLevel
    const ghlToken = await getGHLToken(accountId);
    const ghlHeaders = {
      Authorization: `Bearer ${ghlToken}`,
      'Content-Type': 'application/json',
      Version: '2021-04-15',
    };

    let ghlContactId: string | null = null;

    // 2. Buscar contacto en GHL con el número en formato internacional (+52...)
    const phoneWithPlus = `+${rawPhone}`;
    const searchUrl1 = `https://services.leadconnectorhq.com/contacts/?query=${encodeURIComponent(phoneWithPlus)}&locationId=${accountId}`;
    const searchRes1 = await fetch(searchUrl1, { headers: ghlHeaders });

    if (searchRes1.ok) {
      const searchData1 = await searchRes1.json();
      if (searchData1.contacts && searchData1.contacts.length > 0) {
        ghlContactId = searchData1.contacts[0].id;
      }
    }

    // Fallback: si en México tiene el '1' (ej: +521...) o no lo tiene (+52...)
    if (!ghlContactId && phoneWithPlus.startsWith('+521')) {
      const altPhone = `+52${phoneWithPlus.slice(4)}`;
      const searchUrl2 = `https://services.leadconnectorhq.com/contacts/?query=${encodeURIComponent(altPhone)}&locationId=${accountId}`;
      const searchRes2 = await fetch(searchUrl2, { headers: ghlHeaders });
      if (searchRes2.ok) {
        const searchData2 = await searchRes2.json();
        if (searchData2.contacts && searchData2.contacts.length > 0) {
          ghlContactId = searchData2.contacts[0].id;
        }
      }
    }

    // 3. Si aún no existe en GHL, crearlo automáticamente
    if (!ghlContactId) {
      const createRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
        method: 'POST',
        headers: ghlHeaders,
        body: JSON.stringify({
          name: senderName,
          phone: phoneWithPlus,
          locationId: accountId,
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        ghlContactId = createData.contact?.id;
      } else {
        const errText = await createRes.text();
        console.warn('[Webhook WA] Contact creation failed:', errText);
      }
    }

    // 4. Inyectar el mensaje en la conversación de GHL
    if (ghlContactId) {
      const inboundRes = await fetch('https://services.leadconnectorhq.com/conversations/messages/inbound', {
        method: 'POST',
        headers: ghlHeaders,
        body: JSON.stringify({
          type: 'WhatsApp',
          contactId: ghlContactId,
          message: textContent,
          body: textContent,
        }),
      });

      const inboundData = await inboundRes.json().catch(() => ({}));
      console.log('[Webhook WA] Message injected into GHL:', inboundData);
      return NextResponse.json({ success: true, contactId: ghlContactId, message: inboundData });
    }

    return NextResponse.json({ success: false, reason: 'Could not resolve contact' });
  } catch (error: any) {
    console.error('[Webhook WA] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
