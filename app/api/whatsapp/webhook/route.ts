import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Webhook] Received:', JSON.stringify(body, null, 2));

    const { event, instance, data, sender } = body;

    // Solo procesar nuevos mensajes
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return NextResponse.json({ received: true });
    }

    // Asegurarse de que venga de una subcuenta de GHL
    if (!instance || !instance.startsWith('sub_')) {
      return NextResponse.json({ received: true });
    }

    const accountId = instance.replace('sub_', '').replace(/_/g, '-');
    const messageData = data?.message || data;
    
    // Ignorar mensajes enviados por nosotros mismos (outbound)
    if (messageData?.key?.fromMe) {
      return NextResponse.json({ received: true });
    }

    const remoteJid = messageData?.key?.remoteJid || sender;
    if (!remoteJid || remoteJid.includes('@g.us')) {
       return NextResponse.json({ received: true }); // Ignorar grupos
    }

    const phone = remoteJid.split('@')[0];
    const textContent = messageData?.message?.conversation || 
                        messageData?.message?.extendedTextMessage?.text || 
                        '';

    if (!textContent) {
      return NextResponse.json({ received: true });
    }

    const senderName = messageData?.pushName || 'WhatsApp Contact';

    // 1. Obtener Token de GHL desde PostgreSQL local
    const client = await pool.connect();
    let ghlToken;
    try {
      const result = await client.query('SELECT access_token FROM ghl_installations WHERE location_id = $1', [accountId]);
      if (result.rows.length > 0) {
        ghlToken = result.rows[0].access_token;
      }
    } catch (e: any) {
      // Ignorar error si la tabla aún no existe (se creará en el callback)
      if (e.code !== '42P01') throw e; 
    } finally {
      client.release();
    }

    if (!ghlToken) {
      console.log(`[Webhook] No GHL token found for location ${accountId}`);
      return NextResponse.json({ success: false, reason: 'No token' });
    }

    // 2. Inyección a GoHighLevel
    const ghlHeaders = { 
      'Authorization': `Bearer ${ghlToken}`, 
      'Content-Type': 'application/json', 
      'Version': '2021-04-15' 
    };

    let ghlContactId = null;
    
    // Buscar contacto en GHL
    const searchRes = await fetch(`https://services.leadconnectorhq.com/contacts/?query=${phone}&locationId=${accountId}`, { headers: ghlHeaders });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.contacts && searchData.contacts.length > 0) {
        ghlContactId = searchData.contacts[0].id;
      }
    }
    
    // Si no existe, crearlo en GHL
    if (!ghlContactId) {
      const createRes = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
        method: 'POST', 
        headers: ghlHeaders, 
        body: JSON.stringify({ 
          name: senderName, 
          phone: `+${phone}`, 
          locationId: accountId 
        })
      });
      if (createRes.ok) {
        const createData = await createRes.json();
        ghlContactId = createData.contact?.id;
      }
    }

    // Inyectar el mensaje en la conversación de GHL
    if (ghlContactId) {
      await fetch(`https://services.leadconnectorhq.com/conversations/messages/inbound`, {
        method: 'POST', 
        headers: ghlHeaders, 
        body: JSON.stringify({ 
          type: 'Custom', 
          contactId: ghlContactId, 
          body: textContent 
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
