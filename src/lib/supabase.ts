// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SUPABASE CLIENT CONFIGURATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Server-side client (API routes, server components)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function createServerSupabaseClient() {
  return createClient(url || '', key || '');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Browser client (React components) â€” SINGLETON
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        storage: (function() { try { if (typeof window !== 'undefined' && window.localStorage) { window.localStorage.getItem('test'); return window.localStorage; } } catch(e) {} return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; })(),
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
}

// Alias corto para evitar crear mÃºltiples instancias
export function getSupabaseBrowser() {
  return createBrowserSupabaseClient();
}

// NOTA: se eliminÃ³ el `export const supabase` a nivel de mÃ³dulo. Creaba una
// SEGUNDA instancia de GoTrueClient sobre el mismo storage key (warning
// "Multiple GoTrueClient instances"). Todo el cÃ³digo usa ahora el singleton
// `createBrowserSupabaseClient()` o `createServerSupabaseClient()`.

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Constantes DEMO del CRM original (datos de ejemplo de leads/kanban)
// Se perdieron en la migraciÃ³n Vite â†’ Next; se restauran para que
// la capa de datos del CRM (src/lib/db.ts) compile.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEMO_ACCOUNT = 'a0000000-0000-0000-0000-000000000001'; // Equipo Rankers
export const DEMO_USER = '00000000-0000-0000-0000-0000000000a1';
export const DEMO_PIPELINE = '00000000-0000-0000-0000-0000000000b1';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Type-safe getters
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


