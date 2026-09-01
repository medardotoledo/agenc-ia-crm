-- ════════════════════════════════════════════════════════════════
-- TABLA: agency_settings
-- Almacena las credenciales de APIs por agencia (multi-tenant)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT UNIQUE NOT NULL, -- FK a agency_branding

  -- EasyBroker
  easybroker_api_key TEXT,
  easybroker_sync_enabled BOOLEAN DEFAULT false,

  -- OpenAI
  openai_api_key TEXT,
  openai_model TEXT DEFAULT 'gpt-4o-mini',

  -- Claude (Anthropic)
  claude_api_key TEXT,
  claude_model TEXT DEFAULT 'claude-opus-4-8',

  -- GoHighLevel
  ghl_location_id TEXT,
  ghl_form_id TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_account_id FOREIGN KEY (account_id)
    REFERENCES agency_branding(account_id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_agency_settings_account_id ON agency_settings(account_id);

-- RLS (Row Level Security)
ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Solo lectura si account_id coincide
CREATE POLICY "agency_settings_select" ON agency_settings
  FOR SELECT USING (
    -- TODO: Implementar con auth.uid() cuando tengas autenticación
    true
  );

-- Policy: Solo escritura si account_id coincide
CREATE POLICY "agency_settings_update" ON agency_settings
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_agency_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agency_settings_timestamp
  BEFORE UPDATE ON agency_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_settings_timestamp();
