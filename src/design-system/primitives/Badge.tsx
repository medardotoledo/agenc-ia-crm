// ════════════════════════════════════════════════════════════════
// Badge — pill de estado genérico del design system
// ════════════════════════════════════════════════════════════════
// `tone` define el color semántico. Para pills muy específicas del
// negocio (etapas del CRM, temperatura) cada módulo crea las suyas.

import type { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-line-soft text-ink-soft',
  success: 'bg-stage-close-bg text-stage-close-text',
  warning: 'bg-stage-proposal-bg text-stage-proposal-text',
  danger: 'bg-stage-lost-bg text-stage-lost-text',
  info: 'bg-stage-new-bg text-stage-new-text',
  accent: 'bg-stage-contact-bg text-stage-contact-text',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
