# HANDOFF — Sesión Plataforma Modular (15-jun-2026)

> Documento para **retomar en un chat nuevo sin perder contexto**.
> Plan completo aprobado en: `C:\Users\Med Lab\.claude\plans\merry-floating-corbato.md`

---

## 🟢 RESUMEN EN 30 SEGUNDOS

Sesión en `lead-suite/` (Next.js 16 + Supabase). Se hicieron 3 cosas:
1. **Arreglado el bucle de login** (no era localStorage: faltaba fila en `accounts` + `useAuth` no cargaba el account).
2. **Arreglada y probada la importación de EasyBroker** (estaba rota por 6 bugs; ahora importa con límite configurable). 3 propiedades importadas OK.
3. **Diseñado y APROBADO** el plan de **plataforma modular estilo GoHighLevel** (Núcleo + módulos enchufables). **Falta ejecutarlo** (Fase 1).

**Siguiente acción:** ejecutar **Fase 1** del plan (ver plan aprobado).

### ⏩ PROGRESO (actualizado)
- ✅ **Hito 1 (migración 004) APLICADO y verificado**: cuenta renombrada "Nodo Inmobiliario", 3 propiedades re-apuntadas a su UUID, `users` de test@example.com creado (super_admin), `account_modules` con crm+inmobiliario, policies y columnas nuevas OK.
- ✅ **Hito 2 (código Núcleo) HECHO y verificado en navegador**: `useAuth` carga rol/permisos desde `users`; registro de módulos en `src/core/modules/`; nav del admin generado por módulos activos; `/admin/settings` usa la cuenta del login; alias `@/core/*` agregado a tsconfig. Resultado: test@example.com ve sus 3 propiedades en `/admin/properties` y el menú sale por módulos (CRM + Inmobiliario).
- ✅ **Persistir API key ("Guardar Ajustes") HECHO y verificado**: `EasyBrokerSettings.tsx` hace upsert en `agency_settings` por subcuenta y prefill al cargar. (Nota: el toggle "sync" no se probó por un quirk del harness, pero el guardado escribe en BD OK.)
- ✅ **Sitio público apuntado a la cuenta correcta (parche)**: se agregó `NEXT_PUBLIC_DEFAULT_ACCOUNT_ID=83d58323-...` en `.env.local`; `useTheme` ya cae a esa env var. El home vuelve a mostrar las 3 propiedades. ⚠️ Falta lo PROPIO: resolver la subcuenta por **subdominio/custom_domain** en `useTheme.ts`/`theme-resolver.ts` (hoy es un default fijo). Branding del público quedará en default hasta mover branding de `agency_branding`→`accounts`/`account_settings`.
- ✅ **`agents`→`users` HECHO y verificado (migración 005)**: `agents` es ahora una VISTA sobre `users` (role='agent') con triggers INSTEAD OF (insert/update/delete escriben en users). Verificado: lectura + insert + delete por la vista funcionan; código existente sin cambios. ⚠️ El agente demo "Brenda" NO migró (su email colisionaba con Med, único por (account,email)) — dato demo bajo Equipo Rankers, irrelevante.

### 🎉 FASE 1 COMPLETA
Núcleo modular operativo: accounts/users/roles/permisos + registro de módulos + menú por módulos activos + inmobiliario unido al Núcleo (account_id UUID) + agente=usuario. test@example.com (super_admin de "Nodo Inmobiliario") ve y administra sus 3 propiedades; sitio público y panel funcionan.

**Motor de permisos del Núcleo (listo para consumir):** `src/core/auth/permissions.ts` (`can()`, `isAgencyOwner`, `isAccountAdmin`) + hook `src/core/auth/usePermissions.ts`. super_admin/admin = todo; agent = solo lo concedido en `users.permissions`. Las claves las declara cada módulo en su manifest (`src/core/modules/manifests/*`). Fase 2/3 deben gatear UI/queries con esto. (Aún NO se consume en ningún componente.)

**Pendientes menores de Fase 1 (opcionales):** resolver subcuenta del sitio público por **subdominio** (hoy default fijo en `NEXT_PUBLIC_DEFAULT_ACCOUNT_ID`); mover branding de `agency_branding`→`accounts`/`account_settings`; agregar columna `properties.assigned_agents` si se quiere asignar propiedades a varios agentes/usuarios.
- 🟡 **Fase 2 (panel de Agencia) — CÓDIGO COMPLETO, falta verificar en navegador:**
  - Migración 006 aplicada: cuenta "Agencia Med Toledo" (`a9000000-...-0001`) raíz; Nodo es su subcuenta; test@example.com = super_admin de la Agencia.
  - `SUPABASE_SERVICE_ROLE_KEY` ya está en `.env.local` (el usuario la pegó).
  - **Cuenta activa / selector de subcuenta**: `src/core/account/activeAccount.tsx` (ActiveAccountProvider + useActiveAccount). El layout admin (`app/admin/layout.tsx`) se dividió en provider+shell, con selector de subcuenta en el sidebar; las páginas de /admin (properties, [id], new, agents, settings) usan la cuenta ACTIVA.
  - **Motor de permisos**: `src/core/auth/permissions.ts` + `usePermissions.ts`.
  - **Endpoints service-role**: `app/api/agency/sub-accounts/route.ts` (GET/POST) y `app/api/agency/users/route.ts` (GET/POST, crea login con `auth.admin.createUser`). Guard `requireAgencyOwner` en `src/core/auth/serverAuth.ts`.
  - **UI**: `app/admin/agency/page.tsx` (crear/listar subcuentas + activar módulos; por subcuenta crear/listar usuarios con rol + permisos por módulo + only_assigned_data). Enlace "Agencia → Subcuentas" en el menú (solo super_admin).
  - ✅ **VERIFICADO por API (15-jun-2026):** token de test@example.com → `GET /api/agency/sub-accounts` (200, muestra Nodo) → `POST` creó "Inmobiliaria del Sur" (`baaa0201-...`) con módulos → `POST /api/agency/users` creó login "Laura Sur" (agent, only_assigned_data, permisos `properties.view`+`leads.view_assigned`). Datos demo quedaron en la BD.
  - Pendiente menor: verificación VISUAL en navegador del selector de subcuenta y del panel (el clasificador del preview estuvo intermitente). El flujo lógico ya está probado por API.

### 🎉 FASE 2 COMPLETA (código + verificación API)

### 🟢 MÓDULO CRM montado con datos reales por subcuenta (15-jun-2026)
- El CRM ya existía (migrado de Vite) en `src/modules/crm/` — **NO se recreó, se reusó**.
- `src/lib/db.ts` reescrito **multi-tenant**: todas las lecturas/escrituras se scopean por `accountId` + `userId` (sin `DEMO_*`); usa el singleton `createBrowserSupabaseClient`.
- `src/store/useApp.ts`: `loadAccountData(accountId, userId, name, role)` carga pipeline+stages+leads+notas+conversaciones de la subcuenta activa; escrituras (addLead/addNote/sendMessage) usan el `ctx` (cuenta+usuario).
- `useAuth` ahora expone `userRowId` + `userName` (para owner_id/autoría).
- Página `app/admin/leads/page.tsx`: workspace de Leads (toolbar Tabla/Kanban/Excel + Nuevo lead) reusando KanbanView/TableView/ExcelView/LeadPanel/NewLeadModal, scopeado a la cuenta activa. (No usa el Topbar del CRM para no duplicar el header del admin.)
- Pipeline+stages por subcuenta: helper `src/modules/crm/server/pipeline.ts` (`ensureDefaultPipeline`), llamado al crear subcuenta con CRM. Nodo sembrado a mano (pipeline "Ventas" + 5 etapas).
- Limpieza: se eliminó el `export const supabase` duplicado de `src/lib/supabase.ts` (causaba el warning "Multiple GoTrueClient").
- ✅ VERIFICADO: `/admin/leads` renderiza las 5 columnas del pipeline por subcuenta (snapshot a11y); capa de datos probada multi-tenant + aislada (lead en Nodo NO visible para "Inmobiliaria del Sur").
- ⬜ Pendiente CRM: montar las otras vistas (Dashboard, Conversaciones, Calendario) como ítems de nav del módulo (las vistas existen en `src/modules/crm/views/`, solo falta enrutar); probar alta de lead por la UI; Fase 3 (RLS only-assigned para que el agente vea solo lo suyo).
- ⬜ **Fase 3 (visibilidad CRM only-assigned).**

---

## 🟢 CRM — datos reales + Fase 3 + vistas (15-jun-2026)
- Alta de lead por UI probada (persiste contact+opportunity en subcuenta activa). Bug corregido: subcuentas sin pipeline → `ensureDefaultPipeline` (endpoint al crear + backfill manual de Nodo/Sur).
- **Fase 3 (solo datos asignados) HECHA y verificada (app-layer)**: `fetchLeads(accountId, ownerOnlyId)` + `loadAccountData(...onlyAssigned)`; agente con `only_assigned_data` ve solo sus leads, admin/super_admin ven todo. Verificado: Laura (agente) ve 0, Med (supervisor) ve 1. Hook `src/modules/crm/useCrmData.tsx`. Falta endurecer con RLS por rol (defensa en profundidad).
- **Vistas montadas**: `/admin` = Dashboard CRM (métricas REALES: total, valor pipeline, tasa cierre, por etapa, por fuente, actividad desde notas — sin datos falsos); `/admin/conversaciones` = ConversationsView (real). Manifest CRM nav: Leads + Conversaciones.
- **Calendario DIFERIDO** (tarea propia): `CalendarView` tiene fechas hardcodeadas + mock `APPOINTMENTS`; requiere cablear la tabla `appointments`. No montar con mock.

## ✅ LO QUE SE HIZO ESTA SESIÓN

### 1. Bucle de login — RESUELTO
- Causa real: los guards de `/admin/*` exigen `!user || !account`, pero `useAuth` solo cargaba `user`, nunca `account` → rebote infinito a `/auth/login`. Y `test@example.com` no tenía fila en `accounts`.
- Fix aplicado en `src/hooks/useAuth.ts` (carga `account` con `setTimeout(0)` para evitar deadlock de supabase-js) y `app/admin/layout.tsx` (faltaba `const router = useRouter()`).
- Se creó la fila `accounts` "Inmobiliaria Demo" (id `83d58323-b9da-4eff-a686-2a61fefb7678`) para `test@example.com` (uid `650db8a9-4b08-4b8c-a2e0-38e19aad4757`).
- Verificado: login → `/admin/properties` sin rebotar.

### 2. Importación EasyBroker — ARREGLADA y PROBADA
Bugs corregidos:
- Auth: era `Authorization: Bearer`, EB usa **`X-Authorization: <key>`** (antes daba 401).
- Respuesta: EB devuelve `content` (no `properties`) y pagina con `page` (no `offset`), máx 50/página.
- Mapeo: recámaras/baños/descripción/imágenes solo vienen en el **detalle** (`GET /properties/{id}`); imágenes en `property_images[].url`; `location` es objeto.
- Bug que truena: `result.result.failed++` (no existe) en `properties-sync.ts`.
- Añadido `limit` en endpoint y un campo en la UI (default 3, máx 50).
- Imágenes se guardan como **URLs directas** de EB (sin descargar/convertir) → rápido.
Archivos tocados: `src/lib/easybroker-client.ts`, `src/lib/properties-sync.ts`, `app/api/easybroker/import/route.ts`, `src/modules/settings/components/EasyBrokerSettings.tsx`.
- Probado: 3 propiedades importadas con datos completos + galería, visibles en el home público.

### 3. Hallazgo crítico → plan modular APROBADO
La BD en vivo tiene **dos mundos desconectados**:
- **Núcleo + CRM "espejo" (ya construido, con demo):** `accounts` (UUID), `users` (rol `super_admin/admin/agent`, `auth_user_id`, `rr_enabled`), `contacts`, `pipelines`, `stages`, `opportunities` (`owner_id`→users), `assignment_rules`, `conversations`, `appointments`, etc. RLS con `current_account_id()` y "Only Assigned Data" ya documentado (`supabase/migrations/003_rls_estricto.sql:57-60`).
- **Inmobiliario nuevo, colgado aparte:** `properties`, `agents`, `leads`, `agency_settings` atados a `agency_branding` con `account_id` **de texto** (`'nodo-inmobiliario'`, hardcodeado en `src/design-system/useTheme.ts:96` y `src/lib/theme-resolver.ts:44`).

Decisiones del usuario:
- Modelo **GHL**: Agencia → subcuentas → usuarios con permisos; usuario ve solo su subcuenta; supervisor ve todo y asigna; agente puede ver "solo lo asignado".
- **Agente = usuario** (login + rol + permisos) con perfil público (foto/whatsapp).
- **Plataforma modular y portable**: Núcleo único de usuarios para TODOS los módulos (CRM, Inmobiliario y futuros: directorio empresarial, doctores, dentistas, veterinarias…). El Núcleo y/o módulos deben poder llevarse a otros proyectos.

---

## 📌 ESTADO DE DATOS (BD en vivo, Supabase `npeoyryvjklqhtdjqewx`)

- `accounts`: `a0000000-...-0001` "Equipo Rankers" (user_id `14ab300c...`); `83d58323-...` "Inmobiliaria Demo" (user_id `650db8a9...` = test@example.com).
- `users` (espejo): demo Med/Ana/Roberto/Sofía bajo Equipo Rankers. **test@example.com NO tiene fila en `users`** (pendiente crear).
- `agents`: "Brenda" bajo Equipo Rankers.
- `properties`: 3 importadas bajo `account_id='nodo-inmobiliario'` (marcadas `is_featured=true` para demo) + **1 fila basura `__TEST_FK__ borrar`** (id `b6552376-3c0e-4cb8-b4e8-d498f1a00b4f`) que **no se pudo borrar** (la tabla `properties` NO tiene policy de DELETE en RLS).
- `agency_branding` tiene la fila `'nodo-inmobiliario'` (oculta a anon por RLS) pero NO está en `accounts`.

---

## 🚧 RESTRICCIONES / PENDIENTES TÉCNICOS

- **`SUPABASE_SERVICE_ROLE_KEY` NO está** en `.env.local` (se necesita para Fase 2/3 y para DDL).
- **`DATABASE_URL` de `.env.local` tiene contraseña caduca** → falla auth directo a Postgres (`psql`/`pg`). Por eso **la migración SQL hay que correrla en el SQL Editor de Supabase** (o conseguir service role key / password vigente).
- `properties` sin policy DELETE; `agency_settings` sin policy INSERT (se agregan en la migración 004).
- "Guardar Ajustes" en `EasyBrokerSettings.tsx` es TODO (no persiste API key; por eso el import recibe la key por el body).

### Credenciales de prueba
- EasyBroker API key: `7dod5kv5sxdcq0qja11jstcqgyhccg` · account EB: `nodo-inmobiliario` (tiene ~331 propiedades).
- Supabase project ref: `npeoyryvjklqhtdjqewx`. Dev server (preview): `http://localhost:5173`.

---

## ▶️ CÓMO CONTINUAR (Fase 1 del plan aprobado)

Leer primero el plan: `C:\Users\Med Lab\.claude\plans\merry-floating-corbato.md`.

Orden sugerido de Fase 1:
1. **Migración `supabase/migrations/004_nucleo_modular.sql`** (autorla; el usuario la corre en SQL Editor):
   - Borrar fila basura `__TEST_FK__`.
   - Backfill `properties.account_id` `'nodo-inmobiliario'`→ UUID de la subcuenta de Nodo (sugerido: reusar `83d58323...` y renombrarla "Nodo Inmobiliario", o crear una nueva y ligar el `users` de test@example.com a ella).
   - `properties`/`agency_settings`/`easybroker_sync_logs`/`leads`: `account_id` TEXT→`uuid` + FK a `accounts(id)` (soltar FK a `agency_branding`) + policies INSERT/DELETE faltantes.
   - `users`: añadir perfil público (`title, phone, whatsapp, slug, is_public`) + `permissions jsonb`, `only_assigned_data boolean`. Migrar `agents`→`users` y re-apuntar `properties.assigned_agents`.
   - `accounts`: añadir `parent_account_id uuid`.
   - Tabla `account_modules` (account_id, module_key, enabled, config). Sembrar Nodo con `crm`+`inmobiliario`.
   - Crear fila `users` para test@example.com (auth_user_id `650db8a9...`, rol super_admin).
2. **Código Núcleo** `src/core/modules/`: `ModuleManifest` + registro + manifests `crm` e `inmobiliario`.
3. `src/hooks/useAuth.ts`: resolver por `users.auth_user_id`; exponer `role`/`permissions`; crear `users` en signUp.
4. `app/admin/layout.tsx`: nav según módulos activos.
5. `useTheme.ts`/`theme-resolver.ts`/`settings`/import: usar el account del usuario logueado (quitar `'nodo-inmobiliario'`).
6. **Verificar** con preview MCP: login test@example.com → ve solo SUS propiedades; importar limit=2 cae en su subcuenta.

⚠️ **OJO:** antes de cambiar tipos de columna (TEXT→uuid) hacer el **backfill**; usar `USING account_id::uuid`. Verificar tipos reales con el OpenAPI REST si hace falta.

---

## 🏗️ PLAN DE BUILD — PRÓXIMA FASE (arquitectura ya cerrada, ver `memory/decision-crm-nativo-comms.md`)
Orden recomendado:

> **✅ #1 HECHO y verificado (15-jun):** etapas RENOMBRABLES (decisión: 1 pipeline, 5 etapas fijas, solo nombre editable). Clave por posición (`STAGE_KEYS` en db.ts) → renombrar no rompe leads. `useApp.stageLabels` + fallback a `STAGE_META` en todos los views. UI en Configuración (`PipelineStagesSettings` + `stagesService`). Probado: "Nuevo"→"Prospecto" se refleja en Kanban sin romper nada. *(Nota: se dejó "Inmobiliaria del Sur" con la etapa 1 = "Prospecto" de la prueba.)*

**1) Etapas de pipeline PERSONALIZABLES (refactor transversal — hacerlo con cuidado)**
   - La tabla `stages` ya soporta custom (account_id, name, color, position, is_won, is_lost). Falta volver DINÁMICA la UI.
   - Crear fuente única de etapas: exponer `stages` en el store (`useApp`) cargado en `loadAccountData` (db.loadStages debe devolver la lista, no solo armar los mapas).
   - `Lead.stage` pasa a ser `string` (slug = nombre en minúsculas), no el enum fijo.
   - Reemplazar `STAGE_META[...]` (5 fijas) por lookup dinámico en **TODOS** estos archivos: `views/KanbanView.tsx`, `views/TableView.tsx`, `views/ExcelView.tsx`, `views/Dashboard.tsx`, `components/LeadPanel.tsx`, `components/NewLeadModal.tsx`, `components/ui.tsx` (StagePill/StageSelect). Hacer un helper `stageMeta(slug, stages)` con fallback para no truena con slugs desconocidos.
   - "Ganado/Perdido" debe salir de `is_won`/`is_lost` de la etapa, NO de los slugs `'cierre'/'perdido'` (afecta KanbanView ready/lost, db.persistLeadPatch status, Dashboard closeRate).
   - UI de administración de etapas (CRUD: agregar/renombrar/reordenar/color/marcar won-lost/borrar) en Configuración. Service de stages.
   - Verificar: renombrar/crear etapa → Kanban/Table la reflejan; arrastrar lead entre etapas persiste.

> **✅ #2 HECHO y verificado (16-jun):** etiquetas RELACIONALES (tablas `tags` + `contact_tags`, migración 007) — ilimitadas por subcuenta, ID estable. `tagsService` (crear/listar/aplicar/quitar) **emite eventos** `contact.tag_added/removed` en `events` (base para automatizaciones/IA). Tabla `automation_rules` creada como esqueleto. UI: `TagEditor` en LeadPanel (crear/aplicar/quitar) + chips en tarjetas Kanban. `fetchLeads` carga tags; `Lead.tags` agregado. Verificado: chip "Interesado" se ve en el board.

**2) Etiquetas (tags)** — HECHO (ver arriba).

**3) Módulo WhatsApp NATIVO (el grande) — necesita credenciales Meta del usuario para probar e2e**
   - DB por subcuenta (cifrado): `whatsapp_phone_number_id`, `whatsapp_waba_id`, `whatsapp_token`, `whatsapp_verify_token`.
   - 1 webhook multi-tenant (`/api/whatsapp/webhook`) ruteado por `phone_number_id` → cuenta. Verify token (GET) + recepción (POST).
   - Entrante → tabla `conversations`/`messages` (channel='whatsapp'). Saliente → Send API (Cloud API) con el token de la subcuenta.
   - Bot IA: entrante → juntar contexto (lead + propiedades EasyBroker + system prompt de `account_settings.ai_chat_*`) → Claude (BYO Claude key) → responder. Respetar `conversations.ai_mode` (bot/hybrid/agent) + ventana 24h.
   - Modo Lite (sin API): botón click-to-chat `window.open('https://web.whatsapp.com/send?phone=...&text=...')` (popup, gratis, no registra en CRM).
   - Embedded Signup (Meta Tech Provider) como fase posterior; manual (pegar token) como MVP.

**4) Hook GHL Messenger (FB/IG) — opción abierta** : dejar punto de integración/config para conectar Messenger de GHL manualmente (Med lo conecta por cliente). FB/IG nativo después (reusa arquitectura WhatsApp; requiere App Review de Meta).

**5) Calendario NATIVO** : Google Calendar API + Microsoft Graph (capa de proveedor). Tabla `appointments` ya existe. Reescribir `CalendarView` (hoy tiene fechas hardcodeadas + mock).

## 🗂️ Memoria relacionada (carpeta `memory/`)
- `decision-crm-nativo-comms.md` (**arquitectura final: CRM nativo, WhatsApp+IA nativo, GHL solo FB/IG opcional**)
- `plataforma-modular-ghl.md` (plataforma modular) · `easybroker-import-arreglado.md` · `auth-bucle-login-resuelto.md`
- Plan aprobado: `~/.claude/plans/merry-floating-corbato.md`
