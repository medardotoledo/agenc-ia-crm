/**
 * POST /api/easybroker/import
 * Inicia importación masiva de propiedades desde EasyBroker
 *
 * Body:
 * {
 *   accountId: string (la agencia/cliente)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   imported: number,
 *   failed: number,
 *   errors: Array<{ebId, error}>
 * }
 */

import { PropertiesSyncService } from '@/lib/properties-sync';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, apiKey: apiKeyFromBody } = body;
    // limit: cuántas propiedades importar (default 50, mín 1, máx 50 por página).
    const limit = Math.max(1, Math.min(Number(body.limit) || 50, 50));

    if (!accountId) {
      return Response.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // 1. API key: primero la del body; si no, buscar en agency_settings.
    let apiKey: string | undefined = apiKeyFromBody?.trim() || undefined;

    if (!apiKey) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          ''
      );

      const { data: settings, error: settingsError } = await supabase
        .from('agency_settings')
        .select('easybroker_api_key')
        .eq('account_id', accountId)
        .single();

      if (settingsError || !settings?.easybroker_api_key) {
        return Response.json(
          {
            error: 'EasyBroker no configurado: falta API key (ni en el body ni en agency_settings)',
            details: settingsError?.message,
          },
          { status: 400 }
        );
      }
      apiKey = settings.easybroker_api_key;
    }

    // 2. Crear servicio y sincronizar (limitado).
    const syncService = new PropertiesSyncService(apiKey!);

    const result = await syncService.importAllProperties(accountId, {
      limit,
      page: 1,
    });

    return Response.json(result);
  } catch (error) {
    console.error('[/api/easybroker/import] Error:', error);
    return Response.json(
      {
        error: 'Failed to import properties',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
