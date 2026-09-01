/**
 * GET /api/properties
 * Obtiene propiedades de la BD para una agencia
 *
 * Query params:
 * - accountId: string (required)
 * - featured: boolean (optional)
 * - operation: 'Renta' | 'Venta' (optional)
 * - property_type: string (optional)
 * - city: string (optional)
 * - neighborhood: string (optional)
 * - min_price: number (optional)
 * - max_price: number (optional)
 * - bedrooms: number (optional)
 * - limit: number (default: 10)
 * - offset: number (default: 0)
 */

import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get('accountId');
    const featured = searchParams.get('featured') === 'true';
    const operation = searchParams.get('operation');
    const propertyType = searchParams.get('property_type');
    const city = searchParams.get('city');
    const neighborhood = searchParams.get('neighborhood');
    const minPrice = searchParams.get('min_price') ? parseInt(searchParams.get('min_price')!) : null;
    const maxPrice = searchParams.get('max_price') ? parseInt(searchParams.get('max_price')!) : null;
    const bedrooms = searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : null;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!accountId) {
      return Response.json({ error: 'accountId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (featured) query = query.eq('is_featured', true);
    if (operation) query = query.eq('operation', operation);
    if (propertyType) query = query.eq('property_type', propertyType);
    if (city) query = query.eq('city', city);
    if (neighborhood) query = query.eq('neighborhood', neighborhood);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (bedrooms) query = query.gte('bedrooms', bedrooms);

    query = query.range(offset, offset + limit - 1);

    const { data: properties, count, error } = await query;

    if (error) {
      throw error;
    }

    return Response.json({
      properties: properties || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[/api/properties] Error:', error);
    return Response.json(
      {
        error: 'Failed to fetch properties',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
