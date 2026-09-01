'use client';

// ════════════════════════════════════════════════════════════════
// THEME PROVIDER — aplica el tema de marca en tiempo real
// ════════════════════════════════════════════════════════════════
// Toma los colores de una Instancia y los inyecta como variables CSS
// sobre los valores por defecto de tokens.css (nivel Matriz).
//
// CASCADA: si un color viene vacío (null/undefined), NO se sobreescribe
// y la app sigue usando el valor por defecto de la Matriz.
//
// Es PORTABLE: no depende de auth ni de Supabase. Recibe un objeto
// `theme` por props, así se puede reusar en cualquier proyecto.
// ════════════════════════════════════════════════════════════════

import { useEffect } from 'react';

export interface BrandTheme {
  primary?: string | null;
  primaryLight?: string | null;
  accent?: string | null;
  sidebar?: string | null;
}

// Mapa: propiedad del tema -> variable CSS del design system
const VAR_MAP: Record<keyof BrandTheme, string> = {
  primary: '--color-primary',
  primaryLight: '--color-primary-light',
  accent: '--color-accent',
  sidebar: '--color-sidebar',
};

export function ThemeProvider({
  theme,
  children,
}: {
  theme?: BrandTheme | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const applied: string[] = [];

    if (theme) {
      (Object.keys(VAR_MAP) as (keyof BrandTheme)[]).forEach((key) => {
        const value = theme[key];
        if (value) {
          root.style.setProperty(VAR_MAP[key], value);
          applied.push(VAR_MAP[key]);
        }
      });
    }

    // Al desmontar o cambiar de instancia: quitar overrides para
    // volver a heredar los defaults de la Matriz.
    return () => {
      applied.forEach((v) => root.style.removeProperty(v));
    };
  }, [theme]);

  return <>{children}</>;
}
