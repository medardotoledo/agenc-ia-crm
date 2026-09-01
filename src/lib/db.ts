// Capa de datos del módulo CRM contra el espejo en Supabase.
// MULTI-TENANT: todas las lecturas/escrituras se scopean por `accountId`
// (la subcuenta activa) y la autoría/owner por `userId` (users.id del Núcleo).
// El frontend nunca habla con GHL — eso lo hace el motor de sync en el backend.
import { createBrowserSupabaseClient } from './supabase'
import type { Lead, Note, Message, Conversation, Stage, NoteType, Channel } from '@/types'

type StageRow = { id: string; name: string }

// Las 5 etapas son FIJAS en estructura; lo único editable es su NOMBRE visible.
// Identificamos cada etapa por su POSICIÓN (clave estable), no por el nombre —
// así renombrar "Nuevo"→"Prospecto" NO rompe los leads existentes.
export const STAGE_KEYS = ['nuevo', 'contactado', 'propuesta', 'cierre', 'perdido'] as const

// Mapas clave<->stage_id de la cuenta activa (se rellenan en loadStages).
let stageIdByKey: Record<string, string> = {}
let keyByStageId: Record<string, string> = {}

/** Pipeline por defecto de la cuenta (is_default, o el primero). */
export async function getDefaultPipeline(accountId: string): Promise<string | null> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('pipelines')
    .select('id, is_default')
    .eq('account_id', accountId)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.id as string) ?? null
}

// Carga las etapas de la cuenta y devuelve sus NOMBRES por clave de posición
// (ej: { nuevo: 'Prospecto', contactado: 'Contactado', ... }) para que la UI
// muestre los nombres personalizados de cada subcuenta.
export async function loadStages(accountId: string): Promise<Record<string, string>> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('stages')
    .select('id,name')
    .eq('account_id', accountId)
    .order('position')
  if (error) throw error
  stageIdByKey = {}; keyByStageId = {}
  const labels: Record<string, string> = {}
  ;(data as StageRow[]).forEach((s, i) => {
    const key = STAGE_KEYS[i] ?? s.name.toLowerCase()
    stageIdByKey[key] = s.id
    keyByStageId[s.id] = key
    labels[key] = s.name
  })
  return labels
}

/* ---------- LECTURAS (scopeadas por cuenta) ---------- */

// `ownerOnlyId`: si se pasa, solo trae oportunidades de ese dueño
// (para usuarios con "solo datos asignados"). null/undefined => todas.
export async function fetchLeads(accountId: string, ownerOnlyId?: string | null): Promise<Lead[]> {
  const supabase = createBrowserSupabaseClient()
  let oppQuery = supabase
    .from('opportunities')
    .select('id, value, status, temperature, score, owner_id, stage_id, follow_up_at, contacts(id, name, company, phone_e164, email, source)')
    .eq('account_id', accountId)
  if (ownerOnlyId) oppQuery = oppQuery.eq('owner_id', ownerOnlyId)

  const [opps, convos] = await Promise.all([
    oppQuery.order('created_at'),
    supabase.from('conversations').select('id, contact_id, channel, unread_count').eq('account_id', accountId),
  ])
  if (opps.error) throw opps.error
  if (convos.error) throw convos.error

  const convByContact = new Map<string, { channels: Channel[]; unread: number }>()
  for (const c of convos.data as { contact_id: string; channel: Channel; unread_count: number }[]) {
    const e = convByContact.get(c.contact_id) ?? { channels: [], unread: 0 }
    e.channels.push(c.channel)
    e.unread += c.unread_count
    convByContact.set(c.contact_id, e)
  }

  // Etiquetas por contacto (para pintar chips en el board).
  const contactIds = (opps.data as unknown as Array<{ contacts: { id: string } }>).map((o) => o.contacts.id)
  const tagsByContact = new Map<string, { id: string; name: string; color: string }[]>()
  if (contactIds.length) {
    const { data: tagRows } = await supabase
      .from('contact_tags')
      .select('contact_id, tags(id, name, color)')
      .eq('account_id', accountId)
      .in('contact_id', contactIds)
    for (const r of (tagRows ?? []) as unknown as Array<{ contact_id: string; tags: { id: string; name: string; color: string } | null }>) {
      if (!r.tags) continue
      const arr = tagsByContact.get(r.contact_id) ?? []
      arr.push(r.tags)
      tagsByContact.set(r.contact_id, arr)
    }
  }

  return (opps.data as unknown as Array<{
    id: string; value: number; temperature: Lead['temperature']; score: number
    owner_id: string; stage_id: string; follow_up_at: string | null
    contacts: { id: string; name: string; company: string | null; phone_e164: string | null; email: string | null; source: string | null }
  }>).map((o) => {
    const conv = convByContact.get(o.contacts.id)
    return {
      id: o.id,
      contactId: o.contacts.id,
      name: o.contacts.name,
      company: o.contacts.company ?? '',
      phone: o.contacts.phone_e164 ?? '',
      email: o.contacts.email ?? '',
      stage: (keyByStageId[o.stage_id] ?? 'nuevo') as Stage,
      temperature: o.temperature,
      value: Number(o.value),
      score: o.score,
      ownerId: o.owner_id,
      dueDate: o.follow_up_at?.slice(0, 10) ?? '',
      channels: conv?.channels ?? [],
      unread: conv?.unread ?? 0,
      source: o.contacts.source ?? 'Manual',
      tags: tagsByContact.get(o.contacts.id) ?? [],
    }
  })
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export async function fetchNotes(accountId: string, leads: Lead[]): Promise<Note[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('notes')
    .select('id, contact_id, note_type, content, created_at, users(name)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const leadByContact = new Map(leads.map((l) => [l.contactId, l.id]))
  return (data as unknown as Array<{ id: string; contact_id: string; note_type: NoteType; content: string; created_at: string; users: { name: string } | null }>)
    .filter((n) => leadByContact.has(n.contact_id))
    .map((n) => ({
      id: n.id,
      leadId: leadByContact.get(n.contact_id)!,
      type: n.note_type,
      content: n.content,
      author: n.users?.name ?? 'Sistema',
      createdAt: fmtDate(n.created_at),
    }))
}

export async function fetchConversations(accountId: string, leads: Lead[]): Promise<{ convos: Conversation[]; msgs: Message[] }> {
  const supabase = createBrowserSupabaseClient()
  const [cv, ms] = await Promise.all([
    supabase.from('conversations').select('id, contact_id, channel, unread_count, last_message_at, last_message_preview').eq('account_id', accountId).order('last_message_at', { ascending: false }),
    supabase.from('messages').select('id, conversation_id, direction, channel, body, created_at, users(name)').eq('account_id', accountId).order('created_at'),
  ])
  if (cv.error) throw cv.error
  if (ms.error) throw ms.error
  const leadByContact = new Map(leads.map((l) => [l.contactId, l.id]))
  const leadByConvo = new Map<string, string>()

  const convos: Conversation[] = []
  for (const c of cv.data as Array<{ id: string; contact_id: string; channel: Channel; unread_count: number; last_message_at: string | null; last_message_preview: string | null }>) {
    const leadId = leadByContact.get(c.contact_id)
    if (!leadId) continue
    leadByConvo.set(c.id, leadId)
    convos.push({
      leadId,
      channel: c.channel,
      preview: c.last_message_preview ?? '',
      time: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }) : '',
      unread: c.unread_count,
    })
  }

  const msgs: Message[] = (ms.data as unknown as Array<{ id: string; conversation_id: string; direction: 'in' | 'out'; channel: Message['channel']; body: string; created_at: string; users: { name: string } | null }>)
    .filter((m) => leadByConvo.has(m.conversation_id))
    .map((m) => ({
      id: m.id,
      leadId: leadByConvo.get(m.conversation_id)!,
      channel: m.channel,
      direction: m.direction,
      body: m.body,
      author: m.users?.name ?? undefined,
      time: new Date(m.created_at).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }),
    }))

  return { convos, msgs }
}

/* ---------- ESCRITURAS (optimistas: la UI ya cambió, esto persiste) ---------- */

export async function persistLeadPatch(lead: Lead, patch: Partial<Lead>) {
  const supabase = createBrowserSupabaseClient()
  const contactPatch: Record<string, unknown> = {}
  if (patch.name !== undefined) contactPatch.name = patch.name
  if (patch.company !== undefined) contactPatch.company = patch.company
  if (patch.phone !== undefined) contactPatch.phone_e164 = patch.phone
  if (patch.email !== undefined) contactPatch.email = patch.email

  const oppPatch: Record<string, unknown> = {}
  if (patch.stage !== undefined) oppPatch.stage_id = stageIdByKey[patch.stage]
  if (patch.temperature !== undefined) oppPatch.temperature = patch.temperature
  if (patch.value !== undefined) oppPatch.value = patch.value
  if (patch.score !== undefined) oppPatch.score = patch.score
  if (patch.dueDate) oppPatch.follow_up_at = new Date(patch.dueDate).toISOString()
  if (patch.stage === 'perdido') oppPatch.status = 'lost'

  if (Object.keys(contactPatch).length && lead.contactId) {
    const { error } = await supabase.from('contacts').update(contactPatch).eq('id', lead.contactId)
    if (error) throw error
  }
  if (Object.keys(oppPatch).length) {
    const { error } = await supabase.from('opportunities').update({ ...oppPatch, updated_at: new Date().toISOString() }).eq('id', lead.id)
    if (error) throw error
  }
}

export async function persistNewLead(
  accountId: string,
  userId: string,
  pipelineId: string,
  lead: Lead,
): Promise<{ oppId: string; contactId: string } | null> {
  const supabase = createBrowserSupabaseClient()
  const { data: contact, error: e1 } = await supabase
    .from('contacts')
    .insert({ account_id: accountId, name: lead.name, company: lead.company || null, phone_e164: lead.phone || null, email: lead.email || null, source: 'Manual' })
    .select('id').single()
  if (e1) throw e1
  const { data: opp, error: e2 } = await supabase
    .from('opportunities')
    .insert({
      account_id: accountId, contact_id: contact.id, pipeline_id: pipelineId,
      stage_id: stageIdByKey[lead.stage] ?? stageIdByKey['nuevo'],
      value: lead.value, temperature: lead.temperature, score: lead.score, owner_id: userId,
    })
    .select('id').single()
  if (e2) throw e2
  return { oppId: opp.id, contactId: contact.id }
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
