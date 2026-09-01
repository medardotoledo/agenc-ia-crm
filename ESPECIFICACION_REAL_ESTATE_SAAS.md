# 🏘️ ESPECIFICACIÓN COMPLETA: REAL ESTATE SAAS (Next.js/React/Supabase)

**Versión:** 2.0 — Replicación exacta del sistema WordPress  
**Fecha:** 12 de junio de 2026  
**Stack:** Next.js 14 + React + TypeScript + Supabase (PostgreSQL) + Tailwind CSS v4  
**Objetivo:** Sistema inmobiliario profesional con IA, SEO automático, EasyBroker sync, CRM integrado

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de Datos (Supabase)](#estructura-de-datos-supabase)
4. [Módulos Principales](#módulos-principales)
5. [Panel de Control (Admin)](#panel-de-control-admin)
6. [Landing Page Dinámico](#landing-page-dinámico)
7. [Generación IA](#generación-ia)
8. [Integración EasyBroker](#integración-easybroker)
9. [Integración GoHighLevel](#integración-gohighlevel)
10. [API Routes](#api-routes)
11. [Flujos de Usuario](#flujos-de-usuario)
12. [Timeline de Implementación](#timeline-de-implementación)

---

## 🎯 VISIÓN GENERAL

**¿Qué es?**  
Sistema inmobiliario SaaS multi-tenant que permite a agentes/brokers:
- Crear, editar y publicar propiedades con datos detallados
- Generar automáticamente descripciones con IA (Claude/OpenAI)
- Ver landing pages dinámicas con contenido SEO
- Sincronizar propiedades automáticamente con EasyBroker
- Recibir leads a través de formulario integrado con GoHighLevel CRM
- Seleccionar propiedades "destacadas" para la home

**¿Qué NO es?**
- ❌ No es un page builder drag-drop
- ❌ No es un editor visual
- ❌ No es solo una landing page estática
- ✅ Es un CRUD completo de propiedades + landing dinámico

**Usuarios:**
1. **Agente Inmobiliario** → Crea propiedades, gestiona agentes asignados, ve leads
2. **Admin/Broker** → Accede al panel completo, configura APIs, ve analytics
3. **Público** → Ve catálogo de propiedades, visualiza landing pages, envía leads

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                      NEXT.JS APP                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  FRONTEND (React + TypeScript)                       │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  • CRM Home (Sidebar + Topbar + Lead Panel)         │   │
│  │  • Admin Panel (Property Management, Settings)      │   │
│  │  • Landing Page (Property Detail — Dynamic)         │   │
│  │  • Property Listing (Catálogo)                      │   │
│  │  • Auth (Login/Register)                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API ROUTES (Next.js app/api/)                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  /api/properties/* (CRUD)                           │   │
│  │  /api/agents/* (CRUD)                               │   │
│  │  /api/ai/generate (IA generation)                   │   │
│  │  /api/settings/* (Config)                           │   │
│  │  /api/easybroker/* (Sync)                           │   │
│  │  /api/ghl/* (Webhook de formularios)                │   │
│  │  /api/leads/* (Leads del CRM)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                    │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    ┌────────────┐      ┌──────────────┐   ┌────────────────┐
    │  SUPABASE  │      │ OPENAI/      │   │  EASYBROKER    │
    │ (PostgreSQL)      │ CLAUDE API   │   │  CRM API       │
    │            │      │              │   │                │
    │ • accounts │      └──────────────┘   │ • Properties   │
    │ • properties      ┌──────────────┐   │ • Agents       │
    │ • agents    ────→ │GOHIGHLEVEL   │   │ • Sync logs    │
    │ • settings  │      │ CRM API      │   └────────────────┘
    │ • leads     │      └──────────────┘
    │ • images    │
    └────────────┘
```

---

## 💾 ESTRUCTURA DE DATOS (SUPABASE)

### **1. TABLA: accounts**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos de la agencia
  agency_name TEXT NOT NULL,
  agency_tagline TEXT,
  logo_id TEXT, -- URL del logo en Supabase Storage
  
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

-- RLS Policy: Users can only access their own account
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_isolation ON accounts
  USING (auth.uid() = user_id);
```

### **2. TABLA: properties**
```sql
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
  bathrooms NUMERIC(3, 1), -- ej: 3.5
  half_baths INT,
  parking_spaces INT,
  age_years INT,
  construction_sqm NUMERIC(10, 2),
  lot_sqm NUMERIC(10, 2),
  levels INT,
  condition TEXT, -- 'Nuevo', 'Excelente', 'Bueno', 'Regular', 'A remodelar', 'En construcción'
  
  -- UBICACIÓN
  street TEXT,
  neighborhood TEXT, -- colonia/fraccionamiento
  city TEXT NOT NULL,
  state TEXT NOT NULL, -- estado mexicano
  postal_code TEXT,
  location_notes TEXT, -- notas privadas, solo agente
  
  -- CONTENIDO
  amenities TEXT, -- separadas por comas
  description_short TEXT, -- 2-3 líneas
  description_long TEXT, -- 200-280 palabras
  description_zone TEXT, -- 100-150 palabras
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- MEDIA
  gallery_images TEXT[], -- array de URLs de Supabase Storage
  video_url TEXT, -- YouTube URL
  virtual_tour_url TEXT, -- Matterport/iGüide
  floor_plans TEXT[], -- array de URLs
  
  -- PUNTOS DE INTERÉS
  nearby_places JSONB, -- array: [{ type: 'Escuela', distance: '500m' }, ...]
  
  -- FLAGS
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  
  -- AGENTES ASIGNADOS
  assigned_agents UUID[], -- array de agent IDs
  
  -- EASYBROKER SYNC
  easybroker_id TEXT UNIQUE, -- ID público en EB
  easybroker_sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'error'
  easybroker_sync_log JSONB, -- array de logs
  
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

-- RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY properties_isolation ON properties
  USING (account_id = (SELECT id FROM accounts WHERE user_id = auth.uid()));
```

### **3. TABLA: agents**
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(account_id, slug),
  
  title TEXT, -- "Agente Inmobiliario", "Broker", etc.
  email TEXT,
  phone TEXT,
  whatsapp TEXT, -- con código país: 52771234567
  
  -- Foto
  photo_id TEXT, -- URL en Supabase Storage (círculo 96×96)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_agents_account_id ON agents(account_id);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_isolation ON agents
  USING (account_id = (SELECT id FROM accounts WHERE user_id = auth.uid()));
```

### **4. TABLA: leads**
```sql
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
  ghl_id TEXT, -- ID del contacto en GHL
  
  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'lost'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_account_id ON leads(account_id);
CREATE INDEX idx_leads_property_id ON leads(property_id);
CREATE INDEX idx_leads_status ON leads(status);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_isolation ON leads
  USING (account_id = (SELECT id FROM accounts WHERE user_id = auth.uid()));
```

### **5. TABLA: ai_generation_logs**
```sql
CREATE TABLE ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  
  generation_type TEXT NOT NULL, -- 'desc_corta', 'desc_larga', 'desc_zona', 'meta_title', 'meta_desc'
  ai_model TEXT NOT NULL, -- 'openai', 'claude'
  
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_cents INT, -- costo en centavos
  
  generated_text TEXT,
  status TEXT DEFAULT 'success', -- 'success', 'error'
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_account_id ON ai_generation_logs(account_id);
CREATE INDEX idx_ai_logs_property_id ON ai_generation_logs(property_id);
```

### **6. TABLA: easybroker_sync_logs**
```sql
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
```

### **7. TABLA: images** (Metadatos de imágenes)
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  storage_path TEXT NOT NULL, -- ruta en Supabase Storage
  
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
```

---

## 🔧 MÓDULOS PRINCIPALES

### **Módulo 1: Property Management (CRUD)**

**Ubicación:** `src/modules/property-management/`

```
property-management/
├── components/
│   ├── PropertyForm.tsx (FORM: 6 tabs, 55+ campos)
│   ├── PropertyList.tsx (TABLE: listado con búsqueda/filtros)
│   ├── PropertyCard.tsx (CARD: preview en listado)
│   ├── Tabs/
│   │   ├── TechnicalSpecsTab.tsx
│   │   ├── LocationTab.tsx
│   │   ├── ContentTab.tsx
│   │   ├── MediaTab.tsx
│   │   ├── SEOTab.tsx
│   │   └── AgentsTab.tsx
│   ├── Modals/
│   │   ├── NearbyPlacesModal.tsx (CRUD de lugares cercanos)
│   │   └── ConfirmDeleteModal.tsx
│   └── ui/
│       ├── ImageGallery.tsx (drag-drop reordenable)
│       ├── FloorPlansUpload.tsx
│       └── FeaturedToggle.tsx
│
├── services/
│   ├── propertyService.ts (API calls: CRUD)
│   └── imageService.ts (Upload, optimize, delete)
│
├── types/
│   └── property.ts (TypeScript interfaces)
│
└── hooks/
    ├── usePropertyForm.ts (Form state + validation)
    └── usePropertyList.ts (List state, pagination, filters)
```

**Campos principales:**

| Tab | Campo | Tipo | Validación |
|-----|-------|------|-----------|
| **Técnica** | Precio | number | > 0 |
| | Moneda | select | MXN/USD |
| | Operación | select | 4 opciones |
| | Tipo | select | 10 opciones |
| | Recámaras | number | ≥ 0 |
| | Baños | number | ≥ 0 |
| | m² Construcción | number | > 0 |
| | m² Lote | number | > 0 |
| | Estado conserv. | radio | 6 opciones |
| **Ubicación** | Calle | text | required |
| | Colonia | text | required |
| | Ciudad | text | required |
| | Estado | select | 32 MX |
| | CP | text | 5 chars |
| | Notas internas | textarea | private |
| | Lugares cercanos | CRUD | poi array |
| **Contenido** | Amenidades | textarea | comma-sep |
| | Desc. corta | textarea | +IA btn |
| | Desc. larga | textarea | +IA btn |
| | Desc. zona | textarea | +IA btn |
| **Media** | Galería | upload | drag-drop |
| | Video YT | url | |
| | Tour virtual | url | |
| | Planos | upload | drag-drop |
| **SEO** | Meta Title | text | 60 max, +IA |
| | Meta Desc | textarea | 160 max, +IA |
| | Schema preview | readonly | auto-gen |
| **Agentes** | Asignados | checklist | agents array |

---

### **Módulo 2: Agent Management**

**Ubicación:** `src/modules/agent-management/`

```
agent-management/
├── components/
│   ├── AgentForm.tsx
│   ├── AgentList.tsx
│   ├── AgentCard.tsx
│   └── PhotoUploader.tsx (circular preview)
│
├── services/
│   └── agentService.ts
│
├── types/
│   └── agent.ts
│
└── hooks/
    └── useAgentForm.ts
```

**Campos:**
- Nombre (text, required)
- Foto (circular 96×96, media upload)
- Cargo (text)
- Teléfono (text)
- WhatsApp (text, formato: 52771234567)
- Email (email)

---

### **Módulo 3: Settings/Configuration**

**Ubicación:** `src/modules/settings/`

```
settings/
├── components/
│   ├── AIConfigForm.tsx (OpenAI + Claude keys)
│   ├── EasyBrokerConfigForm.tsx (API key + sync toggle)
│   ├── GHLConfigForm.tsx (Form ID + height)
│   ├── AgencyDataForm.tsx (Logo + name + tagline)
│   ├── EasyBrokerImportButton.tsx (Sync masivo)
│   └── SyncProgressBar.tsx (live progress)
│
├── services/
│   ├── settingsService.ts
│   └── easybrokerService.ts
│
└── hooks/
    └── useSettings.ts
```

---

### **Módulo 4: Property Landing Page (Dynamic)**

**Ubicación:** `app/(public)/property/[slug]/page.tsx`

**8 Bloques dinámicos:**

1. **Hero Section**
   - Título (auto desde property.title)
   - Categoría badge (auto desde property.operation + property_type)
   - Ubicación (auto desde city, state)
   - Precio (auto formateado)
   - Galería carousel (auto desde gallery_images)

2. **Características / Specs**
   - Grid de características (recámaras, baños, m², etc.)
   - Amenidades (lista)
   - Descripción larga (auto-generada con IA)

3. **Datos en Métricas** (4 cards)
   - m² Construcción
   - Recámaras
   - Baños
   - m² Lote

4. **Galería Grande**
   - Grid de fotos (2×3 o 3×3)
   - Lightbox al hacer click

5. **Sección Experiencia**
   - Título + descripción
   - 3 cards de beneficios

6. **Agentes Asignados**
   - Card por agente
   - Foto circular
   - Cargo, email, teléfono
   - Botones: WhatsApp | Llamar | Enviar mensaje

7. **Formulario de Contacto**
   - Integrado con GoHighLevel
   - Nombre, email, teléfono, mensaje
   - Auto-rellena nombre si viene en URL
   - Envía datos a GHL webhook

8. **Footer (Global)**
   - Logo, info agencia
   - Links navegación
   - Contacto

---

### **Módulo 5: Property Listing (Catálogo)**

**Ubicación:** `app/(public)/propiedades/page.tsx`

**Funcionalidad:**
- Listado de TODAS las propiedades publicadas
- Filtros: ciudad, tipo, operación, rango de precio
- Búsqueda por nombre
- Cards con foto, precio, ubicación, "Ver propiedad"
- Paginación
- Sorts: más reciente, menor precio, mayor precio

---

### **Módulo 6: Home Page (Public)**

**Ubicación:** `app/(public)/page.tsx`

**Secciones:** (Ya documentadas en análisis anterior)

1. Hero + Search
2. About
3. Services (4 cards)
4. Exclusive Zones
5. **Featured Properties** (3 cards - auto desde `is_featured`)
6. CTA
7. Footer

---

## 🎛️ PANEL DE CONTROL (ADMIN)

**Ubicación:** `app/admin/` (protegido por auth)

**Estructura:**

```
/admin
├── page.tsx (Dashboard: overview de propiedades, leads, stats)
├── properties/
│   ├── page.tsx (Listado: tabla con búsqueda, filtros, crear)
│   ├── [id]/page.tsx (Editar: PropertyForm con 6 tabs)
│   ├── [id]/preview.tsx (Preview de landing dinámico)
│   └── new/page.tsx (Crear nueva)
├── agents/
│   ├── page.tsx (Listado)
│   ├── [id]/page.tsx (Editar)
│   └── new/page.tsx (Crear nuevo)
├── leads/
│   ├── page.tsx (Listado: filtrar por property, status, fecha)
│   └── [id]/page.tsx (Detalle del lead)
├── settings/
│   ├── page.tsx (Configuración global)
│   ├── ai-config/page.tsx
│   ├── easybroker-config/page.tsx
│   └── ghl-config/page.tsx
└── layout.tsx (Sidebar + Topbar)
```

---

## 🌐 LANDING PAGE DINÁMICO

**URL:** `/propiedad/[slug]`  
**Renderizado:** SSG + ISR (revalidate cada 60s)

**Componentes principales:**

```tsx
// app/(public)/property/[slug]/page.tsx

export const generateStaticParams = async () => {
  // Genera rutas para todas las propiedades publicadas
  const props = await supabase
    .from('properties')
    .select('slug')
    .eq('is_published', true);
  return props.map(p => ({ slug: p.slug }));
};

export default async function PropertyPage({ params }) {
  const property = await fetchPropertyBySlug(params.slug);
  if (!property?.is_published) notFound();
  
  return (
    <Layout>
      <PropertyHero property={property} />
      <PropertySpecs property={property} />
      <PropertyMetrics property={property} />
      <PropertyGallery property={property} />
      <PropertyExperience />
      <PropertyAgents property={property} />
      <ContactForm property={property} />
      <Footer />
    </Layout>
  );
}
```

**PropertyHero.tsx:**
```tsx
export default function PropertyHero({ property }) {
  return (
    <div className="hero">
      <div className="gallery-carousel">
        {property.gallery_images.map((img, i) => (
          <img key={i} src={img} alt="" />
        ))}
      </div>
      <div className="hero-content">
        <Badge>{property.operation} — {property.property_type}</Badge>
        <h1>{property.title}</h1>
        <p>{property.city}, {property.state}</p>
        <p className="price">${property.price.toLocaleString()} {property.currency}</p>
      </div>
    </div>
  );
}
```

---

## 🤖 GENERACIÓN IA

**API Route:** `app/api/ai/generate/route.ts`

**Tipos de generación:** 5 (desc_corta, desc_larga, desc_zona, meta_title, meta_desc)

**Flujo:**

```tsx
// Frontend: PropertyForm.tsx (en tab Contenido/SEO)

const handleGenerateAI = async (type: 'desc_corta' | 'desc_larga' | ...) => {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      propertyId: property.id,
      propertyData: {
        tipo: property.property_type,
        operacion: property.operation,
        precio: property.price,
        moneda: property.currency,
        colonia: property.neighborhood,
        ciudad: property.city,
        estado: property.state,
        recamaras: property.bedrooms,
        banos: property.bathrooms,
        m2_construccion: property.construction_sqm,
        m2_lote: property.lot_sqm,
        antiguedad: property.age_years,
        conservacion: property.condition,
        amenidades: property.amenities,
      }
    })
  });
  
  const { text } = await response.json();
  setFormData(prev => ({ ...prev, [fieldMap[type]]: text }));
};
```

**Backend:** `app/api/ai/generate/route.ts`

```typescript
export async function POST(req: Request) {
  const { type, propertyData } = await req.json();
  
  // 1. Obtener model del usuario (openai | claude)
  const account = await getAccountFromAuth();
  const model = account.ai_provider || 'openai';
  
  // 2. Construir prompt
  const prompt = buildPrompt(type, propertyData);
  
  // 3. Llamar IA
  const result = model === 'openai' 
    ? await callOpenAI(prompt, account.openai_api_key)
    : await callClaude(prompt, account.claude_api_key);
  
  // 4. Registrar en ai_generation_logs
  await logAIGeneration(type, model, result);
  
  // 5. Retornar
  return json({ text: result.text, tokens: result.tokens });
}
```

**Prompts (en español, optimizados para México):**

```typescript
const PROMPTS = {
  desc_corta: `Eres un redactor experto en bienes raíces en México...
    - Máximo 3 oraciones
    - Tono profesional y cálido
    - Resalta los puntos más vendibles
    
    Datos: [contexto del property]`,
    
  desc_larga: `Eres un copywriter experto en bienes raíces...
    - Entre 200 y 280 palabras
    - Estructura: intro seductora → características → amenidades → conclusión
    
    Datos: [contexto del property]`,
    
  // ... otros 3 prompts
};
```

---

## 🔄 INTEGRACIÓN EASYBROKER

**API Endpoint:** `app/api/easybroker/sync/route.ts`

**Funcionalidades:**

### 1. **Sync Automático (al publicar propiedad)**

```typescript
// Trigger: Al actualizar property con is_published = true

export async function syncToEasyBroker(propertyId: string) {
  const property = await getProperty(propertyId);
  const account = await getAccount(property.account_id);
  
  if (!account.easybroker_api_key || !account.easybroker_sync_enabled) return;
  
  const payload = buildEasyBrokerPayload(property);
  const ebId = property.easybroker_id;
  
  const action = ebId ? 'PATCH' : 'POST';
  const endpoint = ebId ? `/properties/${ebId}` : `/properties`;
  
  const response = await callEasyBrokerAPI(action, endpoint, payload, account.easybroker_api_key);
  
  // Guardar EB ID si es creación
  if (!ebId && response.public_id) {
    await updateProperty(propertyId, { easybroker_id: response.public_id });
  }
  
  // Registrar log
  await logEasyBrokerSync(propertyId, action, 'success', response);
}
```

**Payload mapping:**

```typescript
function buildEasyBrokerPayload(property) {
  return {
    title: property.title,
    description: property.description_long || property.description_short,
    property_type: property.property_type,
    status: 'not_published',
    operations: [{
      type: operationMap[property.operation], // 'sale', 'rental', 'development', 'auction'
      amount: property.price,
      currency: property.currency,
      period: property.operation === 'Renta' ? 'monthly' : null,
    }],
    location: {
      address: `${property.street}, ${property.neighborhood}, ${property.city}, ${property.state}`,
      latitude: /* geocoding api */,
      longitude: /* geocoding api */,
    },
    property_details: {
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parking_spaces: property.parking_spaces,
      construction_area: property.construction_sqm,
      lot_area: property.lot_sqm,
      age: property.age_years,
    },
    amenities: property.amenities.split(','),
    images: property.gallery_images.map(url => ({
      url,
      description: property.title,
    })),
  };
}
```

### 2. **Importación Masiva (desde Settings)**

```typescript
// app/api/easybroker/import-all/route.ts

export async function POST(req: Request) {
  const account = await getAccountFromAuth();
  
  // 1. Obtener todas las propiedades de EB
  const allProperties = await getAllEasyBrokerProperties(account.easybroker_api_key);
  
  // 2. Procesar por lotes (10 a la vez para no sobrecargar)
  const batches = chunk(allProperties, 10);
  
  for (const batch of batches) {
    await Promise.all(batch.map(ebProp => 
      importSingleProperty(ebProp, account.id)
    ));
  }
  
  return json({ imported: allProperties.length });
}

async function importSingleProperty(ebProperty, accountId) {
  // Crear post en WP (mapping de campos)
  const wordPressData = {
    title: ebProperty.title,
    property_type: ebProperty.property_type,
    operation: reverseOperationMap[ebProperty.operations[0].type],
    price: ebProperty.operations[0].amount,
    currency: ebProperty.operations[0].currency,
    bedrooms: ebProperty.property_details?.bedrooms,
    // ... todos los campos mapeados
  };
  
  // Convertir fotos a WebP
  const webpImages = await Promise.all(
    ebProperty.images.map(img => convertToWebP(img.url))
  );
  
  // Crear propiedad en Supabase
  const property = await createProperty(accountId, {
    ...wordPressData,
    gallery_images: webpImages,
    easybroker_id: ebProperty.public_id,
    easybroker_sync_status: 'synced',
  });
  
  // Asignar agentes (buscar por email)
  if (ebProperty.agent?.email) {
    const agent = await findAgentByEmail(ebProperty.agent.email);
    if (agent) {
      await assignAgentToProperty(property.id, agent.id);
    }
  }
  
  return property;
}
```

---

## 📨 INTEGRACIÓN GOHIGHLEVEL

**Webhook receiver:** `app/api/ghl/webhook/route.ts`

**En cada landing page:**

```tsx
// PropertyPage: incluye ContactForm component

<ContactForm propertyId={property.id} propertyTitle={property.title} />
```

**ContactForm.tsx:**

```tsx
export default function ContactForm({ propertyId, propertyTitle }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Guardar lead en Supabase
    const lead = await fetch('/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        source: 'contact_form',
      })
    }).then(r => r.json());
    
    // 2. Enviar a GoHighLevel (iframe embed)
    if (window.ghlForm) {
      window.ghlForm.submit({ ...formData, propertyTitle });
    }
    
    // 3. Feedback al usuario
    toast.success('Lead enviado correctamente');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      <input type="email" name="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
      <input type="tel" name="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
      <textarea name="message" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
      <button type="submit">Enviar</button>
    </form>
  );
}
```

**Webhook receiver (GHL → Supabase):**

```typescript
// app/api/ghl/webhook/route.ts

export async function POST(req: Request) {
  const ghlPayload = await req.json();
  
  // Mapear campos GHL → Supabase leads
  const lead = {
    account_id: ghlPayload.account_id, // incluído en URL o config
    property_id: ghlPayload.property_id,
    name: ghlPayload.contact.name,
    email: ghlPayload.contact.email,
    phone: ghlPayload.contact.phone,
    message: ghlPayload.contact.message,
    ghl_id: ghlPayload.contact.id,
    source: 'ghl_webhook',
  };
  
  await createLead(lead);
  
  return json({ ok: true });
}
```

---

## 🔌 API ROUTES

### **Propiedades**

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/properties` | GET | Listar (con filtros, paginación) |
| `/api/properties` | POST | Crear nueva |
| `/api/properties/[id]` | GET | Obtener una |
| `/api/properties/[id]` | PUT | Actualizar |
| `/api/properties/[id]` | DELETE | Eliminar |
| `/api/properties/[id]/publish` | POST | Publicar (trigger sync EB) |
| `/api/properties/[id]/featured` | PATCH | Toggle featured |

### **Agentes**

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/agents` | GET | Listar |
| `/api/agents` | POST | Crear |
| `/api/agents/[id]` | GET | Obtener |
| `/api/agents/[id]` | PUT | Actualizar |
| `/api/agents/[id]` | DELETE | Eliminar |

### **IA**

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/ai/generate` | POST | Generar contenido (5 tipos) |

### **Configuración**

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/settings` | GET | Obtener config |
| `/api/settings` | PUT | Actualizar config |

### **EasyBroker**

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/easybroker/sync/[id]` | POST | Sync una propiedad |
| `/api/easybroker/sync-all` | POST | Importar masivo |
| `/api/easybroker/logs` | GET | Ver histórico |

### **Leads**

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/leads` | GET | Listar leads |
| `/api/leads` | POST | Crear lead (desde form) |
| `/api/leads/[id]` | GET | Obtener lead |
| `/api/leads/[id]` | PATCH | Actualizar status |

### **GoHighLevel**

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/ghl/webhook` | POST | Recibir contactos desde GHL |

---

## 👥 FLUJOS DE USUARIO

### **FLUJO 1: Agente crea una propiedad**

```
1. Accede a /admin/properties
2. Click "Nueva propiedad" → /admin/properties/new
3. Completa PropertyForm (6 tabs):
   - Tab 1: Datos básicos (precio, tipo, operación)
   - Tab 2: Ubicación + lugares cercanos
   - Tab 3: Contenido + botones IA
   - Tab 4: Galería (drag-drop) + video
   - Tab 5: SEO + botones IA
   - Tab 6: Selecciona agentes asignados
4. Click "Guardar" → POST /api/properties
5. Propiedad guardada en estado "borrador" (is_published = false)
6. Puede seguir editando en /admin/properties/[id]
7. Click "Publicar" → PUT /api/properties/[id]/publish
8. Trigger: sync automático a EasyBroker (POST a EB API)
9. Landing page accesible en /propiedad/[slug]
```

### **FLUJO 2: Público visualiza catálogo y landing page**

```
1. Accede a /propiedades (listing)
2. Ve todas las propiedades (is_published = true)
3. Puede filtrar por ciudad, tipo, precio
4. Click en una propiedad → /propiedad/[slug]
5. Ve landing page dinámico (8 bloques)
6. Completa formulario de contacto
7. Datos guardados en:
   - Supabase: leads table
   - GoHighLevel: webhook + contact creado
```

### **FLUJO 3: Agente configura IA**

```
1. Accede a /admin/settings/ai-config
2. Ingresa OpenAI API Key o Claude API Key
3. Selecciona modelo por defecto
4. Click "Guardar"
5. Desde ahora, botones ✨ en PropertyForm funcionan
6. Cada generación se registra en ai_generation_logs
```

### **FLUJO 4: Agente importa desde EasyBroker**

```
1. Accede a /admin/settings/easybroker-config
2. Ingresa API Key de EB
3. Click "Iniciar Sincronización Masiva"
4. Progreso bar en vivo (live updates)
5. Backend:
   - Obtiene lista de propiedades en EB
   - Por cada una: convierte fotos a WebP
   - Crea property en Supabase
   - Asigna agentes automáticamente
6. Al completar: "X propiedades importadas"
```

### **FLUJO 5: Admin gestiona leads**

```
1. Accede a /admin/leads
2. Ve tabla de leads con:
   - Nombre, email, teléfono
   - Propiedad
   - Status (new, contacted, qualified, lost)
   - Fecha de creación
3. Click en un lead → /admin/leads/[id]
4. Puede:
   - Ver detalles del mensaje
   - Cambiar status
   - Ver propiedad asociada
5. Todos los leads vienen de:
   - Formulario en landing page (contact_form)
   - GoHighLevel webhook (ghl_webhook)
```

---

## 📅 TIMELINE DE IMPLEMENTACIÓN

### **FASE 1: Estructura Base + Auth** (Jun 12-19)
- [ ] Configurar Supabase (tablas + RLS)
- [ ] Auth con Supabase (login/register/logout)
- [ ] Crear layout base (sidebar + topbar)
- [ ] Crear tipos TypeScript

### **FASE 2: Property CRUD** (Jun 19-26)
- [ ] Crear PropertyForm con 6 tabs
- [ ] Implementar gallery drag-drop
- [ ] PropertyList con filtros
- [ ] Validación de campos
- [ ] Upload de imágenes a Storage

### **FASE 3: IA + SEO** (Jun 26-Jul 3)
- [ ] Integrar OpenAI + Claude
- [ ] Crear prompts optimizados
- [ ] Implementar botones ✨ en form
- [ ] Generar Schema.org automático
- [ ] OG tags + Twitter cards

### **FASE 4: Landing Page** (Jul 3-10)
- [ ] Crear 8 bloques dinámicos
- [ ] Implementar SSG con generateStaticParams
- [ ] Formulario de contacto
- [ ] Contactar GoHighLevel (iframe embed)

### **FASE 5: EasyBroker** (Jul 10-17)
- [ ] Sync automático al publicar
- [ ] Importación masiva
- [ ] Conversión a WebP
- [ ] Asignación automática de agentes
- [ ] Live progress bar

### **FASE 6: Admin Dashboard** (Jul 17-24)
- [ ] Dashboard overview
- [ ] Lead management
- [ ] Settings UI
- [ ] Logs y histórico

### **FASE 7: Testing + Deploy** (Jul 24-31)
- [ ] E2E tests
- [ ] Performance optimization
- [ ] SEO verification
- [ ] Deploy a producción

---

## 🎯 CHECKLIST DE FUNCIONALIDADES

**Core:**
- [x] Multi-tenant con RLS
- [ ] Property CRUD (completo)
- [ ] Agent CRUD (completo)
- [ ] Destacadas (toggle + home)
- [ ] Gallery dinámico (drag-drop)
- [ ] Lugares cercanos (CRUD)

**IA:**
- [ ] OpenAI integration
- [ ] Claude integration
- [ ] 5 tipos de generación
- [ ] Logging de uso

**SEO:**
- [ ] Meta title/desc
- [ ] Schema.org RealEstateListing
- [ ] OG tags
- [ ] Twitter cards
- [ ] Canonical URLs
- [ ] Sitemap dinámico

**EasyBroker:**
- [ ] Sync automático
- [ ] Importación masiva
- [ ] WebP conversion
- [ ] Agent auto-assignment
- [ ] Bidirectional sync logs

**GoHighLevel:**
- [ ] Contact form embed
- [ ] Webhook receiver
- [ ] Lead creation
- [ ] Auto name-fill

**Landing Page:**
- [ ] 8 bloques dinámicos
- [ ] Responsive design
- [ ] Image optimization
- [ ] Carousel gallery
- [ ] Contact form

**Admin:**
- [ ] Dashboard
- [ ] Property management
- [ ] Agent management
- [ ] Lead tracking
- [ ] Settings UI
- [ ] Sync logs viewer

---

## 📊 MÉTRICAS DE ÉXITO

- ✅ Todas las propiedades tienen landing page SEO-ready
- ✅ Sync con EasyBroker funciona bidireccional
- ✅ IA genera contenido en < 3 segundos
- ✅ 0 leads perdidos (todos guardados)
- ✅ Mobile responsive (98+ Lighthouse score)
- ✅ Time to First Byte < 100ms (CDN cached)

---

**Documento creado:** 12 de junio de 2026  
**Versión:** 2.0 (replicación exacta del WordPress)  
**Estado:** LISTO PARA IMPLEMENTACIÓN
