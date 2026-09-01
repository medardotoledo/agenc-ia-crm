/**
 * GET  /api/website/zones?accountId=...  — lista pública (home)
 * POST /api/website/zones                — crear zona (admin)
 */

import { createClient } from '@supabase/supabase-js';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  const accountId = new URL(req.url).searchParams.get('accountId');
  if (!accountId) return Response.json({ error: 'accountId requerido' }, { status: 400 });

  const { data, error } = await svc()
    .from('website_zones')
    .select('*')
    .eq('account_id', accountId)
    .order('position', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ zones: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { accountId, name, description, image_url, href } = body;
  if (!accountId || !name) return Response.json({ error: 'accountId y name requeridos' }, { status: 400 });

  // Posición = al final
  const { count } = await svc()
    .from('website_zones')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId);

  const { data, error } = await svc()
    .from('website_zones')
    .insert({ account_id: accountId, name, description, image_url, href, position: count ?? 0 })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ zone: data }, { status: 201 });
}
