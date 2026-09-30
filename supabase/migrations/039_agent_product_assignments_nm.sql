-- Migration 039: Relación Muchos a Muchos (N:M) entre ai_agents y ai_agent_products

CREATE TABLE IF NOT EXISTS ai_agent_product_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES ai_agent_products(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_product ON ai_agent_product_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_assignments_agent ON ai_agent_product_assignments(agent_id);

-- Migrar relaciones 1:1 previas
INSERT INTO ai_agent_product_assignments (product_id, agent_id, is_primary)
SELECT id, agent_id, true FROM ai_agent_products
WHERE agent_id IS NOT NULL
ON CONFLICT (product_id, agent_id) DO UPDATE SET is_primary = true;

-- Permitir que el catálogo viva en la cuenta sin requerir un agent_id estricto inicial
ALTER TABLE ai_agent_products ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE ai_agent_knowledge ALTER COLUMN agent_id DROP NOT NULL;
