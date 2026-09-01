// Agent Management Service
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@/types/database';

const TABLE = 'agents';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const agentService = {
  // CREATE
  async create(accountId: string, input: CreateAgentInput): Promise<Agent> {
    const supabase = createBrowserSupabaseClient();
    const slug = `${slugify(input.name) || 'agente'}-${Date.now().toString(36)}`;

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        account_id: accountId,
        name: input.name,
        slug,
        title: input.title ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        whatsapp: input.whatsapp ?? null,
        photo_id: input.photo_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Agent;
  },

  // READ (One)
  async getById(accountId: string, agentId: string): Promise<Agent> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('account_id', accountId)
      .eq('id', agentId)
      .single();

    if (error) throw error;
    return data as Agent;
  },

  // READ (List)
  async list(accountId: string): Promise<Agent[]> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('account_id', accountId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Agent[];
  },

  // UPDATE
  async update(accountId: string, agentId: string, input: UpdateAgentInput): Promise<Agent> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .eq('id', agentId)
      .select()
      .single();

    if (error) throw error;
    return data as Agent;
  },

  // DELETE
  async delete(accountId: string, agentId: string): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('account_id', accountId)
      .eq('id', agentId);

    if (error) throw error;
  },
};
