/**
 * POST /api/website/upload
 * Sube una imagen al bucket "website-assets" de Supabase Storage.
 * Body: multipart/form-data con campo "file" y "accountId"
 */

import { createClient } from '@supabase/supabase-js';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const accountId = form.get('accountId') as string | null;

  if (!file || !accountId) {
    return Response.json({ error: 'file y accountId requeridos' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  if (!allowed.includes(ext)) {
    return Response.json({ error: 'Formato no permitido. Usa JPG, PNG o WebP.' }, { status: 400 });
  }

  const path = `zones/${accountId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await svc()
    .storage
    .from('website-assets')
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: urlData } = svc().storage.from('website-assets').getPublicUrl(path);
  return Response.json({ url: urlData.publicUrl }, { status: 201 });
}
