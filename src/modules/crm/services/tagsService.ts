// Servicio de etiquetas (tags). Etiquetas personalizadas ilimitadas por subcuenta.
// Cada add/remove emite un EVENTO (tabla `events`) — base para que
// automatizaciones / IA detonen acciones por etiqueta.
import { createBrowserSupabaseClient } from '@/lib/supabase';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

// Emite un evento de dominio (fuente de triggers para automatizaciones/IA).
async function emitEvent(
  accountId: string,
  eventType: string,
  contactId: string,
  payload: Record<string, unknown>,
) {
  const supabase = createBrowserSupabaseClient();
  await supabase.from('events').insert({
    account_id: accountId,
    event_type: eventType,
    entity_type: 'contact',
    entity_id: contactId,
    payload,
  });
}

export const tagsService = {
  /** Catálogo de etiquetas de la subcuenta. */
  async list(accountId: string): Promise<Tag[]> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, color')
      .eq('account_id', accountId)
      .order('name');
    if (error) throw error;
    return (data ?? []) as Tag[];
  },

  /** Crea una etiqueta nueva (ilimitadas). */
  async create(accountId: string, name: string, color = '#DBEAFE'): Promise<Tag> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('tags')
      .insert({ account_id: accountId, name: name.trim(), color })
      .select('id, name, color')
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async remove(tagId: string): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from('tags').delete().eq('id', tagId);
    if (error) throw error;
  },

  /** Etiquetas por contacto, para una lista de contactos (para pintar en el board). */
  async forContacts(accountId: string, contactIds: string[]): Promise<Map<string, Tag[]>> {
    const map = new Map<string, Tag[]>();
    if (contactIds.length === 0) return map;
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('contact_tags')
      .select('contact_id, tags(id, name, color)')
      .eq('account_id', accountId)
      .in('contact_id', contactIds);
    if (error) throw error;
    for (const row of (data ?? []) as unknown as Array<{ contact_id: string; tags: Tag }>) {
      if (!row.tags) continue;
      const arr = map.get(row.contact_id) ?? [];
      arr.push(row.tags);
      map.set(row.contact_id, arr);
    }
    return map;
  },

  /** Asigna una etiqueta a un contacto + emite evento 'contact.tag_added'. */
  async addToContact(accountId: string, contactId: string, tag: Tag): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from('contact_tags')
      .upsert(
        { account_id: accountId, contact_id: contactId, tag_id: tag.id },
        { onConflict: 'contact_id,tag_id' },
      );
    if (error) throw error;
    await emitEvent(accountId, 'contact.tag_added', contactId, { tag_id: tag.id, tag_name: tag.name });
  },

  /** Quita una etiqueta de un contacto + emite evento 'contact.tag_removed'. */
  async removeFromContact(accountId: string, contactId: string, tag: Tag): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .eq('tag_id', tag.id);
    if (error) throw error;
    await emitEvent(accountId, 'contact.tag_removed', contactId, { tag_id: tag.id, tag_name: tag.name });
  },
};
