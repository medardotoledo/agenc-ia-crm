-- ════════════════════════════════════════════════════════════════
-- REAL ESTATE SAAS - SCHEMA SUPABASE
-- ════════════════════════════════════════════════════════════════
-- Ejecutar en: Supabase Dashboard → SQL Editor → Nuevo query
-- Fecha: 12-jun-2026

-- ─────────────────────────────────────────────────────────────────
-- 1. TABLA: accounts (Multi-tenant configuration)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Datos de la agencia
  agency_name TEXT NOT NULL DEFAULT 'Mi Agencia',
  agency_tagline TEXT DEFAULT 'Bienes Raíces Premium',
  logo_id TEXT, -- URL en Supabase Storage

  -- IA Configuration
  ai_provider TEXT DEFAULT 'openai', -- 'openai' | 'claude'
  openai_api_key TEXT, -- encriptado en producción
  claude_api_key TEXT, -- encriptado en producción

  -- EasyBroker Configuration
  easybroker_api_key TEXT, -- encriptado
  easybroker_sync_enabled BOOLEAN DEFAULT false,

  -- GoHighLevel Configuration
  ghl_form_id TEXT,
  ghl_form_height INT DEFAULT 560,

  -- Metadata
  timezone TEXT DEFAULT 'America/Mexico_City',
  language TEXT DEFAULT 'es',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- RLS: Users can only access their own account
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_isolation ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---

-- ─────────────────────────────────────────────────────────────────
-- 2. TABLA: properties (Propiedades inmobiliarias)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Título y slug
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(account_id, slug),

  -- FICHA TÉCNICA
  price NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'MXN', -- 'MXN' | 'USD'
  operation TEXT NOT NULL, -- 'Venta' | 'Renta' | 'Desarrollo' | 'Remate'
  property_type TEXT NOT NULL, -- 'Casa', 'Departamento', 'Terreno', etc.

  bedrooms INT,
  bathrooms NUMERIC(3, 1),
  half_baths INT,
  parking_spaces INT,
  age_years INT,
  construction_sqm NUMERIC(10, 2),
  lot_sqm NUMERIC(10, 2),
  levels INT,
  condition TEXT, -- 'Nuevo', 'Excelente', 'Bueno', 'Regular', 'A remodelar', 'En construcción'

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

  -- PUNTOS DE INTERÉS (JSON array)
  nearby_places JSONB DEFAULT '[]',

  -- FLAGS
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,

  -- AGENTES ASIGNADOS (UUID array)
  assigned_agents UUID[] DEFAULT '{}',

  -- EASYBROKER SYNC
  easybroker_id TEXT UNIQUE,
  easybroker_sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'error'
  easybroker_sync_log JSONB DEFAULT '[]',

  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT price_positive CHECK (price > 0)
);

-- Índices
CREATE INDEX idx_properties_account_id ON properties(account_id);
CREATE INDEX idx_properties_slug ON properties(slug);
CREATE INDEX idx_properties_is_featured ON properties(is_featured);
CREATE INDEX idx_properties_is_published ON properties(is_published);
CREATE INDEX idx_properties_city_state ON properties(city, state);
CREATE INDEX idx_properties_created_at ON properties(created_at DESC);

-- RLS: Users can only access their own properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY properties_isolation ON properties
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- Auto-update timestamp
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---

-- ─────────────────────────────────────────────────────────────────
-- 3. TABLA: agents (Agentes inmobiliarios)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(account_id, slug),

  title TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,

  -- Foto (URL en Storage)
  photo_id TEXT,

  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_agents_account_id ON agents(account_id);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_isolation ON agents
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---

-- ─────────────────────────────────────────────────────────────────
-- 4. TABLA: leads (Contactos desde landing pages)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Datos del lead
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,

  -- Source y metadata
  source TEXT DEFAULT 'contact_form', -- 'contact_form', 'ghl_webhook', 'api'
  ghl_id TEXT,

  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'lost'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_account_id ON leads(account_id);
CREATE INDEX idx_leads_property_id ON leads(property_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_isolation ON leads
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---

-- ─────────────────────────────────────────────────────────────────
-- 5. TABLA: ai_generation_logs (Auditoría IA)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  generation_type TEXT NOT NULL, -- 'desc_corta', 'desc_larga', 'desc_zona', 'meta_title', 'meta_desc'
  ai_model TEXT NOT NULL, -- 'openai', 'claude'

  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_cents INT,

  generated_text TEXT,
  status TEXT DEFAULT 'success', -- 'success', 'error'
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_account_id ON ai_generation_logs(account_id);
CREATE INDEX idx_ai_logs_property_id ON ai_generation_logs(property_id);

ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_logs_isolation ON ai_generation_logs
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

---

-- ─────────────────────────────────────────────────────────────────
-- 6. TABLA: easybroker_sync_logs (Historial EasyBroker)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE easybroker_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  action TEXT NOT NULL, -- 'create', 'update', 'import'
  status TEXT NOT NULL, -- 'success', 'error'

  easybroker_id TEXT,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eb_sync_account_id ON easybroker_sync_logs(account_id);
CREATE INDEX idx_eb_sync_property_id ON easybroker_sync_logs(property_id);

ALTER TABLE easybroker_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY eb_sync_isolation ON easybroker_sync_logs
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

---

-- ─────────────────────────────────────────────────────────────────
-- 7. TABLA: images (Metadatos de imágenes)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,

  -- Dimensiones
  width INT,
  height INT,

  -- Thumbnails
  thumbnail_path TEXT,

  -- WebP conversion (para EasyBroker)
  webp_path TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, storage_path)
);

CREATE INDEX idx_images_account_id ON images(account_id);
CREATE INDEX idx_images_property_id ON images(property_id);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;
CREATE POLICY images_isolation ON images
  FOR ALL USING (
    account_id = (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

---

-- ─────────────────────────────────────────────────────────────────
-- FUNCIONES AUXILIARES
-- ─────────────────────────────────────────────────────────────────

-- Función para auto-actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---

-- ════════════════════════════════════════════════════════════════
-- FIN SCHEMA
-- ════════════════════════════════════════════════════════════════
