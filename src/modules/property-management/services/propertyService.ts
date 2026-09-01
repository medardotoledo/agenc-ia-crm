// Property Management Service
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { Property, CreatePropertyInput, UpdatePropertyInput } from '@/types/database';

const TABLE = 'properties';

export const propertyService = {
  // CREATE
  async create(accountId: string, input: CreatePropertyInput): Promise<Property> {
    const supabase = createBrowserSupabaseClient();

    // Generar slug desde título
    const slug = input.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .substring(0, 100);

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        account_id: accountId,
        title: input.title,
        slug: `${slug}-${Date.now()}`, // Agregar timestamp para unicidad
        price: input.price,
        currency: input.currency || 'MXN',
        operation: input.operation,
        property_type: input.property_type,
        city: input.city,
        state: input.state,
        is_published: false,
        gallery_images: [],
        floor_plans: [],
        nearby_places: [],
        assigned_agents: [],
      })
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  // READ (One)
  async getById(accountId: string, propertyId: string): Promise<Property> {
    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('account_id', accountId)
      .eq('id', propertyId)
      .single();

    if (error) throw error;
    return data as Property;
  },

  // READ (List)
  async list(
    accountId: string,
    options?: {
      published?: boolean;
      featured?: boolean;
      city?: string;
      state?: string;
      type?: string;
      operation?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Property[]> {
    const supabase = createBrowserSupabaseClient();

    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (options?.published) {
      query = query.eq('is_published', true);
    }

    if (options?.featured) {
      query = query.eq('is_featured', true);
    }

    if (options?.city) {
      query = query.eq('city', options.city);
    }

    if (options?.state) {
      query = query.eq('state', options.state);
    }

    if (options?.type) {
      query = query.eq('property_type', options.type);
    }

    if (options?.operation) {
      query = query.eq('operation', options.operation);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Property[];
  },

  // UPDATE
  async update(
    accountId: string,
    propertyId: string,
    input: UpdatePropertyInput
  ): Promise<Property> {
    const supabase = createBrowserSupabaseClient();

    // No permitir actualizar campos de solo-lectura / administrados por el sistema
    const PROTECTED = [
      'id',
      'account_id',
      'slug',
      'created_at',
      'created_by',
      'easybroker_id',
      'easybroker_sync_status',
      'easybroker_sync_log',
      'published_at',
    ];
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!PROTECTED.includes(key)) payload[key] = value;
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('account_id', accountId)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  // PUBLISH
  async publish(accountId: string, propertyId: string): Promise<Property> {
    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  // UNPUBLISH
  async unpublish(accountId: string, propertyId: string): Promise<Property> {
    const supabase = createBrowserSupabaseClient();

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  // TOGGLE FEATURED
  async toggleFeatured(accountId: string, propertyId: string): Promise<Property> {
    const supabase = createBrowserSupabaseClient();

    // Obtener estado actual
    const { data: current, error: getError } = await supabase
      .from(TABLE)
      .select('is_featured')
      .eq('account_id', accountId)
      .eq('id', propertyId)
      .single();

    if (getError) throw getError;

    // Actualizar
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        is_featured: !current.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) throw error;
    return data as Property;
  },

  // DELETE
  async delete(accountId: string, propertyId: string): Promise<void> {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('account_id', accountId)
      .eq('id', propertyId);

    if (error) throw error;
  },
};
