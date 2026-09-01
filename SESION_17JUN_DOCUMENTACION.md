# Sesión 17-jun-2026 — Documentación completa

## ¿Qué es Lead-Suite?

CRM + Real Estate SaaS modular para Med Toledo (Nodo Inmobiliario).
- Stack: Next.js 16 App Router (Turbopack), Supabase (PostgreSQL + RLS), Tailwind CSS
- Puerto de desarrollo: **3001** (correr con `npm run dev` desde `lead-suite/`)
- Panel admin: `/admin/*`
- Sitio público inmobiliario: `/`, `/propiedades`, `/p/[slug]`

---

## Lo que hicimos esta sesión (17-jun-2026)

### 1. Página Prospectos — Rediseño completo
**Archivo:** `app/admin/prospectos/page.tsx`

Reescritura total con:
- **Split panel**: lista a la izquierda, panel detalle deslizable (animación elástica) a la derecha (420px)
- **4 vistas intercambiables**: Tabla, Kanban, Excel, Citas (componente pluggable)
- **Filtros inline**: búsqueda por texto, filtro por etiqueta, filtro por estado (etapa), filtro por fecha
- **Nuevo Prospecto**: modal con todos los campos de BD (nombre, teléfono, email, propiedad, mensaje, etapa inicial, fuente, etiquetas)
- **Gestionar Etiquetas**: modal para crear/borrar etiquetas con paleta de colores
- **ProspectoPanel**: panel lateral con datos de contacto, propiedad de interés, etiquetas asignables/removibles, cambio de etapa, acciones rápidas (WhatsApp, llamar, email, **Agendar visita**)
- **Renombrar etapas**: las 4 etapas (new/contacted/qualified/lost) tienen nombres personalizables guardados en `account_settings.lead_stage_labels`

### 2. Botón cerrar panel — Fix de visibilidad
El botón "-" para colapsar el panel derecho era blanco sobre blanco.
- **Antes:** `bg-app border border-line` (invisible)
- **Ahora:** `bg-primary text-inverse shadow-lg` (azul sólido con icono blanco)
- Ubicación: `ProspectoPanel` componente, `className` del `<button onClick={onClose}>`

### 3. Botón "Agendar visita" en el panel
Añadido en la sección "Acciones rápidas" de `ProspectoPanel`:
```tsx
<button onClick={() => onSchedule(p.id)}
  className="flex w-full items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors border border-primary/20">
  <CalendarDays size={16} /> Agendar visita
</button>
```

### 4. Modal de citas desde el panel
- Al hacer clic en "Agendar visita" en el panel, se abre `NewCitaModal` con el prospecto **preseleccionado**
- Estado en `ProspectosPage`: `showCitaModal`, `citaForLead`, `agents`
- `onSchedule={(id) => { setCitaForLead(id); setShowCitaModal(true); }}` pasado al `ProspectoPanel`
- Agentes cargados desde BD junto con el resto de datos en el `load()`

### 5. Fix: prospectos no persistían al refrescar
**Causa raíz:** El `load()` usaba un join embebido `properties(title,slug)` dentro del select de `leads`. Supabase no detecta la FK en su caché de esquema y la query falla silenciosamente → `leadsRes.data = null` → lista vacía al refrescar.

**Solución:** Separar en queries independientes (igual que ya se había hecho en `CitasView.tsx`):
```ts
// ANTES (roto):
supabase.from('leads').select('id,...,properties(title,slug)')

// AHORA (correcto):
supabase.from('leads').select('id,...,property_id')   // sin join
supabase.from('properties').select('id,title,slug')   // query separada
// luego: const prop = propsMap.get(r.property_id)
```

### 6. Vista Citas — componente completo
**Archivo:** `src/modules/property-management/components/CitasView.tsx`

- Calendario semanal (Lun–Dom) con citas por día
- `NewCitaModal` con: prospecto, agente, fecha/hora, duración, tipo (presencial/videollamada/llamada), notas
- Carga de datos con queries separadas (sin joins embebidos) para leads, properties, agents
- Exporta ambos: `CitasView` y `NewCitaModal` como named exports

### 7. Configuración de etapas de prospectos
**Archivo:** `src/modules/property-management/components/ProspectoStagesSettings.tsx`

Componente nuevo para renombrar las 4 etapas del pipeline de prospectos.
Guarda en `account_settings.lead_stage_labels` (JSONB).

Añadido a `app/admin/settings/page.tsx` junto a `PipelineStagesSettings`.

### 8. Migraciones SQL ejecutadas esta sesión
**008_lead_tags.sql** — EJECUTADA ✅
- Tabla `lead_tags` (join leads ↔ tags)
- Columna `account_settings.lead_stage_labels` JSONB
- Columna `leads.assigned_to` UUID FK → users
- `leads.property_id` nullable

**010_citas_leads.sql** — EJECUTADA ✅
- Columnas en `appointments`: `lead_id`, `title`, `duration_min`, `notes`, `ends_at`, `visit_type`
- Índices + RLS policy `dev_full_access`

### 9. Módulos nav — quitado botón duplicado "Leads"
**Archivo:** `src/core/modules/manifests/crm.ts`

Eliminado el nav item "Leads" (aparecía como "Liz" por voice-to-text), dejando solo "Conversaciones".

---

## Archivos clave modificados esta sesión

| Archivo | Cambio |
|---|---|
| `app/admin/prospectos/page.tsx` | Reescritura total + fix join embebido + botón cerrar visible + Agendar visita |
| `src/modules/property-management/components/CitasView.tsx` | Nuevo componente: calendario semanal + NewCitaModal |
| `src/modules/property-management/components/ProspectoStagesSettings.tsx` | Nuevo: renombrar etapas de prospectos |
| `app/admin/settings/page.tsx` | Añadido ProspectoStagesSettings |
| `src/core/modules/manifests/crm.ts` | Quitado nav "Leads" duplicado |
| `supabase/migrations/008_lead_tags.sql` | lead_tags + lead_stage_labels + assigned_to |
| `supabase/migrations/010_citas_leads.sql` | appointments → campos para citas de prospectos |

---

## Estado actual al cierre de sesión

### ✅ Funcionando
- Vista Tabla, Kanban, Excel de prospectos
- Filtros (texto, etapa, etiqueta, fecha)
- Crear nuevo prospecto (modal con todos los campos)
- Gestionar etiquetas (crear/borrar)
- Panel lateral con animación elástica
- Botón cerrar panel visible (azul)
- Cambiar etapa del prospecto
- Asignar/quitar etiquetas desde el panel
- Acciones rápidas: WhatsApp, llamar, email
- Botón "Agendar visita" → abre modal de cita con prospecto preseleccionado
- Vista Citas: calendario semanal
- Renombrar etapas en Settings
- Fix: prospectos persisten al refrescar (queries separadas, sin joins embebidos)

### ⚠️ Pendiente / No probado en browser
- Verificar visualmente en http://localhost:3001/admin/prospectos que todo carga
- Probar flujo completo: crear prospecto → ver en lista → refrescar → sigue ahí
- Probar "Agendar visita" desde el panel → abre modal con prospecto preseleccionado
- Vista Citas: crear cita y verificar que aparece en el calendario

---

## Regla importante: joins embebidos en Supabase

**NUNCA usar** `from('tabla').select('campo,otraTabla(campo)')` cuando la FK no es reconocida por el schema cache de Supabase.

**SIEMPRE usar** queries separadas y hacer el join en el cliente:
```ts
const [leadsRes, propsRes] = await Promise.all([
  supabase.from('leads').select('id,property_id,...'),
  supabase.from('properties').select('id,title,slug'),
]);
const propsMap = new Map(propsRes.data.map(p => [p.id, p]));
const lead = { ...leadsRes.data[0], property_title: propsMap.get(lead.property_id)?.title };
```

Tablas afectadas confirmadas: `leads → properties`, `leads → agents`, `appointments → leads`

---

## Cómo continuar

1. Correr el servidor: `cd "C:\Users\Med Lab\Documents\Clientes\CRM Agentico\lead-suite"` → `npm run dev`
2. Abrir: http://localhost:3001/admin/prospectos
3. Leer este archivo + `RESUMEN_30_SEGUNDOS.md` para contexto
4. El siguiente paso natural es **revisar todo funciona** y luego continuar con la **Fase 2** del plan modular (panel de agencia, subcuentas, módulos por subcuenta)

El plan completo está en: `.claude/plans/merry-floating-corbato.md`
