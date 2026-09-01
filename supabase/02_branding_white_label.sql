-- ════════════════════════════════════════════════════════════════
-- WHITE-LABEL POR INSTANCIA  (theming en cascada nivel Instancia)
-- ════════════════════════════════════════════════════════════════
-- Agrega a cada instancia (tabla accounts) sus campos de marca propios.
-- Si un campo queda NULL, la instancia HEREDA el valor por defecto de
-- la Matriz (definido en src/design-system/tokens.css).
--
-- Correr en: Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Colores de marca (hex, ej. '#1e3a8a'). NULL = hereda de la Matriz.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_primary       TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_primary_light TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_accent        TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS brand_sidebar       TEXT;

-- Dominio personalizado (ej. 'crm.inmobiliariaX.com'). NULL = usa subdominio.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- Etiqueta visible del giro (lo que ve el usuario en vez de "Instancia").
-- Inmobiliaria por defecto; podría ser 'Consultorio', 'Sucursal', etc.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS display_label TEXT DEFAULT 'Inmobiliaria';

-- Verificar que quedaron las columnas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;
