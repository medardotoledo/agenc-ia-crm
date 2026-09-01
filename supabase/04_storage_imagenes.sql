-- ════════════════════════════════════════════════════════════════
-- STORAGE — Bucket de imágenes de propiedades
-- ════════════════════════════════════════════════════════════════
-- Bucket PÚBLICO en lectura (para mostrar fotos en landing pages),
-- escritura solo para usuarios autenticados.
-- Re-ejecutable.
--
-- Correr en: Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Crear el bucket (público para lectura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas sobre storage.objects (RLS ya viene activo en Supabase)
DROP POLICY IF EXISTS property_images_public_read ON storage.objects;
CREATE POLICY property_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS property_images_auth_insert ON storage.objects;
CREATE POLICY property_images_auth_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images');

DROP POLICY IF EXISTS property_images_auth_update ON storage.objects;
CREATE POLICY property_images_auth_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS property_images_auth_delete ON storage.objects;
CREATE POLICY property_images_auth_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'property-images');

-- Verificar
SELECT id, name, public FROM storage.buckets WHERE id = 'property-images';
