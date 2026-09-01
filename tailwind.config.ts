import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ────────────────────────────────────────────────────────
      // COLORES — mapeados desde variables CSS de design-system
      // ────────────────────────────────────────────────────────
      colors: {
        // MARCA (pueden cambiar por cliente)
        primary: 'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        accent: 'var(--color-accent)',
        sidebar: 'var(--color-sidebar)',

        // NEUTRALES
        app: 'var(--color-app)',
        soft: 'var(--color-soft)',
        cream: 'var(--color-cream)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        inverse: 'var(--color-inverse)',
        line: 'var(--color-line)',
        'line-soft': 'var(--color-line-soft)',

        // SEMÁNTICOS
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',

        // CANALES
        whatsapp: 'var(--color-ch-whatsapp)',
        facebook: 'var(--color-ch-facebook)',
        instagram: 'var(--color-ch-instagram)',
      },

      // ────────────────────────────────────────────────────────
      // TIPOGRAFÍA
      // ────────────────────────────────────────────────────────
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },

      fontWeight: {
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },

      // ────────────────────────────────────────────────────────
      // RADIOS (esquinas redondeadas)
      // ────────────────────────────────────────────────────────
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
    },
  },
  plugins: [],
};

export default config;
