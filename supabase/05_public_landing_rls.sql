-- ════════════════════════════════════════════════════════════════
-- RLS PÚBLICA — para las landing pages públicas
-- ════════════════════════════════════════════════════════════════
-- Permite que CUALQUIERA (sin login) pueda:
--   • leer propiedades PUBLICADAS
--   • leer agentes (info pública: nombre, foto, teléfono)
--   • enviar el formulario de contacto (insertar un lead)
-- El dueño sigue viendo TODO lo suyo (las políticas se combinan con OR).
--
-- Correr en: Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Propiedades publicadas: lectura pública
DROP POLICY IF EXISTS properties_public_read ON properties;
CREATE POLICY properties_public_read ON properties
  FOR SELECT USING (is_published = true);

-- Agentes: lectura pública (se muestran en la landing)
DROP POLICY IF EXISTS agents_public_read ON agents;
CREATE POLICY agents_public_read ON agents
  FOR SELECT USING (true);

-- Leads: inserción pública desde el formulario de contacto
DROP POLICY IF EXISTS leads_public_insert ON leads;
CREATE POLICY leads_public_insert ON leads
  FOR INSERT WITH CHECK (true);
