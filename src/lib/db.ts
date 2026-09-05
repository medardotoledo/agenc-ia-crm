// Capa de datos del mÃƒÆ’Ã‚Â³dulo CRM contra el espejo en Supabase.
// MULTI-TENANT: todas las lecturas/escrituras se scopean por `accountId`
// (la subcuenta activa) y la autorÃƒÆ’Ã‚Â­a/owner por `userId` (users.id del NÃƒÆ’Ã‚Âºcleo).
// El frontend nunca habla con GHL ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â eso lo hace el motor de sync en el backend.
import { createBrowserSupabaseClient } from './supabase'
import type { Lead, Note, Message, Conversation, Stage, NoteType, Channel } from '@/types'

type StageRow = { id: string; name: string }

// Las 5 etapas son FIJAS en estructura; lo ÃƒÆ’Ã‚Âºnico editable es su NOMBRE visible.
// Identificamos cada etapa por su POSICIÃƒÆ’Ã¢â‚¬Å“N (clave estable), no por el nombre ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
// asÃƒÆ’Ã‚Â­ renombrar "Nuevo"ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢"Prospecto" NO rompe los leads existentes.
export const STAGE_KEYS = ['nuevo', 'contactado', 'propuesta', 'cierre', 'perdido'] as const

// Mapas clave<->stage_id de la cuenta activa (se rellenan en loadStages).
let stageIdByKey: Record<string, string> = {}
let keyByStageId: Record<string, string> = {}

/** Pipeline por defecto de la cuenta (is_default, o el primero). */
export async function getDefaultPipeline(accountId: string): Promise<string | null> { return 'ghl-pipeline'; }

// Carga las etapas de la cuenta y devuelve sus NOMBRES por clave de posiciÃƒÆ’Ã‚Â³n
// (ej: { nuevo: 'Prospecto', contactado: 'Contactado', ... }) para que la UI
// muestre los nombres personalizados de cada subcuenta.
// En GHL, las etapas vienen dinÃƒÆ’Ã‚Â¡micas por Pipeline.
export async function loadStages(accountId: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`/api/ghl/pipelines?locationId=${accountId}`);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const pipelines = data.pipelines || [];
    if (pipelines.length > 0) {
      // Por ahora, tomamos el primer pipeline
      const firstPipeline = pipelines[0];
      const labels: Record<string, string> = {};
      (firstPipeline.stages || []).forEach((s: any) => {
        labels[s.id] = s.name;
      });
      return labels;
    } else {
      alert('GHL devolviÃƒÂ³ 0 pipelines.');
    }
  } catch (err: any) {
    console.error('Error fetching GHL pipelines:', err); alert('Error GHL Pipelines: ' + err.message);
  }
  // Fallback si no hay pipelines
  return { 'default': 'Sin Pipeline' };
}

/* ---------- LECTURAS ---------- */

export async function fetchLeads(accountId: string, ownerOnlyId?: string | null): Promise<Lead[]> {
  try {
    const res = await fetch(`/api/ghl/opportunities?locationId=${accountId}`);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const opps = data.opportunities || [];
    if(opps.length===0) alert('GHL devolviÃƒÂ³ 0 oportunidades.'); return opps.map((o: any) => ({
      id: o.id,
      contactId: o.contactId || o.id,
      name: o.name || o.contactName || 'Sin Nombre',
      company: o.contact?.companyName || o.companyName || '',
      phone: o.contact?.phone || o.phone || '',
      email: o.contact?.email || o.email || '',
      stage: o.pipelineStageId || 'default', // ID real de GHL
      temperature: 'warm',
      value: o.monetaryValue || 0,
      score: 0,
      ownerId: o.assignedTo || '',
      dueDate: o.updatedAt ? new Date(o.updatedAt).toISOString() : new Date().toISOString(),
      channels: ['whatsapp'],
      unread: 0,
      source: o.source || 'GHL',
      tags: ((o.tags && o.tags.length > 0 ? o.tags : o.contact?.tags) || []).map((t: string) => ({ id: t, name: t, color: '#e5e7eb' }))
    }));
  } catch (err: any) {
    console.error('Error fetching GHL opportunities in fetchLeads:', err); alert('Error GHL Opps: ' + err.message);
  }
  return [];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export async function fetchNotes(accountId: string, leads: Lead[]): Promise<Note[]> {
  return [];
}

export async function fetchConversations(accountId: string, leads: Lead[]): Promise<{ convos: Conversation[]; msgs: Message[] }> { return { convos: [], msgs: [] }; }

/* ---------- ESCRITURAS (optimistas: la UI ya cambiÃƒÆ’Ã‚Â³, esto persiste) ---------- */

export async function persistLeadPatch(lead: Lead, patch: Partial<Lead>) {
  try {
    const res = await fetch('/api/ghl/leads/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunityId: lead.id,
        contactId: lead.contactId,
        patch,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[persistLeadPatch] Error al guardar en GHL:', err);
    }
  } catch (err: any) {
    console.error('[persistLeadPatch] Error:', err.message);
  }
}

export async function persistNewLead(
  accountId: string,
  userId: string,
  pipelineId: string,
  lead: Lead,
): Promise<{ oppId: string; contactId: string } | null> {
  try {
    const res = await fetch('/api/ghl/leads/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: accountId,
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        email: lead.email,
        stage: lead.stage,
        value: lead.value,
        pipelineId,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { oppId: data.oppId, contactId: data.contactId };
    }
  } catch (err: any) {
    console.error('[persistNewLead] Error:', err.message);
  }
  return { oppId: 'opp_' + Date.now(), contactId: 'cnt_' + Date.now() };
}

export async function persistNote(accountId: string, userId: string, lead: Lead, type: NoteType, content: string) {
  if (!lead.contactId) return
  const supabase = createBrowserSupabaseClient()
  await supabase.from('notes').insert({
    account_id: accountId, contact_id: lead.contactId, user_id: userId, note_type: type, content,
  })
}

export async function persistMessage(accountId: string, userId: string, lead: Lead, channel: Message['channel'], body: string) {
  if (!lead.contactId) return
  const supabase = createBrowserSupabaseClient()
  const ch = channel === 'internal' ? 'whatsapp' : channel
  let { data: convo } = await supabase
    .from('conversations').select('id').eq('contact_id', lead.contactId).eq('channel', ch).maybeSingle()
  if (!convo) {
    const ins = await supabase
      .from('conversations')
      .insert({ account_id: accountId, contact_id: lead.contactId, channel: ch })
      .select('id').single()
    if (ins.error) throw ins.error
    convo = ins.data
  }
  await supabase.from('messages').insert({
    account_id: accountId, conversation_id: convo.id, direction: 'out',
    channel, sender_type: 'user', user_id: userId, body,
  })
  if (channel !== 'internal')
    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString(), last_message_preview: body.slice(0, 60) })
      .eq('id', convo.id)
}









