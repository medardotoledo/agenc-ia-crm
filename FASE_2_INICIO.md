# 🚀 FASE 2: Property CRUD - INICIADA

**Fecha:** 13 de junio de 2026  
**Status:** En progreso

---

## ✅ Lo hecho hasta ahora

### 1. **Service Layer** (propertyService.ts)
- ✅ CREATE — Crear nueva propiedad
- ✅ READ — Obtener propiedad por ID
- ✅ LIST — Listar propiedades con filtros (city, state, operation)
- ✅ UPDATE — Actualizar propiedad
- ✅ PUBLISH — Publicar propiedad
- ✅ UNPUBLISH — Despublicar propiedad
- ✅ TOGGLE FEATURED — Marcar/desmarcar como destacada
- ✅ DELETE — Eliminar propiedad

### 2. **Hook** (usePropertyForm.ts)
- ✅ State management completo del formulario
- ✅ updateField() — actualizar un campo
- ✅ updateFields() — actualizar múltiples campos
- ✅ save() — guardar (crear o actualizar)
- ✅ publish() / unpublish() — publicar
- ✅ toggleFeatured() — marcar destacada
- ✅ reset() — resetear formulario
- ✅ Validación básica de campos requeridos
- ✅ Error handling completo

### 3. **Componentes**
- ✅ PropertyList.tsx — Tabla de propiedades con filtros
- ✅ Filtros: ciudad, estado, operación
- ✅ Estados visuales (Publicada/Borrador, Destacada)
- ✅ Link a edición

### 4. **Páginas Admin**
- ✅ /admin/properties — Listado de propiedades
- ✅ Botón "Nueva Propiedad"
- ✅ Auth check (redirige si no logueado)

---

## 📋 Próximos pasos

### Falta completar:

1. **Formulario de 6 tabs** (PropertyForm.tsx)
   - Tab 1: Ficha Técnica (precio, operación, tipo, specs)
   - Tab 2: Ubicación (dirección, colonia, ciudad, lugares cercanos)
   - Tab 3: Contenido (amenidades, descripciones)
   - Tab 4: Media (galería drag-drop, video, tour, planos)
   - Tab 5: SEO (meta title, meta desc, preview)
   - Tab 6: Agentes (checklist de asignación)

2. **Página editar** (/admin/properties/[id]/page.tsx)
   - Cargar propiedad existente
   - Mostrar PropertyForm
   - Botones: Guardar, Publicar, Destacada

3. **Página crear** (/admin/properties/new/page.tsx)
   - PropertyForm vacío
   - Botón: Crear propiedad

4. **Galería drag-drop**
   - Upload de imágenes
   - Reordenamiento
   - Preview de thumbnails
   - Eliminar imágenes

5. **Image Service**
   - Upload a Supabase Storage
   - Optimización a WebP
   - Metadata storage

---

## 🎯 Arquitectura

```
PropertyList (tabla)
      ↓
PropertyForm (6 tabs)
      ↓
usePropertyForm (hook)
      ↓
propertyService (API calls)
      ↓
Supabase (DB)
```

---

## 📁 Estructura de carpetas

```
src/modules/property-management/
├── components/
│   ├── PropertyList.tsx ✅
│   ├── PropertyForm.tsx (TODO)
│   └── Tabs/
│       ├── TechnicalSpecsTab.tsx (TODO)
│       ├── LocationTab.tsx (TODO)
│       ├── ContentTab.tsx (TODO)
│       ├── MediaTab.tsx (TODO)
│       ├── SEOTab.tsx (TODO)
│       └── AgentsTab.tsx (TODO)
├── services/
│   ├── propertyService.ts ✅
│   └── imageService.ts (TODO)
├── hooks/
│   ├── usePropertyForm.ts ✅
│   └── useImageGallery.ts (TODO)
├── types/ (usar types/database.ts)
└── constants/ (TODO)

app/admin/properties/
├── page.tsx ✅
├── new/ (TODO)
└── [id]/ (TODO)
```

---

## 💡 Próxima sesión

Continuaremos con:
1. Crear PropertyForm con 6 tabs
2. Crear páginas /new y /[id]
3. Implementar galería drag-drop
4. Image service + upload

---

**Objetivo:** Completar Fase 2 en 1-2 sesiones más.

**Status:** ✅ Fundación lista, estructura clara
