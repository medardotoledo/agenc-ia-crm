# Lead-Suite — Fase A (UI con datos mock)

El CRM agéntico en español. Capa de experiencia + IA sobre GoHighLevel.
**Spec vigente:** `../Especificaciones-3-0-Lead-Suite.md` · **Mockups:** `../MockUps/`

## Correr en local

```bash
npm install
npm run dev      # → http://localhost:5173
```

No necesita base de datos ni credenciales — todo corre con datos mock (`src/data/mock.ts`).

## Qué incluye la Fase A

| Pantalla | Mockup | Estado |
|---|---|---|
| Dashboard (métricas, gráficas, pipeline, actividad, equipo, pendientes) | 8 | ✅ |
| Vista Tabla (filtros, orden, selección, acciones hover) | 1 | ✅ |
| Vista Kanban (drag & drop, íconos de canal, vence hoy) | 2, 10 | ✅ |
| Vista Excel (edición en celda, fila de alta rápida) | 3 | ✅ |
| Panel lateral (notas + chat + hub llamar/WA/email) | 4 | ✅ |
| Conversaciones (inbox, filtros por canal, switch Bot/Híbrido/Agente) | 9 | ✅ |
| Calendario (vista cliente, agenda agente, configuración) | 5, 6, 7 | ✅ |
| PWA (manifest + service worker) | — | ✅ |

## Estructura

```
src/
  theme.css        ← design system completo (tokens CSS — NUNCA hex en componentes)
  types.ts         ← tipos del dominio
  store.ts         ← Zustand (useApp = UI, useLeads = espejo simulado)
  data/mock.ts     ← datos de demostración
  components/      ← Sidebar, Topbar, LeadPanel, ui (Avatar, pills, badges)
  views/           ← Dashboard, Table, Kanban, Excel, Conversations, Calendar
```

## Reglas para siguientes fases

1. Los componentes nunca usan colores hardcodeados — solo tokens de `theme.css`
2. El frontend no sabe que GHL existe — en Fase B, `useLeads` se hidrata desde Supabase (espejo) y las mutaciones van a la cola de sync
3. Mockup manda sobre spec escrita en caso de duda visual
