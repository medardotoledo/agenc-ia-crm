/**
 * ════════════════════════════════════════════════════════════════
 * DESIGN SYSTEM — Punto de entrada único
 * ════════════════════════════════════════════════════════════════
 * Importa TODOS los tipos, componentes y utilidades desde aquí.
 *
 * COMPONENTES:
 * import { Button, Card, Badge } from '@/design-system'
 *
 * TIPOS:
 * import { BrandTheme, FullTheme } from '@/design-system'
 *
 * HOOKS:
 * import { useTheme } from '@/design-system'
 *
 * PROVIDER:
 * import { ThemeProvider } from '@/design-system'
 *
 * ════════════════════════════════════════════════════════════════
 */

// ──────── COMPONENTES PRIMITIVOS ────────
export { Button } from './primitives/Button';
export { Card } from './primitives/Card';
export { Badge } from './primitives/Badge';

// ──────── PROVIDER & HOOKS ────────
export { ThemeProvider } from './ThemeProvider';
export { useTheme, getCSSVariable } from './useTheme';

// ──────── TIPOS ────────
export type {
  BrandTheme,
  FullTheme,
  ThemeResolverResult,
  AgencyBrandingRow,
} from './types';

export type { UseThemeReturn } from './useTheme';

export {
  DEFAULT_BRAND_THEME,
  CSS_VARIABLES,
  cssVariableName,
} from './types';
