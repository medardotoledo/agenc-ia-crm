/**
 * POST /api/leads/from-agent
 * Captura un lead generado por el Agente IA del sitio público.
 * Crea contact + opportunity en el CRM con el contexto de la conversación.
 */

import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { accountId, name, phone, context } = await request.json();

    if (!accountId || !name || !phone) {
      return Response.json({ error: 'accountId, name y phone son requeridos' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Crear o recuperar el contact
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .eq('phone', phone)
      .maybeSingle();

    let contactId = existing?.id;

    if (!contactId) {
      const { data: newContact, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          account_id: accountId,
          name,
          phone,
          source: 'Agente IA',
        })
        .select('id')
        .single();

      if (contactErr) throw contactErr;
      contactId = newContact.id;
    }

    // 2. Obtener el pipeline por defecto de la cuenta
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('account_id', accountId)
      .limit(1)
      .maybeSingle();

    // 3. Obtener la primera etapa del pipeline
    const { data: firstStage } = await supabase
      .from('stages')
      .select('id')
      .eq('pipeline_id', pipeline?.id)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();

    // 4. Crear oportunidad (lead) en el CRM
    await supabase.from('opportunities').insert({
      account_id: accountId,
      contact_id: contactId,
      pipeline_id: pipeline?.id ?? null,
      stage_id: firstStage?.id ?? null,
      name: `${name} — Agente IA`,
      source: 'Agente IA',
      temperature: 'hot',
      notes: context ? `Contexto del chat IA:\n${context}` : null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[/api/leads/from-agent]', error);
    return Response.json(
      { error: 'Error al crear el lead', details: String(error) },
      { status: 500 }
    );
  }
}
