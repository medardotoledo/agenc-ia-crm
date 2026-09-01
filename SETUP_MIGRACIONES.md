# 🗄️ SETUP: Ejecutar Migraciones SQL

**Tiempo estimado:** 5 minutos

---

## Paso 1: Abre Supabase Dashboard

1. Navega a [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto `npeoyryvjklqhtdjqewx`
3. En sidebar izq: **SQL Editor**

---

## Paso 2: Copia la primera migración

Abre: `lead-suite/migrations/001_create_agency_settings.sql`

Copia **TODA** la siguiente query (sin los comentarios si lo prefieres):

```sql
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

CREATE INDEX idx_agency_settings_account_id ON agency_settings(account_id);

ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_settings_select" ON agency_settings
  FOR SELECT USING (true);

CREATE POLICY "agency_settings_update" ON agency_settings
  FOR UPDATE USING (true)
  WITH CHECK (true);

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
```

---

## Paso 3: Ejecuta en Supabase

1. En **SQL Editor** → Click en **+ New Query**
2. Pega el contenido
3. Click en botón **▶ Run** (abajo a la derecha)
4. Espera confirmar ✅ (debería tardar <1 seg)

**Resultado esperado:**
```
Success. No rows returned
```

---

## Paso 4: Repite para las otras 2 migraciones

### Migration 2: `002_create_properties.sql`

Copia todo el contenido y ejecuta igual.

```sql
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,

  -- Identificadores
  easybroker_id TEXT UNIQUE,

  -- Información básica
  title TEXT NOT NULL,
  description_short TEXT,
  description_long TEXT,
  description_zone TEXT,

  -- Tipo y operación
  property_type VARCHAR(50),
  operation VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',

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
  condition VARCHAR(50),

  -- Contenido
  amenities TEXT[],
  gallery_images TEXT[],

  -- SEO
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),

  -- Destacada
  is_featured BOOLEAN DEFAULT false,

  -- EasyBroker
  easybroker_sync_status VARCHAR(50) DEFAULT 'pending',
  easybroker_last_sync TIMESTAMP WITH TIME ZONE,
  easybroker_sync_error TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT fk_account_id FOREIGN KEY (account_id)
    REFERENCES agency_branding(account_id) ON DELETE CASCADE
);

CREATE INDEX idx_properties_account_id ON properties(account_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_is_featured ON properties(is_featured);
CREATE INDEX idx_properties_easybroker_id ON properties(easybroker_id);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_operation ON properties(operation);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select" ON properties
  FOR SELECT USING (true);

CREATE POLICY "properties_insert" ON properties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "properties_update" ON properties
  FOR UPDATE USING (true)
  WITH CHECK (true);

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
```

### Migration 3: `003_create_easybroker_sync_logs.sql`

```sql
CREATE TABLE IF NOT EXISTS easybroker_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  property_id UUID,

  -- Tipo de sincronización
  action VARCHAR(50),
  status VARCHAR(50),

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

CREATE INDEX idx_easybroker_sync_logs_account_id ON easybroker_sync_logs(account_id);
CREATE INDEX idx_easybroker_sync_logs_status ON easybroker_sync_logs(status);
CREATE INDEX idx_easybroker_sync_logs_created_at ON easybroker_sync_logs(created_at DESC);

ALTER TABLE easybroker_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "easybroker_sync_logs_select" ON easybroker_sync_logs
  FOR SELECT USING (true);

CREATE POLICY "easybroker_sync_logs_insert" ON easybroker_sync_logs
  FOR INSERT WITH CHECK (true);
```

---

## Paso 5: Verifica que las tablas existen

En **Supabase Dashboard** → **Table Editor** (sidebar izq)

Debería ver:
- ✅ agency_branding (ya existía)
- ✅ agency_settings (nueva)
- ✅ properties (nueva)
- ✅ easybroker_sync_logs (nueva)

---

## Paso 6: Inserta credenciales para Nodo Inmobiliario

Copia y ejecuta esta query en **SQL Editor**:

```sql
INSERT INTO agency_settings (
  account_id,
  easybroker_api_key,
  easybroker_sync_enabled
) VALUES (
  'nodo-inmobiliario',
  '7dod5kv5sxdcq0qja11jstcqgyhccg',
  true
)
ON CONFLICT (account_id) DO UPDATE SET
  easybroker_api_key = EXCLUDED.easybroker_api_key,
  easybroker_sync_enabled = EXCLUDED.easybroker_sync_enabled;
```

**Resultado esperado:**
```
Success. 1 row inserted
```

---

## Paso 7: Verifica que los datos se insertaron

Ejecuta esta query:

```sql
SELECT * FROM agency_settings 
WHERE account_id = 'nodo-inmobiliario';
```

**Deberías ver:**
```
id          | account_id           | easybroker_api_key                  | easybroker_sync_enabled
─────────────────────────────────────────────────────────────────────────────────────────────────
[UUID]      | nodo-inmobiliario    | 7dod5kv5sxdcq0qja11jstcqgyhccg     | true
```

---

## ✅ ¡Listo!

Ahora puedes:

1. Levantar el servidor:
   ```bash
   cd lead-suite
   npm run dev
   ```

2. Abrir http://localhost:3001

3. Hacer click en "Iniciar Sincronización Masiva" (botón en admin)

4. Ver propiedades aparecer en home

---

## 🆘 Si algo falla

### Error: "Table agency_branding does not exist"
→ Ejecutaste la migración 1 antes de que existiera agency_branding. 
   Solución: Vuelve a ejecutar la migración 1 (es idempotent con IF NOT EXISTS)

### Error: "Relation already exists"
→ Ya corriste la migración. Eso es OK, todas tienen `IF NOT EXISTS`

### Las propiedades no aparecen en home
→ Ejecuta en Supabase:
```sql
SELECT COUNT(*) FROM properties 
WHERE account_id = 'nodo-inmobiliario';
```
Si retorna 0, el sync no funcionó. Revisa console de Next.js.

### "Invalid API key" en sync
→ Verifica que copiaste completo: `7dod5kv5sxdcq0qja11jstcqgyhccg`

---

**¿Preguntas?** Revisa `EASYBROKER_INTEGRATION.md` (sección Troubleshooting)

**Tiempo:**
- Copiar/pegar 3 queries: 2 min
- Ejecutar 3 queries: <3 sec cada una
- Verificar: 1 min
- **Total: 5 min**

¡Adelante! 🚀
