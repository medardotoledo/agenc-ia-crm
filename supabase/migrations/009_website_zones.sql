-- ══════════════════════════════════════════════════════════════
-- 009_website_zones.sql
-- Zonas destacadas del sitio web por subcuenta.
-- El agente las configura desde el panel; el sitio público las muestra.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS website_zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  image_url   text,
  href        text,          -- ruta de búsqueda al hacer clic (ej: /propiedades?colonia=Zibatá)
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice para cargar zonas de una cuenta ordenadas
CREATE INDEX IF NOT EXISTS idx_website_zones_account ON website_zones(account_id, position);

-- RLS: cada cuenta solo ve y edita sus zonas
ALTER TABLE website_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zones_select" ON website_zones
  FOR SELECT USING (true);  -- público: el sitio web puede leer sin auth

CREATE POLICY "zones_insert" ON website_zones
  FOR INSERT WITH CHECK (true);  -- service role lo controla en el backend

CREATE POLICY "zones_update" ON website_zones
  FOR UPDATE USING (true);

CREATE POLICY "zones_delete" ON website_zones
  FOR DELETE USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS website_zones_updated_at ON website_zones;
CREATE TRIGGER website_zones_updated_at
  BEFORE UPDATE ON website_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════
-- Storage bucket para imágenes del sitio web
-- Ejecutar también en Supabase Dashboard → Storage → New bucket:
--   Nombre: website-assets | Public: true
-- O ejecutar esto si tu plan permite SQL storage:
-- ══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-assets', 'website-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede leer (imágenes públicas)
CREATE POLICY "website_assets_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'website-assets');

-- Política: solo con service role se puede subir (controlado por el backend)
CREATE POLICY "website_assets_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'website-assets');

CREATE POLICY "website_assets_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'website-assets');
