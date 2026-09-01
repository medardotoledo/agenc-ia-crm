'use client';

/**
 * ════════════════════════════════════════════════════════════════
 * useTheme HOOK
 * ════════════════════════════════════════════════════════════════
 * Hook React para acceder a los valores del tema en componentes.
 *
 * CUÁNDO USARLO:
 * - Cuando necesitas el valor EXACTO de un color en JavaScript
 *   (ejemplo: pasar a una librería de gráficos como Chart.js)
 * - En 99% de casos, usa CSS variables en tailwind
 *
 * CÓMO USARLO:
 * ```tsx
 * const theme = useTheme();
 * console.log(theme.colorPrimary); // "#1e3a8a"
 * ```
 *
 * Última actualización: 14 de junio de 2026
 * ════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';

export interface UseThemeReturn {
  // Account ID (para queries multi-tenant)
  account_id: string;

  // Marca (pueden cambiar por cliente)
  colorPrimary: string;
  colorPrimaryLight: string;
  colorAccent: string;
  colorSidebar: string;

  // Neutrales
  colorDark: string;
  colorApp: string;
  colorSoft: string;
  colorCream: string;
  colorInk: string;
  colorInkSoft: string;
  colorInverse: string;
  colorLine: string;
  colorLineSoft: string;

  // Semánticos
  colorSuccess: string;
  colorDanger: string;
  colorWarning: string;

  // Canales
  colorChWhatsapp: string;
  colorChFacebook: string;
  colorChInstagram: string;
  colorChEmail: string;

  // Tipografía
  fontSans: string;
  fontMono: string;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  fontWeightBold: number;

  // Radios
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radius2xl: string;
}

/**
 * Hook: obtiene los valores del tema actual
 *
 * Lee las variables CSS del <html> (inyectadas por ThemeProvider)
 * y las retorna como objeto JS.
 *
 * RENDIMIENTO: Memorizado para no recalcular cada render
 */
export function useTheme(): UseThemeReturn {
  return useMemo(() => {
    // getComputedStyle() lee las variables CSS del <html>
    const root = typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement)
      : null;

    const getVar = (varName: string, fallback: string = ''): string => {
      if (!root) return fallback;
      return root.getPropertyValue(varName).trim() || fallback;
    };

    return {
      // Account ID (para queries multi-tenant)
      // Por defecto 'nodo-inmobiliario', luego se puede cambiar con autenticación
      account_id: process.env.NEXT_PUBLIC_DEFAULT_ACCOUNT_ID || 'nodo-inmobiliario',

      // Marca
      colorPrimary: getVar('--color-primary', '#1e3a8a'),
      colorPrimaryLight: getVar('--color-primary-light', '#2563eb'),
      colorAccent: getVar('--color-accent', '#f59e0b'),
      colorSidebar: getVar('--color-sidebar', '#0f172a'),

      // Neutrales
      colorDark: getVar('--color-dark', '#0f172a'),
      colorApp: getVar('--color-app', '#ffffff'),
      colorSoft: getVar('--color-soft', '#f8fafc'),
      colorCream: getVar('--color-cream', '#faf9f5'),
      colorInk: getVar('--color-ink', '#0f172a'),
      colorInkSoft: getVar('--color-ink-soft', '#64748b'),
      colorInverse: getVar('--color-inverse', '#ffffff'),
      colorLine: getVar('--color-line', '#e2e8f0'),
      colorLineSoft: getVar('--color-line-soft', '#f1f5f9'),

      // Semánticos
      colorSuccess: getVar('--color-success', '#16a34a'),
      colorDanger: getVar('--color-danger', '#dc2626'),
      colorWarning: getVar('--color-warning', '#ea580c'),

      // Canales
      colorChWhatsapp: getVar('--color-ch-whatsapp', '#25d366'),
      colorChFacebook: getVar('--color-ch-facebook', '#1877f2'),
      colorChInstagram: getVar('--color-ch-instagram', '#e1306c'),
      colorChEmail: getVar('--color-ch-email', '#5b21b6'),

      // Tipografía
      fontSans: getVar('--font-sans', '"Inter", sans-serif'),
      fontMono: getVar('--font-mono', 'monospace'),
      fontWeightMedium: parseInt(getVar('--font-weight-medium', '500'), 10),
      fontWeightSemibold: parseInt(getVar('--font-weight-semibold', '600'), 10),
      fontWeightBold: parseInt(getVar('--font-weight-bold', '700'), 10),

      // Radios
      radiusSm: getVar('--radius-sm', '4px'),
      radiusMd: getVar('--radius-md', '8px'),
      radiusLg: getVar('--radius-lg', '12px'),
      radiusXl: getVar('--radius-xl', '16px'),
      radius2xl: getVar('--radius-2xl', '1rem'),
    };
  }, []);
}

/**
 * Helper: extrae un valor de CSS variable
 *
 * USO:
 * const primaryColor = getCSSVariable('--color-primary', '#1e3a8a');
 *
 * Útil si solo necesitas UN color, no todo el tema.
 */
export function getCSSVariable(varName: string, fallback: string = ''): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value || fallback;
}
