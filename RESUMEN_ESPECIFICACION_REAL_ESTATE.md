# 📋 RESUMEN EJECUTIVO: Real Estate SaaS (Next.js)

**Copiar este archivo al siguiente chat cuando contexto se llene**

---

## 🎯 ¿Qué es el Sistema?

Sistema inmobiliario completo que replica exactamente el WordPress funcional de Med Toledo (`br-propiedades` plugin + `br-kreator` tema).

**NO es:** Page builder drag-drop  
**SÍ es:** Real Estate SaaS con:
- ✅ Property CRUD (55+ campos en 6 tabs)
- ✅ Agent management
- ✅ Landing page dinámico (SSG + 8 bloques)
- ✅ IA generativa (Claude + OpenAI para contenido)
- ✅ SEO automático (Schema.org, OG tags, meta)
- ✅ EasyBroker sync bidireccional (automático + masivo)
- ✅ GoHighLevel CRM (leads desde landing pages)
- ✅ Admin panel completo

---

## 💾 Estructura de Datos (7 tablas Supabase)

```sql
accounts          — Multi-tenant config (IA keys, EB key, GHL form)
properties        — 55+ campos (precio, ubicación, contenido, media, SEO, agentes)
agents            — Agentes asignados a propiedades
leads             — Contactos desde landing pages
images            — Metadata + WebP tracking
ai_generation_logs — Auditoria de generaciones IA
easybroker_sync_logs — Historial de sincronizaciones
```

---

## 📋 Property: 6 Tabs + 55+ Campos

| Tab | Campos | Ejemplos |
|-----|--------|----------|
| **Técnica** | Precio, moneda, operación, tipo, recámaras, baños, m², antigüedad, estado conservación | Casa, 3 recámaras, $150,000 MXN |
| **Ubicación** | Calle, colonia, ciudad, estado (32 MX), CP, notas internas, lugares cercanos (17 tipos POI) | Zibatá, Querétaro |
| **Contenido** | Amenidades, desc_corta (2-3 líneas), desc_larga (200-280 palabras), desc_zona (100-150 palabras) | +IA buttons |
| **Media** | Galería (drag-drop), video YouTube, tour virtual, planos | WebP conversion |
| **SEO** | Meta title (60 chars), meta description (160 chars), schema.org preview | +IA buttons |
| **Agentes** | Checklist de agentes asignados (foto circular, cargo, contacto) | Visual selection |

---

## 🤖 Generación IA (5 tipos)

1. **desc_corta** — 2-3 líneas para listados
2. **desc_larga** — 200-280 palabras landing
3. **desc_zona** — 100-150 palabras (SEO)
4. **meta_title** — Max 60 chars
5. **meta_desc** — 140-155 chars

**Modelos:** OpenAI GPT-4o mini | Claude Haiku  
**Prompts:** Contextuales (tipo, precio, ubicación, características, amenidades)

---

## 🌐 Landing Page Dinámico (8 bloques)

**URL:** `/propiedad/[slug]` (SSG + ISR 60s)

1. Hero — Foto + título + ubicación + precio + carrusel
2. Características — Specs cards + amenidades + desc larga
3. Métricas — 4 cards grandes (m² construcción, recámaras, baños, m² lote)
4. Galería — Grid 2×3 fotos + lightbox
5. Experiencia — Título + 3 cards beneficios
6. Agentes — Card por agente (foto, cargo, WA/Llamar/Email)
7. Formulario — Contacto integrado con GHL (auto-rellena nombre)
8. Footer — Global (logo, info, contacto, redes)

---

## 🔄 EasyBroker Integration

**Sync automático:**
- Al publicar propiedad → POST a EB (nueva) o PATCH (actualización)
- Status enviado: `not_published`
- Mapeo: Venta→sale, Renta→rental, Desarrollo→development, Remate→auction

**Importación masiva:**
- Botón en settings: "Iniciar Sincronización Masiva"
- Live progress bar (% + live logs)
- Convierte fotos a WebP (procesadas por lotes)
- Crea properties en Supabase
- Asigna agentes automáticamente (busca por email)
- Guarda EB ID para futuros synceos

---

## 📨 GoHighLevel Integration

- Formulario de contacto en cada landing
- Iframe embed (Form ID configurable)
- Datos guardados en Supabase `leads` + webhook a GHL
- Auto-rellena nombre si viene en URL

---

## 🎛️ Admin Panel (4 secciones)

1. **Dashboard** — Overview de propiedades, leads, últimos synceos
2. **Properties** — Tabla CRUD, crear/editar, vista previa landing
3. **Agents** — Tabla CRUD de agentes
4. **Leads** — Tabla filtrable (propiedad, status, fecha), detalle contacto
5. **Settings** — IA keys | EB key | GHL form | datos agencia

---

## 🔌 API Routes Principales

```
/api/properties              GET, POST
/api/properties/[id]         GET, PUT, DELETE
/api/properties/[id]/publish POST (trigger sync EB)
/api/agents                  GET, POST
/api/agents/[id]             GET, PUT, DELETE
/api/ai/generate             POST (5 tipos generación)
/api/settings                GET, PUT
/api/easybroker/sync/[id]    POST (sync 1 propiedad)
/api/easybroker/sync-all     POST (masivo)
/api/leads                   GET, POST
/api/ghl/webhook             POST (recibir de GHL)
```

---

## 🏗️ Módulos de Código

```
src/modules/
├── property-management/
│   ├── components/ (Form 6 tabs, List, Card, Modals, UI)
│   ├── services/ (API calls, image upload)
│   ├── types/ (TypeScript interfaces)
│   └── hooks/ (Form state, list state)
├── agent-management/
│   ├── components/ (Form, List, Card, PhotoUploader)
│   ├── services/ (API calls)
│   ├── types/
│   └── hooks/
└── settings/
    ├── components/ (AI config, EB config, GHL config, Agency data)
    ├── services/ (Settings API, EasyBroker service)
    └── hooks/

app/
├── (public)/
│   ├── page.tsx (Home: 7 secciones)
│   ├── propiedades/page.tsx (Listing: catálogo con filtros)
│   └── property/[slug]/page.tsx (Landing: 8 bloques dinámicos)
├── admin/
│   ├── page.tsx (Dashboard)
│   ├── properties/ (CRUD)
│   ├── agents/ (CRUD)
│   ├── leads/ (table + detail)
│   └── settings/ (config UI)
└── api/
    ├── properties/ (CRUD routes)
    ├── agents/ (CRUD routes)
    ├── ai/ (generate route)
    ├── settings/ (config routes)
    ├── easybroker/ (sync routes)
    ├── leads/ (lead routes)
    └── ghl/ (webhook receiver)
```

---

## 📅 Timeline Implementación

- **Fase 1 (Jun 12-19):** Auth + Supabase + tipos
- **Fase 2 (Jun 19-26):** Property CRUD completo
- **Fase 3 (Jun 26-Jul 3):** IA + SEO + Landing
- **Fase 4 (Jul 3-10):** EasyBroker + GHL
- **Fase 5 (Jul 10-17):** Admin dashboard
- **Fase 6 (Jul 17-24):** Testing + optimización
- **Fase 7 (Jul 24-31):** Deploy

---

## ✅ Fuentes

- **Full spec:** `ESPECIFICACION_REAL_ESTATE_SAAS.md` (este directorio)
- **Memory:** `real-estate-saas-especificacion.md` (project memory)
- **Original WordPress:** Analizado en `C:\Users\Med Lab\Documents\Clientes\Brenda\WebInmobiliar-IA\br-propiedades\`

---

**Versión:** 2.0  
**Fecha:** 12-jun-2026  
**Status:** ESPECIFICACIÓN LISTA PARA IMPLEMENTACIÓN
