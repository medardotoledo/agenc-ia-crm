# 🏠 Módulo Inmobiliaria

**Estado:** ✅ Completo y funcional  
**Fecha:** 14 de junio de 2026  
**Hereda:** Design System (colores, tipografía automáticos)

---

## 📋 Qué contiene

```
src/modules/inmobiliaria/
├── components/
│   ├── HeroSection.tsx          ← Hero + búsqueda
│   ├── SearchForm.tsx           ← Form: Renta/Comprar
│   ├── AboutSection.tsx         ← Quiénes somos
│   ├── WhyUsSection.tsx         ← Por qué nosotros (4 razones)
│   ├── FeaturedLocations.tsx    ← Ubicaciones destacadas
│   ├── FeaturedProperties.tsx   ← Grid de propiedades
│   ├── CtaSection.tsx           ← Call To Action (WhatsApp)
│   ├── Footer.tsx               ← Pie de página
│   └── index.ts                 ← Exports
│
├── views/
│   ├── HomePage.tsx             ← Página principal (union de todo)
│   └── index.ts                 ← Exports
│
└── README.md                    ← Este archivo
```

---

## 🎨 Design System Integration

**Todos los componentes usan variables CSS del design system.**

Ejemplo:
```tsx
<div className="bg-primary text-inverse rounded-lg">
  Automáticamente hereda colores del cliente ✨
</div>
```

**Cambiar cliente = cambiar color automáticamente** (sin tocar código).

### Colores usados

- `bg-primary` / `text-primary` — Azul marino (#1e3a8a)
- `bg-accent` — Dorado/ámbar (#f59e0b)
- `text-inverse` — Texto blanco sobre fondos oscuros
- `text-ink` / `text-ink-soft` — Texto principal y secundario
- `bg-soft` — Fondos claros
- `border-line` — Bordes sutiles

### Tipografía

- `font-sans` — Inter (vía tailwind)
- `font-bold`, `font-semibold` — Pesos automáticos

---

## 📐 Secciones de la página

| Sección | Componente | Descripción |
|---------|-----------|-------------|
| 1. Hero | `HeroSection` | Imagen fondo + headline + búsqueda |
| 2. Búsqueda | `SearchForm` | Tabs Renta/Comprar + filtros |
| 3. Sobre nosotros | `AboutSection` | Texto + imagen |
| 4. Por qué nosotros | `WhyUsSection` | 4 tarjetas de razones |
| 5. Ubicaciones | `FeaturedLocations` | Grid 4 ubicaciones destacadas |
| 6. Propiedades | `FeaturedProperties` | Grid 6 propiedades destacadas |
| 7. CTA | `CtaSection` | "¿Quieres vender?" + WhatsApp |
| 8. Footer | `Footer` | Links + contacto + redes |

---

## 🔌 Cómo usarlo

### En la app

```tsx
import { HomePage } from '@/modules/inmobiliaria/views';

export default function Home() {
  return <HomePage />;
}
```

### Importar componentes individualmente

```tsx
import {
  HeroSection,
  AboutSection,
  FeaturedProperties,
} from '@/modules/inmobiliaria/components';
```

---

## 🎯 Características

- ✅ **Responsivo** — Mobile, tablet, desktop
- ✅ **Hover effects** — Transiciones suaves
- ✅ **Dark mode ready** — Usa variables CSS
- ✅ **Accesible** — Enlaces semánticos, alt text
- ✅ **Performance** — Next.js optimizado
- ✅ **Design System** — Hereda colores automáticamente

---

## 📝 Notas

### Datos hardcodeados (por ahora)

- Ubicaciones (Zibatá, Zakia, El Refugio, Ziré)
- Propiedades destacadas (6 ejemplos)
- Razones (4 servicios)

### TODO

- [ ] Conectar searchForm a `/propiedades` con filtros
- [ ] Cargar propiedades desde BD
- [ ] Cargar ubicaciones desde BD
- [ ] Agregar galería de fotos
- [ ] Agregar contactForm en la página
- [ ] Integraciones: EasyBroker, GoHighLevel

---

## 🎨 Personalización por cliente

Cuando agregues un cliente con colores propios:

1. **Insert en BD** `agency_branding` con sus colores
2. **Nada más.** El módulo cambia automáticamente.

Ej: Nodo Inmobiliario

```sql
INSERT INTO agency_branding (
  account_id,
  primary_color,    -- #1A3A52 (azul marino de Nodo)
  accent_color,     -- #C89968 (dorado de Nodo)
  ...
) VALUES (...);
```

Resultado: El sitio se ve con los colores de Nodo, sin tocar código.

---

## 🚀 Para ampliar

Si quieres agregar más secciones:

1. Crea componente en `components/NuevaSeccion.tsx`
2. Usa clases tailwind del design system
3. Importa en `HomePage.tsx` entre las otras secciones
4. Automáticamente hereda colores ✨

---

**Mantenedor:** Med Toledo + Claude  
**Última revisión:** 14 de junio de 2026
