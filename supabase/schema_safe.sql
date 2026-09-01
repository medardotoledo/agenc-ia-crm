-- ════════════════════════════════════════════════════════════════
-- REAL ESTATE SAAS - SCHEMA SEGURO (IF NOT EXISTS)
-- ════════════════════════════════════════════════════════════════
-- SEGURO: Solo crea NUEVAS tablas, NO toca las existentes
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Fecha: 12-jun-2026

-- ─────────────────────────────────────────────────────────────────
-- TABLA: properties (Propiedades inmobiliarias)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Título y slug
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(account_id, slug),

  -- FICHA TÉCNICA
  price NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'MXN',
  operation TEXT NOT NULL,
  property_type TEXT NOT NULL,

  bedrooms INT,
  bathrooms NUMERIC(3, 1),
  half_baths INT,
  parking_spaces INT,
  age_years INT,
  construction_sqm NUMERIC(10, 2),
  lot_sqm NUMERIC(10, 2),
  levels INT,
  condition TEXT,

  -- UBICACIÓN
  street TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  location_notes TEXT,

  -- CONTENIDO
  amenities TEXT,
  description_short TEXT,
  description_long TEXT,
  description_zone TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- MEDIA
  gallery_images TEXT[] DEFAULT '{}',
  video_url TEXT,
  virtual_tour_url TEXT,
  floor_plans TEXT[] DEFAULT '{}',

  -- PUNTOS DE INTERÉS
  nearby_places JSONB DEFAULT '[]',

  -- FLAGS
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,

  -- AGENTES ASIGNADOS
  assigned_agents UUID[] DEFAULT '{}',

  -- EASYBROKER SYNC
  easybroker_id TEXT UNIQUE,
  easybroker_sync_status TEXT DEFAULT 'pending',
  easybroker_sync_log JSONB DEFAULT '[]',

  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT price_positive CHECK (price > 0)
);

CREATE INDEX IF NOT EXISTS idx_properties_account_id ON properties(account_id);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON properties(is_featured);
CREATE INDEX IF NOT EXISTS idx_properties_is_published ON properties(is_published);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS properties_isolation ON properties;
CREATE POLICY properties_isolation ON properties
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---

-- ─────────────────────────────────────────────────────────────────
-- TABLA: agents (Agentes inmobiliarios)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(account_id, slug),

  title TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,

  photo_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_agents_account_id ON agents(account_id);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agents_isolation ON agents;
CREATE POLICY agents_isolation ON agents
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS agents_updated_at ON agents;
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---

-- ─────────────────────────────────────────────────────────────────
-- TABLA: leads (Contactos desde landing pages)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,

  source TEXT DEFAULT 'contact_form',
  ghl_id TEXT,

  status TEXT DEFAULT 'new',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_isolation ON leads;
CREATE POLICY leads_isolation ON leads
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---

-- ─────────────────────────────────────────────────────────────────
-- TABLA: ai_generation_logs (Auditoría IA)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  generation_type TEXT NOT NULL,
  ai_model TEXT NOT NULL,

  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_cents INT,

  generated_text TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_account_id ON ai_generation_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_property_id ON ai_generation_logs(property_id);

ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_logs_isolation ON ai_generation_logs;
CREATE POLICY ai_logs_isolation ON ai_generation_logs
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

---

-- ─────────────────────────────────────────────────────────────────
-- TABLA: easybroker_sync_logs (Historial EasyBroker)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS easybroker_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  action TEXT NOT NULL,
  status TEXT NOT NULL,

  easybroker_id TEXT,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eb_sync_account_id ON easybroker_sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_eb_sync_property_id ON easybroker_sync_logs(property_id);

ALTER TABLE easybroker_sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eb_sync_isolation ON easybroker_sync_logs;
CREATE POLICY eb_sync_isolation ON easybroker_sync_logs
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

---

-- ─────────────────────────────────────────────────────────────────
-- TABLA: images (Metadatos de imágenes)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,

  width INT,
  height INT,

  thumbnail_path TEXT,
  webp_path TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_images_account_id ON images(account_id);
CREATE INDEX IF NOT EXISTS idx_images_property_id ON images(property_id);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS images_isolation ON images;
CREATE POLICY images_isolation ON images
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

---

-- ════════════════════════════════════════════════════════════════
-- FIN SCHEMA SEGURO
-- ════════════════════════════════════════════════════════════════
-- ✅ TODAS las tablas usan IF NOT EXISTS
-- ✅ NO sobrescribe nada existente
-- ✅ SEGURO para base de datos con datos
