# 📚 Instrucciones: Cómo crear un nuevo módulo que herede el Design System

**Última actualización:** 14 de junio de 2026

---

## 🎯 Resumen

Cuando crees un nuevo módulo (Page Builder, Calendario, Reportes, etc.):

✅ **Hereda el theme automáticamente** — no necesitas hacer nada especial  
✅ **Todo funciona sin tocar código** — la app aplica los colores del cliente  
✅ **Una sola fuente de verdad** — cambios en BD → cambios en toda la app  

---

## 📁 Estructura: Cómo organizar tu módulo

```
src/modules/nombre-modulo/
├── components/
│   ├── Feature1.tsx
│   ├── Feature2.tsx
│   └── ...
├── views/
│   ├── MainView.tsx
│   └── DetailView.tsx
├── lib/
│   ├── utils.ts
│   ├── api.ts
│   └── ...
├── types/
│   └── index.ts
└── hooks/
    └── useFeature.ts
```

---

## 🎨 En tus componentes: Usa SIEMPRE variables CSS

### ✅ CORRECTO — Usa clases tailwind

```tsx
// src/modules/page-builder/components/Canvas.tsx

export function Canvas() {
  return (
    <div className="bg-primary text-inverse rounded-lg p-6 shadow-lg">
      <h1 className="text-2xl font-bold">Page Builder</h1>
    </div>
  );
}
```

**Explicación:**
- `bg-primary` → `var(--color-primary)` (azul marino o color del cliente)
- `text-inverse` → `var(--color-inverse)` (blanco/contraste)
- `rounded-lg` → `var(--radius-lg)` (esquinas)

El cliente cambió su color → la app se ve con su color. **Sin tocar código.** ✨

---

### ✅ CORRECTO — Usa CSS variables directamente

```tsx
// Si tailwind no tiene lo que necesitas:

export function CustomGraph() {
  return (
    <div style={{ borderColor: 'var(--color-accent)' }}>
      Gráfico
    </div>
  );
}
```

---

### ❌ INCORRECTO — NO hardcodees colores

```tsx
// ❌ NO HAGAS ESTO
export function Feature() {
  return (
    <div style={{ backgroundColor: '#1e3a8a' }}>
      ❌ Color fijo, no respeta cliente
    </div>
  );
}

// ❌ TAMPOCO HAGAS ESTO
export function Button() {
  return <button className="bg-blue-600">Click</button>;
  // ❌ Tailwind color fijo, no variables
}
```

---

## 🪝 Si necesitas el valor exacto en JavaScript

Usa el hook `useTheme()`:

```tsx
'use client';

import { useTheme } from '@/design-system';
import Chart from 'chart.js';

export function AnalyticsChart() {
  const theme = useTheme();

  // Para librerías que necesitan valores exactos
  const chartConfig = {
    datasets: [{
      backgroundColor: theme.colorAccent, // "#f59e0b" o el del cliente
      borderColor: theme.colorPrimary,    // "#1e3a8a" o el del cliente
    }]
  };

  return <Canvas data={chartConfig} />;
}
```

---

## 📝 Tipos TypeScript: usa los del design-system

```tsx
// ❌ NO CREES TIPOS PROPIOS DE COLORES
export interface MyColor {
  primary: string;
  accent: string;
}

// ✅ IMPORTA DE DESIGN-SYSTEM
import { BrandTheme, UseThemeReturn } from '@/design-system';

export function MyComponent() {
  const theme: UseThemeReturn = useTheme();
  return <div style={{ color: theme.colorPrimary }}>OK</div>;
}
```

---

## 🚀 Checklist al crear un módulo

- [ ] Carpeta creada en `src/modules/nombre/`
- [ ] Componentes usan **tailwind + clases de diseño-system**
  - [ ] `bg-primary`, `bg-accent`, `text-ink`, etc.
  - [ ] `rounded-md`, `rounded-lg` (no números fijos)
  - [ ] `font-sans`, `font-weight-semibold` (del design-system)
- [ ] **NO hay colores hardcodeados** (#FF0000, rgb(), etc.)
- [ ] Si usas valores en JS → importas `useTheme()`
- [ ] Importas tipos de `@/design-system` (no creas tipos propios)
- [ ] **NO importas `ThemeProvider`** (solo en `app/layout.tsx`)
- [ ] Probaste con cliente diferente (cambia color automáticamente)

---

## ✨ Ejemplo: Módulo Completo (Page Builder)

```tsx
// src/modules/page-builder/components/EditorCanvas.tsx
'use client';

import { useTheme } from '@/design-system';
import { Button, Card } from '@/design-system';

export interface EditorCanvasProps {
  title: string;
  onSave: () => void;
}

export function EditorCanvas({ title, onSave }: EditorCanvasProps) {
  const theme = useTheme(); // Si necesitas JS

  return (
    <Card className="bg-soft p-8 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-line pb-4">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
      </div>

      {/* Canvas */}
      <div
        className="bg-app border-2 rounded-md p-6 min-h-96"
        style={{ borderColor: `var(--color-line)` }}
      >
        {/* Contenido editable */}
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          className="bg-soft text-ink border border-line"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="bg-primary text-inverse"
          onClick={onSave}
        >
          Guardar
        </Button>
      </div>
    </Card>
  );
}
```

**¿Qué pasa cuando cambias cliente?**
1. `app/layout.tsx` obtiene el nuevo tema de BD
2. `ThemeProvider` inyecta nuevas variables CSS
3. Todas las clases `bg-primary`, `text-inverse`, etc. usan nuevos colores
4. El módulo se renderiza con los colores del nuevo cliente
5. **Cero cambios de código.** 🎉

---

## 🔄 Flujo mental

```
Usuario abre app con Cliente X
         ↓
app/layout.tsx → getThemeForInstance('cliente-x-uuid')
         ↓
Supabase: SELECT * FROM agency_branding WHERE account_id = 'cliente-x-uuid'
         ↓
ThemeProvider inyecta: --color-primary = '#1A3A52' (de Cliente X)
         ↓
Mi módulo usa: <div className="bg-primary">
         ↓
Tailwind: .bg-primary { background-color: var(--color-primary); }
         ↓
Navegador: background-color: #1A3A52 (el color de Cliente X)
         ↓
✨ Cliente ve su branding sin tocar código ✨
```

---

## ⚠️ Errores comunes

| Error | Solución |
|-------|----------|
| "Mis colores no cambian al cambiar cliente" | ¿Usaste `bg-blue-500` (fijo) en vez de `bg-primary`? |
| "useTheme() retorna undefined" | ¿Marcaste el componente como `'use client'`? |
| "Import no funciona" | `import { useTheme } from '@/design-system'` |
| "Quiero un color que no existe" | Agregalo a `tokens.css` y `tailwind.config.ts` |
| "Mi variable CSS no funciona en tailwind" | Agrega a `tailwind.config.ts` en `extend.colors` |

---

## 📞 Preguntas frecuentes

**P: ¿Qué pasa si cliente NO tiene tema en BD?**  
R: Usa el DEFAULT de `tokens.css` (Matriz / Med Toledo).

**P: ¿Puedo cambiar el color POR SECCIÓN?**  
R: No. Un cliente = un tema global. Si necesitas varios temas, son varios clientes.

**P: ¿El theme se actualiza en vivo?**  
R: Sí, si usas `useTheme()` y el componente está `'use client'`. Las clases tailwind también.

**P: ¿Funciona en SSR?**  
R: Sí. `getThemeForInstance()` es async/server-side. CSS variables se aplican en el cliente.

**P: ¿Puedo usar estilos personalizados?**  
R: Sí, pero siempre basados en variables CSS: `style={{ color: 'var(--color-primary)' }}`

---

## 🎓 Recursos

- `DESIGN_SYSTEM.md` — Documentación completa del sistema
- `src/design-system/tokens.css` — Variables CSS disponibles
- `src/design-system/types.ts` — Tipos TypeScript
- `src/design-system/useTheme.ts` — Hook para JavaScript
- `tailwind.config.ts` — Mapeo de variables a clases

---

## 📋 Checklist rápido

```
¿Mi módulo...?
✓ Importa componentes/hooks de @/design-system?
✓ Usa clases tailwind (bg-primary, text-ink, etc.)?
✓ NO hardcodea colores?
✓ Si usa JS: importa useTheme()?
✓ NO importa ThemeProvider (es solo en layout.tsx)?
✓ Funciona cuando cambio de cliente?

Entonces → ✨ Está listo
```

---

**Última actualización:** 14 de junio de 2026  
**Mantenedor:** Med Toledo + Claude
