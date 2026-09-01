/**
 * PUT    /api/website/zones/[id]  — actualizar zona
 * DELETE /api/website/zones/[id]  — eliminar zona
 */

import { createClient } from '@supabase/supabase-js';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, description, image_url, href, position } = body;

  const { data, error } = await svc()
    .from('website_zones')
    .update({ name, description, image_url, href, position })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ zone: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  // Eliminar imagen de storage si existe
  const { data: zone } = await svc()
    .from('website_zones')
    .select('image_url')
    .eq('id', params.id)
    .single();

  if (zone?.image_url) {
    const path = zone.image_url.split('/website-assets/')[1];
    if (path) await svc().storage.from('website-assets').remove([path]);
  }

  const { error } = await svc().from('website_zones').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
