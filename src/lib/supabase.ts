// ════════════════════════════════════════════════════════════════
// SUPABASE CLIENT CONFIGURATION
// ════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// ─────────────────────────────────────────────────────────────────
// Server-side client (API routes, server components)
// ─────────────────────────────────────────────────────────────────

export function createServerSupabaseClient() {
  return createClient(url || '', key || '');
}

// ─────────────────────────────────────────────────────────────────
// Browser client (React components) — SINGLETON
// ─────────────────────────────────────────────────────────────────

let browserClient: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    return createServerSupabaseClient();
  }

  if (!browserClient) {
    if (!url || !key) {
      console.error('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      throw new Error('Supabase credentials not configured');
    }

    browserClient = createClient(url, key, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
}

// Alias corto para evitar crear múltiples instancias
export function getSupabaseBrowser() {
  return createBrowserSupabaseClient();
}

// NOTA: se eliminó el `export const supabase` a nivel de módulo. Creaba una
// SEGUNDA instancia de GoTrueClient sobre el mismo storage key (warning
// "Multiple GoTrueClient instances"). Todo el código usa ahora el singleton
// `createBrowserSupabaseClient()` o `createServerSupabaseClient()`.

// ─────────────────────────────────────────────────────────────────
// Constantes DEMO del CRM original (datos de ejemplo de leads/kanban)
// Se perdieron en la migración Vite → Next; se restauran para que
// la capa de datos del CRM (src/lib/db.ts) compile.
// ─────────────────────────────────────────────────────────────────

export const DEMO_ACCOUNT = 'a0000000-0000-0000-0000-000000000001'; // Equipo Rankers
export const DEMO_USER = '00000000-0000-0000-0000-0000000000a1';
export const DEMO_PIPELINE = '00000000-0000-0000-0000-0000000000b1';

// ─────────────────────────────────────────────────────────────────
// Type-safe getters
// ─────────────────────────────────────────────────────────────────

export async function getAccountFromAuth(supabaseClient: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data: account, error } = await supabaseClient
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return account;
}

export async function getPropertiesByAccount(
  supabaseClient: ReturnType<typeof createClient>,
  accountId: string,
  options?: { published?: boolean; featured?: boolean }
) {
  let query = supabaseClient
    .from('properties')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (options?.published) {
    query = query.eq('is_published', true);
  }

  if (options?.featured) {
    query = query.eq('is_featured', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPropertyBySlug(
  supabaseClient: ReturnType<typeof createClient>,
  accountId: string,
  slug: string
) {
  const { data, error } = await supabaseClient
    .from('properties')
    .select('*')
    .eq('account_id', accountId)
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

export async function getAgentsByAccount(
  supabaseClient: ReturnType<typeof createClient>,
  accountId: string
) {
  const { data, error } = await supabaseClient
    .from('agents')
    .select('*')
    .eq('account_id', accountId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getLeadsByAccount(
  supabaseClient: ReturnType<typeof createClient>,
  accountId: string,
  options?: { propertyId?: string; status?: string }
) {
  let query = supabaseClient
    .from('leads')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (options?.propertyId) {
    query = query.eq('property_id', options.propertyId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
