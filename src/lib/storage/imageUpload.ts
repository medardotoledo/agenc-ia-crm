// ════════════════════════════════════════════════════════════════
// SUBIDA DE IMÁGENES — Supabase Storage
// ════════════════════════════════════════════════════════════════
// Portable: solo depende del cliente de Supabase. Sube a un bucket
// público y devuelve la URL lista para mostrar.

import { createBrowserSupabaseClient } from '@/lib/supabase';

const BUCKET = 'property-images';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export async function uploadImage(file: File, accountId: string): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('La imagen supera el límite de 10 MB.');
  }

  const supabase = createBrowserSupabaseClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${accountId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadImages(files: File[], accountId: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadImage(file, accountId));
  }
  return urls;
}
