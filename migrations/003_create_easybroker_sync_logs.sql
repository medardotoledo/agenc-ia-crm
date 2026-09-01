-- ════════════════════════════════════════════════════════════════
-- TABLA: easybroker_sync_logs
-- Auditoría de sincronizaciones con EasyBroker
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS easybroker_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  property_id UUID,

  -- Tipo de sincronización
  action VARCHAR(50), -- CREATE, UPDATE, DELETE, IMPORT
  status VARCHAR(50), -- success, failed, pending

  -- Detalles
  easybroker_id TEXT,
  error_message TEXT,
  response_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_account_id FOREIGN KEY (account_id)
    REFERENCES agency_branding(account_id) ON DELETE CASCADE,
  CONSTRAINT fk_property_id FOREIGN KEY (property_id)
    REFERENCES properties(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_easybroker_sync_logs_account_id ON easybroker_sync_logs(account_id);
CREATE INDEX idx_easybroker_sync_logs_status ON easybroker_sync_logs(status);
CREATE INDEX idx_easybroker_sync_logs_created_at ON easybroker_sync_logs(created_at DESC);

-- RLS
ALTER TABLE easybroker_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "easybroker_sync_logs_select" ON easybroker_sync_logs
  FOR SELECT USING (true);

CREATE POLICY "easybroker_sync_logs_insert" ON easybroker_sync_logs
  FOR INSERT WITH CHECK (true);
