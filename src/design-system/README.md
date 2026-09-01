# 🎨 Design System — Índice y guía rápida

**Escrito en piedra:** 14 de junio de 2026  
**Estado:** ✅ Completo y listo para nuevos módulos

---

## 📂 Archivos en esta carpeta

| Archivo | Propósito | Cuándo leerlo |
|---------|-----------|---------------|
| **DESIGN_SYSTEM.md** | Documentación completa del sistema | Primera vez que trabajas aquí |
| **INSTRUCCIONES_NUEVOS_MODULOS.md** | Guía para crear módulos que hereden el theme | Cuando creas un nuevo módulo |
| **types.ts** | Tipos TypeScript centralizados | Cuando necesitas tipos propios |
| **tokens.css** | Variables CSS — NIVEL MATRIZ (defaults) | Cuando cambias colores de la agencia |
| **ThemeProvider.tsx** | React component que inyecta overrides | Cuando necesitas entender la cascada |
| **useTheme.ts** | Hook para acceder a temas en JS | Cuando necesitas valores exactos |
| **primitives/** | Componentes base reutilizables | Cuando creas nuevos componentes |

---

## 🚀 Guía rápida

### 1️⃣ Para crear un nuevo módulo

Lee: **INSTRUCCIONES_NUEVOS_MODULOS.md**

Resumen:
```tsx
// ✅ Usa variables CSS
<div className="bg-primary text-inverse rounded-lg">
  El módulo hereda colores automáticamente ✨
</div>
```

---

### 2️⃣ Para obtener valores en JavaScript

```tsx
import { useTheme } from '@/design-system';

const theme = useTheme();
console.log(theme.colorPrimary); // "#1e3a8a"
```

---

### 3️⃣ Para agregar un nuevo cliente

Ve a `src/lib/theme-resolver.ts` — está automatizado.

```sql
INSERT INTO agency_branding (account_id, primary_color, accent_color, ...)
VALUES ('cliente-uuid', '#1A3A52', '#C89968', ...);
```

La app cambia automáticamente. ✨

---

### 4️⃣ Para cambiar el tema de la Matriz

Edita `tokens.css` en **DOS lugares** simultáneamente:

```css
/* tokens.css */
--color-primary: #nuevo-color;
```

```ts
/* types.ts — DEFAULT_BRAND_THEME */
primary: '#nuevo-color',
```

---

## 📊 Cascada: Cómo funciona

```
1. NIVEL MATRIZ (tokens.css)
   ├─ Define colores por defecto para TODA la app
   └─ Aplica para clientes sin tema personalizado

2. NIVEL INSTANCIA (BD → ThemeProvider)
   ├─ Cliente puede sobrescribir colores de marca
   └─ Si NO define → usa NIVEL MATRIZ

3. RESULTADO (componentes)
   ├─ Usan var(--color-primary), var(--color-accent), etc.
   └─ Obtienen el valor correcto (cliente o defecto)
```

---

## ✅ Checklist: ¿Está completo?

- [x] **DESIGN_SYSTEM.md** — Documentación oficial
- [x] **INSTRUCCIONES_NUEVOS_MODULOS.md** — Guía para módulos
- [x] **types.ts** — Tipos TypeScript
- [x] **tokens.css** — Variables CSS (NIVEL MATRIZ)
- [x] **ThemeProvider.tsx** — Inyecta overrides
- [x] **useTheme.ts** — Hook para JS
- [x] **app/layout.tsx** — Usa ThemeProvider
- [x] **tailwind.config.ts** — Mapea variables a clases
- [x] **src/lib/theme-resolver.ts** — Obtiene tema de BD
- [x] **index.ts** — Exports centralizados
- [x] **README.md** — Este archivo

**Estado:** ✅ **ESCRITO EN PIEDRA — LISTO PARA PRODUCCIÓN**

---

## 🎯 Para el futuro

Cuando agregues nuevos clientes (Nodo, Cliente2, etc.):

1. ✅ Inserta fila en `agency_branding` con sus colores
2. ✅ Todo lo demás funciona automáticamente
3. ✅ **Cero cambios de código** en módulos

---

## 📞 Contacto / Cambios

Si necesitas:
- Agregar variable CSS nueva → edita `tokens.css` Y `types.ts`
- Cambiar estructura → actualiza estos archivos Y DESPU document TODO aquí
- Reportar bug → crea issue con detalles

**Recuerda:** Este es el sistema centralizado. Cambios aquí afectan TODA la app.

---

**Mantenedor:** Med Toledo + Claude  
**Última revisión:** 14 de junio de 2026
