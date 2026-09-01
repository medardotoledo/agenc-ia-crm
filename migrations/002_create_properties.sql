-- ════════════════════════════════════════════════════════════════
-- TABLA: properties
-- Propiedades inmobiliarias (creadas manualmente o importadas de EB)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL, -- FK a agency_branding

  -- Identificadores
  easybroker_id TEXT UNIQUE, -- ID público de EasyBroker (si está sincronizada)

  -- Información básica
  title TEXT NOT NULL,
  description_short TEXT,
  description_long TEXT,
  description_zone TEXT,

  -- Tipo y operación
  property_type VARCHAR(50), -- casa, departamento, terreno, etc.
  operation VARCHAR(50), -- compra, renta, ambas
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived

  -- Ubicación
  street TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Especificaciones técnicas
  price DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'MXN',
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  construction_sqm DECIMAL(10, 2),
  lot_sqm DECIMAL(10, 2),
  age_years INTEGER,
  condition VARCHAR(50), -- excelente, muy_buena, buena, regular, mala

  -- Contenido
  amenities TEXT[], -- array de amenidades
  gallery_images TEXT[], -- array de URLs de imágenes

  -- SEO
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),

  -- Destacada
  is_featured BOOLEAN DEFAULT false,

  -- EasyBroker
  easybroker_sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, failed
  easybroker_last_sync TIMESTAMP WITH TIME ZONE,
  easybroker_sync_error TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_account_id FOREIGN KEY (account_id)
    REFERENCES agency_branding(account_id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_properties_account_id ON properties(account_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_is_featured ON properties(is_featured);
CREATE INDEX idx_properties_easybroker_id ON properties(easybroker_id);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_operation ON properties(operation);

-- RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select" ON properties
  FOR SELECT USING (true);

CREATE POLICY "properties_insert" ON properties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "properties_update" ON properties
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_properties_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_properties_timestamp
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_properties_timestamp();
