/**
 * ════════════════════════════════════════════════════════════════
 * THEME RESOLVER
 * ════════════════════════════════════════════════════════════════
 * Obtiene el tema de la instancia/cliente actual desde Supabase.
 *
 * FLUJO:
 * 1. Server: getThemeForInstance() → consulta BD
 * 2. Retorna BrandTheme (colores de marca del cliente)
 * 3. ThemeProvider lo inyecta como CSS variables
 * 4. Todo lo que hereda funciona automáticamente
 *
 * CASCADA:
 * - Si cliente NO tiene tema en BD → retorna null → usa DEFAULT de tokens.css
 * - Si cliente SÍ tiene → retorna sus colores → ThemeProvider sobrescribe
 *
 * Última actualización: 14 de junio de 2026
 * ════════════════════════════════════════════════════════════════
 */

import { BrandTheme, DEFAULT_BRAND_THEME, AgencyBrandingRow } from '@/design-system/types';
import { createClient } from '@supabase/supabase-js';

/**
 * Obtiene el tema de la instancia actual (SERVER SIDE)
 *
 * PARÁMETROS (opcionales):
 * - accountId: UUID o string único de la agencia/instancia
 *   Si NO se pasa, intenta obtener de headers (recomendado en SSR)
 *
 * RETORNA:
 * - BrandTheme object si existe
 * - null si no existe (heredará DEFAULT de tokens.css)
 */
export async function getThemeForInstance(
  accountId?: string
): Promise<BrandTheme | null> {
  try {
    // Si no se pasa accountId, intenta obtenerlo del contexto
    // (implementar según cómo manejes multitenant)
    if (!accountId) {
      // Por ahora, usa 'nodo-inmobiliario' como default
      // TODO: Obtener account_id de headers/sesión en multitenant
      accountId = process.env.NEXT_PUBLIC_DEFAULT_ACCOUNT_ID || 'nodo-inmobiliario';
    }

    // Inicializa cliente Supabase (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[ThemeResolver] Missing Supabase credentials');
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consulta la tabla agency_branding
    try {
      const { data, error } = await supabase
        .from('agency_branding')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle(); // Retorna null si no hay resultados, en lugar de error

      if (error) {
        console.warn(
          `[ThemeResolver] Error querying agency_branding: ${error.message}`
        );
        return null;
      }

      if (!data) {
        console.debug(`[ThemeResolver] No theme found for account_id: ${accountId}`);
        return null;
      }

      // Mapea los datos de BD al formato BrandTheme
      return convertAgencyBrandingToTheme(data as AgencyBrandingRow);
    } catch (err) {
      console.warn(`[ThemeResolver] Exception while querying theme:`, err);
      return null;
    }
  } catch (err) {
    console.error('[ThemeResolver] Error fetching theme:', err);
    return null;
  }
}

/**
 * Convierte una fila de BD (agency_branding) a BrandTheme
 *
 * Filtra valores nulos/vacíos para que ThemeProvider
 * solo sobrescriba si hay valor explícito.
 */
function convertAgencyBrandingToTheme(row: AgencyBrandingRow): BrandTheme {
  return {
    primary: row.primary_color || undefined,
    primaryLight: row.primary_light_color || undefined,
    accent: row.accent_color || undefined,
    sidebar: row.sidebar_color || undefined,
  };
}

/**
 * HELPER: Crea o actualiza el tema de una instancia
 *
 * USO (en un API route):
 * ```ts
 * await updateThemeForInstance('nodo-uuid', {
 *   primary: '#1A3A52',
 *   accent: '#C89968'
 * });
 * ```
 */
export async function updateThemeForInstance(
  accountId: string,
  theme: Partial<BrandTheme>
): Promise<AgencyBrandingRow | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Primero, verifica si existe
    const { data: existing } = await supabase
      .from('agency_branding')
      .select('id')
      .eq('account_id', accountId)
      .single();

    const updates = {
      primary_color: theme.primary,
      primary_light_color: theme.primaryLight,
      accent_color: theme.accent,
      sidebar_color: theme.sidebar,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // UPDATE
      const { data, error } = await supabase
        .from('agency_branding')
        .update(updates)
        .eq('account_id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data as AgencyBrandingRow;
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('agency_branding')
        .insert({
          account_id: accountId,
          agency_name: accountId, // Fallback
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AgencyBrandingRow;
    }
  } catch (err) {
    console.error('[ThemeResolver] Error updating theme:', err);
    return null;
  }
}

/**
 * HELPER: Obtiene el tema por defecto (Matriz)
 *
 * Siempre retorna valores — nunca null.
 */
export function getDefaultTheme(): Required<BrandTheme> {
  return DEFAULT_BRAND_THEME as Required<BrandTheme>;
}
