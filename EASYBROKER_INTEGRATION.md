# 🔄 Integración EasyBroker — Documentación Completa

**Fecha:** 15 de junio de 2026  
**Estado:** ✅ Infraestructura lista (requiere credenciales en BD)  
**Stack:** Next.js + Supabase + EasyBroker API

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Setup: Migraciones SQL](#setup-migraciones-sql)
4. [Setup: Agregar Credenciales](#setup-agregar-credenciales)
5. [Flujos de Sincronización](#flujos-de-sincronización)
6. [APIs Disponibles](#apis-disponibles)
7. [Componentes Frontend](#componentes-frontend)
8. [Próximos Pasos](#próximos-pasos)

---

## 🎯 Visión General

Este módulo permite que cada **cliente (agencia inmobiliaria)** sincronice automáticamente sus propiedades desde **EasyBroker** a la plataforma Lead-Suite.

### Características
- ✅ **Multi-tenant:** Cada cliente gestiona sus propias credenciales
- ✅ **Importación masiva:** Descargar todas las propiedades de EasyBroker
- ✅ **Sincronización individual:** Publicar propiedad local → EasyBroker
- ✅ **Auditoría completa:** Logs de todas las sincronizaciones
- ✅ **Manejo de errores:** Retry logic + error tracking

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js + React)                                 │
│  ├── FeaturedProperties.tsx (carga de BD)                  │
│  ├── EasyBrokerSettings.tsx (panel de config)              │
│  └── useProperties hook (queries)                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  API Routes (Next.js)                                       │
│  ├── POST /api/easybroker/import (sincronizar masivo)      │
│  ├── GET /api/properties (listar propiedades)              │
│  └── POST /api/settings (guardar credenciales)             │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  Servicios TypeScript                                       │
│  ├── PropertiesSyncService (sincronización)                │
│  └── EasyBrokerClient (cliente API)                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  Supabase (Base de Datos)                                   │
│  ├── agency_settings (credenciales por cliente)            │
│  ├── properties (propiedades sincronizadas)                │
│  └── easybroker_sync_logs (auditoría)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  EasyBroker API                                             │
│  (https://api.easybroker.com/v1)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Setup: Migraciones SQL

Primero, ejecuta estas migraciones en Supabase:

### Paso 1: Crear tabla `agency_settings`

```bash
# Copiar contenido de:
# migrations/001_create_agency_settings.sql
# Ejecutar en Supabase SQL Editor
```

Esta tabla almacena las credenciales de cada cliente:
- `easybroker_api_key` — API Key de EasyBroker
- `openai_api_key` — API Key de OpenAI (para IA)
- `claude_api_key` — API Key de Claude
- `ghl_location_id` — Location ID de GoHighLevel

### Paso 2: Crear tabla `properties`

```bash
# Copiar contenido de:
# migrations/002_create_properties.sql
# Ejecutar en Supabase SQL Editor
```

Almacena todas las propiedades (creadas o importadas de EB).

### Paso 3: Crear tabla `easybroker_sync_logs`

```bash
# Copiar contenido de:
# migrations/003_create_easybroker_sync_logs.sql
# Ejecutar en Supabase SQL Editor
```

Auditoría de sincronizaciones.

### ⚡ Quick Start (Copy-Paste)

1. Abre [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea **3 nuevas queries**
4. Copia el contenido de cada migration
5. Ejecuta cada una

---

## 🔑 Setup: Agregar Credenciales

Una vez que las tablas existen, necesitas ingresar los datos de cada cliente.

### Para Nodo Inmobiliario (cuenta actual):

```sql
-- 1. Verificar que agency_branding existe
SELECT * FROM agency_branding 
WHERE account_id = 'nodo-inmobiliario';

-- 2. Insertar (o actualizar) en agency_settings
INSERT INTO agency_settings (
  account_id,
  easybroker_api_key,
  easybroker_sync_enabled,
  openai_api_key,
  claude_api_key,
  ghl_location_id
) VALUES (
  'nodo-inmobiliario',
  '7dod5kv5sxdcq0qja11jstcqgyhccg',  -- Tu API Key de EB
  true,                                -- Habilitado
  'sk-...',                           -- Luego
  'sk-ant-...',                       -- Luego
  'loc-...'                           -- Luego
)
ON CONFLICT (account_id) DO UPDATE SET
  easybroker_api_key = EXCLUDED.easybroker_api_key,
  easybroker_sync_enabled = EXCLUDED.easybroker_sync_enabled;
```

---

## 🔄 Flujos de Sincronización

### Flujo 1: Importación Masiva (al hacer click en botón)

```
Usuario hace click en "Iniciar Sincronización Masiva"
  ↓
POST /api/easybroker/import { accountId: "nodo-inmobiliario" }
  ↓
Backend obtiene API Key desde BD
  ↓
EasyBrokerClient.getAllProperties()
  ↓
Para cada propiedad:
  - Mapear campos EB → schema local
  - Insertar en tabla "properties"
  - Marcar easybroker_sync_status = "synced"
  ↓
Registrar en easybroker_sync_logs
  ↓
Retornar { imported: N, failed: M, errors: [...] }
```

### Flujo 2: Sincronización Individual (al publicar propiedad)

```
Usuario publica una propiedad en admin
  ↓
Trigger: property.status = "published"
  ↓
POST /api/properties/[id]/publish
  ↓
Si property.easybroker_id NO existe:
  - Llamar EasyBrokerClient.createProperty()
  - Guardar ID retornado
Else:
  - Llamar EasyBrokerClient.updateProperty()
  ↓
Marcar easybroker_sync_status = "synced"
  ↓
Registrar en logs
```

### Flujo 3: Webhook desde EasyBroker (futuro)

```
Cambio en propiedad de EB
  ↓
EasyBroker dispara webhook
  ↓
POST /api/webhooks/easybroker
  ↓
Validar signature
  ↓
Actualizar propiedad en BD local
  ↓
Realtime → UI actualiza automáticamente
```

---

## 📡 APIs Disponibles

### POST `/api/easybroker/import`

**Importa todas las propiedades de EasyBroker a BD local.**

**Body:**
```json
{
  "accountId": "nodo-inmobiliario"
}
```

**Response:**
```json
{
  "success": true,
  "imported": 15,
  "failed": 2,
  "errors": [
    {
      "ebId": "prop_123",
      "error": "Campo requerido faltante"
    }
  ]
}
```

### GET `/api/properties`

**Obtiene propiedades de un cliente.**

**Query Params:**
- `accountId` (required) — e.g., `nodo-inmobiliario`
- `featured` (optional) — `true` para solo destacadas
- `limit` (optional, default: 10)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "properties": [...],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

---

## 🎨 Componentes Frontend

### `FeaturedProperties.tsx` (actualizado)

```tsx
export function FeaturedProperties() {
  const { account_id } = useTheme();
  const { properties, isLoading, error } = useProperties(account_id, {
    featured: true,
    limit: 6,
  });
  
  // ... renderiza propiedades reales
}
```

✅ Ya carga de BD automáticamente  
✅ Hereda colores del cliente  
✅ Muestra imágenes reales  

### `EasyBrokerSettings.tsx` (nuevo)

```tsx
<EasyBrokerSettings accountId="nodo-inmobiliario" />
```

Panel para:
- Pegar API Key de EasyBroker
- Activar/desactivar sync automático
- Botón "Importar desde EasyBroker"
- Barra de progreso

### `useProperties` Hook (nuevo)

```tsx
const { properties, isLoading, error, refetch } = useProperties(
  'nodo-inmobiliario',
  { featured: true, limit: 6 }
);
```

---

## 🚀 Próximos Pasos

### Fase 1: Completar Setup (hoy)
- [ ] Ejecutar migraciones SQL en Supabase
- [ ] Insertar agency_settings con credenciales
- [ ] Probar importación masiva
- [ ] Verificar que propiedades aparecen en home

### Fase 2: Panel de Admin (siguiente sesión)
- [ ] Crear página `/admin/settings`
- [ ] Formulario para editar credenciales
- [ ] CRUD de propiedades
- [ ] Vista previa de landing dinámico

### Fase 3: Integraciones Adicionales
- [ ] OpenAI/Claude para generación IA
- [ ] GoHighLevel para formularios/leads
- [ ] Webhooks bidireccionales
- [ ] Sistema de agentes asignados

---

## 📝 Archivos Creados

```
migrations/
├── 001_create_agency_settings.sql
├── 002_create_properties.sql
└── 003_create_easybroker_sync_logs.sql

src/
├── lib/
│   └── easybroker-client.ts          (Cliente API)
├── services/
│   └── properties-sync.ts            (Servicio)
├── hooks/
│   └── useProperties.ts              (Hook React)
├── design-system/
│   └── useTheme.ts                   (actualizado: +account_id)
└── modules/
    └── settings/components/
        └── EasyBrokerSettings.tsx    (Panel)

app/api/
├── easybroker/import/route.ts        (POST importar)
└── properties/route.ts               (GET listar)

src/modules/inmobiliaria/components/
└── FeaturedProperties.tsx            (actualizado: +datos reales)
```

---

## 🔧 Troubleshooting

### "EasyBroker not configured for this account"
→ Verifica que `agency_settings` tiene row para `nodo-inmobiliario`

### "Failed to fetch properties" en home
→ Verifica que `properties` tiene rows con `account_id = 'nodo-inmobiliario'` y `status = 'published'`

### Propiedades no cargan en FeaturedProperties
→ Ejecuta en Supabase:
```sql
SELECT * FROM properties 
WHERE account_id = 'nodo-inmobiliario' 
AND status = 'published'
LIMIT 5;
```

### Error en sync: "invalid API key"
→ Revisa que copiaste completo: `7dod5kv5sxdcq0qja11jstcqgyhccg`

---

## 📞 Soporte

- **EasyBroker Docs:** https://developers.easybroker.com/
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

**Última actualización:** 15 de junio de 2026  
**Siguiente sesión:** Admin Panel + CRUD Propiedades
