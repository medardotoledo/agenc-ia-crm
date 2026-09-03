import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Webhook] Received:', JSON.stringify(body, null, 2));

    const { event, instance, data, sender } = body;

    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return NextResponse.json({ received: true });
    }

    if (!instance || !instance.startsWith('sub_')) {
      return NextResponse.json({ received: true });
    }

    const accountId = instance.replace('sub_', '').replace(/_/g, '-');
    const messageData = data?.message || data;
    
    if (messageData?.key?.fromMe) {
      return NextResponse.json({ received: true });
    }

    const remoteJid = messageData?.key?.remoteJid || sender;
    if (!remoteJid || remoteJid.includes('@g.us')) {
       return NextResponse.json({ received: true });
    }

    const phone = remoteJid.split('@')[0];
    const textContent = messageData?.message?.conversation || 
                        messageData?.message?.extendedTextMessage?.text || 
                        '';

    if (!textContent) {
      return NextResponse.json({ received: true });
    }

    const senderName = messageData?.pushName || 'WhatsApp Contact';

    // 1. Encontrar o crear contacto
    let { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .eq('phone_e164', phone);

    let contactId;
    if (contacts && contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      const { data: newContact, error: errC } = await supabase
        .from('contacts')
        .insert({ account_id: accountId, name: senderName, phone_e164: phone, source: 'WhatsApp' })
        .select('id').single();
      if (errC) throw errC;
      contactId = newContact.id;

      const { data: pipeline } = await supabase.from('pipelines').select('id').eq('account_id', accountId).order('is_default', { ascending: false }).limit(1).maybeSingle();
      const { data: stage } = await supabase.from('stages').select('id').eq('account_id', accountId).order('position').limit(1).maybeSingle();

      if (pipeline && stage) {
        await supabase.from('opportunities').insert({
          account_id: accountId, contact_id: contactId, pipeline_id: pipeline.id, stage_id: stage.id, temperature: 'hot', score: 50
        });
      }
    }

    // 2. Encontrar o crear conversación
    let { data: convo } = await supabase.from('conversations').select('id').eq('account_id', accountId).eq('contact_id', contactId).eq('channel', 'whatsapp').maybeSingle();

    if (!convo) {
      const { data: newConvo, error: errCv } = await supabase.from('conversations').insert({ account_id: accountId, contact_id: contactId, channel: 'whatsapp', unread_count: 0 }).select('id').single();
      if (errCv) throw errCv;
      convo = newConvo;
    }

    // 3. Insertar mensaje
    await supabase.from('messages').insert({ account_id: accountId, conversation_id: convo.id, direction: 'in', channel: 'whatsapp', sender_type: 'contact', body: textContent });

    // 4. Actualizar conversación local
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString(), last_message_preview: textContent.slice(0, 60), unread_count: convo.unread_count ? convo.unread_count + 1 : 1 }).eq('id', convo.id);

    // 5. Inyeccion a GoHighLevel
    const { data: ghlToken } = await supabase.from('ghl_installations').select('access_token').eq('location_id', accountId).maybeSingle();

    if (ghlToken?.access_token) {
      const ghlHeaders = { 'Authorization': \Bearer \\, 'Content-Type': 'application/json', 'Version': '2021-04-15' };
      let ghlContactId = null;
      const searchRes = await fetch(\https://services.leadconnectorhq.com/contacts/?query=\&locationId=\\, { headers: ghlHeaders });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.contacts?.length > 0) ghlContactId = searchData.contacts[0].id;
      }
      if (!ghlContactId) {
        const createRes = await fetch(\https://services.leadconnectorhq.com/contacts/\, {
          method: 'POST', headers: ghlHeaders, body: JSON.stringify({ name: senderName, phone: \+\\, locationId: accountId })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          ghlContactId = createData.contact?.id;
        }
      }
      if (ghlContactId) {
        await fetch(\https://services.leadconnectorhq.com/conversations/messages/inbound\, {
          method: 'POST', headers: ghlHeaders, body: JSON.stringify({ type: 'Custom', contactId: ghlContactId, body: textContent })
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
