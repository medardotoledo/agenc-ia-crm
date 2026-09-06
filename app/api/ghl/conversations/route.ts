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
    console.warn('[GHL Conversations API] DB Query error:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || searchParams.get('location_id') || 'OS9czz85LUvBeljk8FEv';
    const conversationId = searchParams.get('conversationId');
    const contactId = searchParams.get('contactId');

    const accessToken = await getAccessToken(locationId);
    const ghlHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-04-15',
      Accept: 'application/json',
    };

    // Caso 1: Obtener la conversación y mensajes (por conversationId o contactId)
    if (conversationId || contactId) {
      let resolvedConversationId = conversationId;
      let conversation: any = null;

      if (!resolvedConversationId && contactId) {
        const searchUrl = `https://services.leadconnectorhq.com/conversations/search?locationId=${locationId}&contactId=${contactId}`;
        const searchRes = await fetch(searchUrl, { headers: ghlHeaders });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          conversation = searchData.conversations?.[0] || null;
          resolvedConversationId = conversation?.id;
        }
      }

      if (!resolvedConversationId) {
        return NextResponse.json({ conversation: null, messages: [] });
      }

      // Obtener mensajes de la conversación
      const msgUrl = `https://services.leadconnectorhq.com/conversations/${resolvedConversationId}/messages`;
      const msgRes = await fetch(msgUrl, { headers: ghlHeaders });

      let rawMessages: any[] = [];
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        rawMessages = msgData.messages?.messages || [];
      }

      // Ordenar cronológicamente (antiguos primero, recientes al final)
      rawMessages.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());

      // Mapear al formato amigable
      const messages = rawMessages.map((m: any) => {
        let channel: string = 'whatsapp';
        const mType = (m.messageType || '').toLowerCase();
        if (mType.includes('email')) channel = 'email';
        else if (mType.includes('call')) channel = 'call';
        else if (mType.includes('sms')) channel = 'sms';

        const isOutbound = m.direction === 'outbound';

        return {
          id: m.id,
          conversationId: m.conversationId,
          contactId: m.contactId,
          direction: isOutbound ? 'out' : 'in',
          body: m.body || (m.attachments?.length ? '📎 Archivo adjunto' : ''),
          attachments: m.attachments || [],
          channel,
          status: m.status,
          dateAdded: m.dateAdded,
          author: isOutbound ? 'Agente' : (conversation?.contactName || conversation?.fullName || 'Lead'),
          time: new Date(m.dateAdded).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        };
      });

      return NextResponse.json({
        conversation,
        messages,
      });
    }

    // Caso 2: Listar conversaciones recientes de la ubicación
    const limit = searchParams.get('limit') || '50';
    const listUrl = `https://services.leadconnectorhq.com/conversations/search?locationId=${locationId}&limit=${limit}&sortBy=last_message_date&sortOrder=desc`;
    const listRes = await fetch(listUrl, { headers: ghlHeaders });

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error('[GHL Conversations List Error]', errText);
      return NextResponse.json({ error: 'Error al consultar conversaciones' }, { status: listRes.status });
    }

    const listData = await listRes.json();
    return NextResponse.json({
      conversations: listData.conversations || [],
      total: listData.total || 0,
    });
  } catch (error: any) {
    console.error('Error in /api/ghl/conversations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
