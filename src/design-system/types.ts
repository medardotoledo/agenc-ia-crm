/**
 * ════════════════════════════════════════════════════════════════
 * DESIGN SYSTEM — TYPES
 * ════════════════════════════════════════════════════════════════
 * Tipos TypeScript para el sistema de diseño.
 * Fuente única de verdad para la estructura del tema.
 *
 * Última actualización: 14 de junio de 2026
 * ════════════════════════════════════════════════════════════════
 */

/**
 * BRAND THEME — Colores personalizables por cliente/instancia
 *
 * Solo estos 4 colores pueden variar por cliente.
 * El resto (neutrales, semánticos, etc.) se heredan de la Matriz.
 *
 * Todos son opcionales (null/undefined = heredar de la Matriz)
 */
export interface BrandTheme {
  primary?: string | null;      // --color-primary
  primaryLight?: string | null; // --color-primary-light
  accent?: string | null;       // --color-accent
  sidebar?: string | null;      // --color-sidebar
}

/**
 * FULL THEME — Tema completo con valores resueltos
 *
 * Incluye todos los colores, después de la cascada:
 * 1. Si cliente tiene valor → úsalo
 * 2. Si no → usa valor de la Matriz (DEFAULT)
 *
 * Esto es lo que retorna useTheme() y theme-resolver
 */
export interface FullTheme extends BrandTheme {
  // Neutrales
  dark?: string;
  app?: string;
  soft?: string;
  cream?: string;
  ink?: string;
  inkSoft?: string;
  inverse?: string;
  line?: string;
  lineSoft?: string;

  // Semánticos
  success?: string;
  danger?: string;
  warning?: string;

  // Canales
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  email?: string;

  // Tipografía
  fontSans?: string;
  fontMono?: string;
  fontWeightMedium?: number;
  fontWeightSemibold?: number;
  fontWeightBold?: number;

  // Radios
  radiusSm?: string;
  radiusMd?: string;
  radiusLg?: string;
  radiusXl?: string;
  radius2xl?: string;
}

/**
 * THEME RESOLVER RESULT
 *
 * Lo que retorna getThemeForInstance() en server
 * y useTheme() en cliente
 */
export interface ThemeResolverResult {
  theme: BrandTheme | null;
  accountId: string;
  instanceId?: string;
  isDefault: boolean; // true si está usando DEFAULT (sin override)
}

/**
 * DATABASE SCHEMA — agency_branding
 *
 * Esto es lo que guardas en Supabase
 * Espera que ya tengas una tabla con esta estructura:
 */
export interface AgencyBrandingRow {
  id: string;
  account_id: string;        // UUID o string único de agencia/instancia
  agency_name: string;
  agency_tagline?: string;
  logo_url?: string;
  primary_color?: string;    // #1e3a8a
  primary_light_color?: string;
  accent_color?: string;
  sidebar_color?: string;
  serif_font?: string;
  sans_font?: string;
  created_at: string;
  updated_at: string;
}

/**
 * DEFAULT THEME — Nivel Matriz (Med Toledo)
 *
 * Estos valores están en tokens.css también.
 * Si modificas uno, modifica los DOS lugares.
 */
export const DEFAULT_BRAND_THEME: BrandTheme = {
  primary: '#1e3a8a',        // Azul marino
  primaryLight: '#2563eb',   // Azul claro
  accent: '#f59e0b',         // Ámbar/dorado
  sidebar: '#0f172a',        // Gris muy oscuro
};

/**
 * TAILWIND CONFIG MAPPING
 *
 * Así se mapean las variables CSS a clases de tailwind:
 *
 * --color-primary         → bg-primary, text-primary, border-primary
 * --color-primary-light   → bg-primary-light, etc.
 * --color-accent          → bg-accent, text-accent
 * --color-sidebar         → bg-sidebar
 * --color-app             → bg-app
 * --color-soft            → bg-soft
 * --color-ink             → text-ink
 * --color-line            → border-line
 *
 * Ver tailwind.config.ts para los nombres exactos.
 */

/**
 * CSS VARIABLE NAMES
 *
 * Estos son los nombres exactos que se usan en tokens.css
 * y en los componentes vía var(--...)
 */
export const CSS_VARIABLES = {
  // Marca
  colorPrimary: '--color-primary',
  colorPrimaryLight: '--color-primary-light',
  colorAccent: '--color-accent',
  colorSidebar: '--color-sidebar',

  // Neutrales
  colorDark: '--color-dark',
  colorApp: '--color-app',
  colorSoft: '--color-soft',
  colorCream: '--color-cream',
  colorInk: '--color-ink',
  colorInkSoft: '--color-ink-soft',
  colorInverse: '--color-inverse',
  colorLine: '--color-line',
  colorLineSoft: '--color-line-soft',

  // Semánticos
  colorSuccess: '--color-success',
  colorDanger: '--color-danger',
  colorWarning: '--color-warning',

  // Canales
  colorChWhatsapp: '--color-ch-whatsapp',
  colorChFacebook: '--color-ch-facebook',
  colorChInstagram: '--color-ch-instagram',
  colorChEmail: '--color-ch-email',

  // Tipografía
  fontSans: '--font-sans',
  fontMono: '--font-mono',
  fontWeightMedium: '--font-weight-medium',
  fontWeightSemibold: '--font-weight-semibold',
  fontWeightBold: '--font-weight-bold',

  // Radios
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',
  radiusXl: '--radius-xl',
  radius2xl: '--radius-2xl',
} as const;

/**
 * Helper: Convierte nombre de propiedad a nombre de variable CSS
 * Ejemplo: 'primary' → '--color-primary'
 */
export function cssVariableName(prop: keyof typeof CSS_VARIABLES): string {
  return CSS_VARIABLES[prop] as string;
}
