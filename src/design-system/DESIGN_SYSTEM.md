# 🎨 DESIGN SYSTEM — Documentación Oficial

**Última actualización:** 14 de junio de 2026  
**Estado:** ✅ Escrito en piedra — NO modificar sin aprobación  
**Autor:** Med Toledo  

---

## 📋 Tabla de contenidos

1. [Filosofía](#filosofía)
2. [Estructura](#estructura)
3. [Cómo usarlo](#cómo-usarlo)
4. [Para nuevos módulos](#para-nuevos-módulos)
5. [Agregar nuevos clientes](#agregar-nuevos-clientes)
6. [FAQ](#faq)

---

## 🎯 Filosofía

**Una sola fuente de verdad** para toda la app (CRM, Page Builder, Inmobiliaria, Calendario, etc.).

- **Nivel Matriz (Agencia):** `tokens.css` define los valores por defecto
- **Nivel Instancia (Cliente):** `ThemeProvider` sobreescribe colores de marca si existen
- **Resultado:** Todos los módulos heredan automáticamente

**Ningún módulo debe hardcodear colores.** Todo va por variables CSS.

---

## 📁 Estructura

```
src/design-system/
├── DESIGN_SYSTEM.md          ← Este archivo
├── types.ts                  ← TypeScript interfaces
├── tokens.css                ← Variables CSS (NIVEL MATRIZ)
├── ThemeProvider.tsx         ← Provider React (aplica overrides)
├── useTheme.ts              ← Hook para componentes
├── index.ts                 ← Export central
│
└── primitives/              ← Componentes base (reutilizables)
    ├── Button.tsx
    ├── Card.tsx
    └── Badge.tsx

src/lib/
├── theme-resolver.ts        ← Obtiene tema de BD por instancia
└── ...

app/
├── layout.tsx               ← Envuelve todo con ThemeProvider
└── ...
```

---

## 🚀 Cómo usarlo

### 1️⃣ En `app/layout.tsx` (ROOT LAYOUT)

```tsx
import { ThemeProvider } from '@/design-system';
import { getThemeForInstance } from '@/lib/theme-resolver';

export default async function RootLayout({ children }) {
  // Obtiene el tema de la instancia actual
  const theme = await getThemeForInstance();

  return (
    <html>
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2️⃣ En un componente (usar variables CSS)

```tsx
// ❌ NO HAGAS ESTO
export function MyCard() {
  return <div style={{ backgroundColor: '#1e3a8a' }}>...</div>;
}

// ✅ HAZ ESTO
export function MyCard() {
  return (
    <div style={{ backgroundColor: 'var(--color-primary)' }}>
      Contenido
    </div>
  );
}
```

### 3️⃣ Con tailwind (recomendado)

```tsx
// En tailwind.config.ts ya tenemos mapeo de variables
export function MyCard() {
  return <div className="bg-primary text-ink">Contenido</div>;
}
```

### 4️⃣ Con hook `useTheme()` (si necesitas valores en JS)

```tsx
'use client';
import { useTheme } from '@/design-system/useTheme';

export function AdvancedChart() {
  const theme = useTheme();
  
  // Para gráficos, canvas, etc. donde necesitas el valor exacto
  return (
    <Chart color={theme.colorPrimary} />
  );
}
```

---

## 📦 Variables disponibles

### Marca (pueden cambiar por cliente)
```css
--color-primary        /* Azul marino por defecto, actualizable */
--color-primary-light  /* Azul claro */
--color-accent         /* Dorado/ámbar */
--color-sidebar        /* Fondo del menú lateral */
```

### Neutrales (estructura fija)
```css
--color-app      /* Fondo de tarjetas */
--color-soft     /* Fondo de página */
--color-ink      /* Texto principal */
--color-line     /* Bordes */
```

### Semánticos
```css
--color-success   /* Verde */
--color-danger    /* Rojo */
--color-warning   /* Naranja */
```

### Tipografía
```css
--font-sans              /* Arial/Inter para la app */
--font-weight-medium     /* 500 */
--font-weight-semibold   /* 600 */
--font-weight-bold       /* 700 */
```

**VER `tokens.css` para lista completa.**

---

## ✨ Para nuevos módulos

**Nuevo módulo = hereda automáticamente.** No hay que hacer nada especial.

### ✅ Checklist al crear un módulo:

1. **Crear estructura:**
   ```
   src/modules/mi-modulo/
   ├── components/
   ├── views/
   ├── lib/
   └── types/
   ```

2. **En componentes: SIEMPRE usar variables CSS**
   ```tsx
   // Componente de mi-modulo
   export function Feature() {
     return (
       <div className="bg-primary text-inverse p-6 rounded-lg">
         Hereda colores automáticamente ✨
       </div>
     );
   }
   ```

3. **No importar `ThemeProvider` en el módulo.** Solo en `app/layout.tsx`.

4. **Si necesitas el tema en JS:**
   ```tsx
   import { useTheme } from '@/design-system/useTheme';
   
   export function MyFeature() {
     const theme = useTheme();
     // usa theme.colorPrimary, etc.
   }
   ```

5. **Listo.** El módulo hereda el tema automáticamente. 🎉

---

## 👥 Agregar nuevos clientes

Cuando traigas **Nodo Inmobiliario**, **Cliente2**, etc.:

### Paso 1: Crear entrada en BD

```sql
INSERT INTO agency_branding (
  account_id,
  agency_name,
  primary_color,
  primary_light,
  accent_color,
  sidebar_color,
  serif_font,
  sans_font,
  created_at
) VALUES (
  'nodo-inmobiliario-uuid',
  'Nodo Inmobiliario',
  '#1A3A52',    ← Azul marino de Nodo
  '#2B5A8E',    ← Azul claro
  '#C89968',    ← Dorado
  '#0F172A',    ← Sidebar
  'Cormorant Garamond',
  'Jost',
  NOW()
);
```

### Paso 2: En `lib/theme-resolver.ts`

```ts
// Ya está automatizado — busca en BD por account_id
const theme = await getThemeForInstance();
// Si existe → lo usa
// Si NO existe → hereda de la Matriz (DEFAULT)
```

### Paso 3: Listo

Toda la app cambia automáticamente. ✨ No tocar código.

---

## 🔄 Cascada de herencia

```
TOKENS.CSS (Matriz)
   ↓ proporciona valores por defecto
THEME_PROVIDER (desde BD)
   ↓ sobrescribe si existen valores
COMPONENTES (heredan automáticamente)
   ↓ usan var(--color-primary), etc.
RESULTADO
   ↓ cliente ve su branding sin tocar código ✨
```

---

## 📝 Tipos TypeScript

Ver `types.ts` para:
- `BrandTheme` — interface del tema
- `ThemeColors` — colores disponibles
- `ThemeTokens` — todos los tokens

---

## ❓ FAQ

**P: ¿Puedo usar colores hardcodeados?**  
R: NO. Siempre usa variables CSS. Si necesitas un color que no existe, agregalo a `tokens.css`.

**P: ¿Qué pasa si un cliente no define su tema?**  
R: Hereda de la Matriz (DEFAULT en `tokens.css`).

**P: ¿Cómo cambio los colores por defecto de la Matriz?**  
R: Edita `tokens.css` — cambia UNA VEZ y toda la app se actualiza.

**P: ¿Puedo tener temas por página?**  
R: No. Un cliente = un tema. Si necesitas múltiples temas, son múltiples clientes.

**P: ¿Cómo agrego una nueva variable CSS?**  
R: Edita `tokens.css` y `types.ts` en el mismo cambio.

**P: ¿Funciona en móvil?**  
R: SÍ. CSS variables funcionan en todos lados.

**P: ¿Puedo usar esto en otros proyectos?**  
R: SÍ. Es portable. Solo necesitas:
   1. Copiar `src/design-system/`
   2. Copiar `src/lib/theme-resolver.ts`
   3. Aplicar `ThemeProvider` en tu `layout.tsx`

---

## 🚨 DO's and DON'Ts

| ✅ Haz | ❌ No hagas |
|--------|-----------|
| `var(--color-primary)` | `#1e3a8a` |
| `className="text-ink"` | `style={{ color: '#0f172a' }}` |
| `useTheme()` en JS | Importar colores de otra parte |
| Agregar variables a `tokens.css` | Hardcodear estilos en componentes |
| Extender en `tailwind.config.ts` | Crear CSS personalizado sin declarar variable |

---

## 📞 Contacto / Cambios

Si necesitas:
- Agregar una variable nueva
- Cambiar la estructura
- Reportar un bug

**Actualiza este archivo JUNTO con el código.** Este archivo es la verdad única.

---

**Versión:** 1.0  
**Próxima revisión:** Cuando agregues Cliente 2  
**Mantenedor:** Med Toledo + Claude
