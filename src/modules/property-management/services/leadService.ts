// Lead Service — captura de contactos desde landing pages + bandeja interna
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { Lead, CreateLeadInput, UpdateLeadInput } from '@/types/database';

const TABLE = 'leads';

export const leadService = {
  // CREATE (público — desde formulario de contacto)
  async create(accountId: string, input: CreateLeadInput): Promise<Lead> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        account_id: accountId,
        property_id: input.property_id,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        message: input.message ?? null,
        source: input.source ?? 'contact_form',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },

  // READ (List) — bandeja interna
  async list(accountId: string, options?: { status?: string; propertyId?: string }): Promise<Lead[]> {
    const supabase = createBrowserSupabaseClient();
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (options?.status) query = query.eq('status', options.status);
    if (options?.propertyId) query = query.eq('property_id', options.propertyId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Lead[];
  },

  // UPDATE (status)
  async update(accountId: string, leadId: string, input: UpdateLeadInput): Promise<Lead> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data as Lead;
  },
};
