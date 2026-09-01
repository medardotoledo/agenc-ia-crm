// ════════════════════════════════════════════════════════════════
// Button — botón base del design system
// ════════════════════════════════════════════════════════════════
// Usa los tokens (bg-primary, text-inverse...). Si una instancia
// cambia su color de marca, estos botones cambian solos.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-inverse hover:bg-primary-light',
  secondary: 'bg-app text-ink border border-line hover:bg-soft',
  ghost: 'bg-transparent text-ink-soft hover:bg-soft hover:text-ink',
  danger: 'bg-danger text-inverse hover:opacity-90',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
