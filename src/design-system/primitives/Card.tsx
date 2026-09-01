// ════════════════════════════════════════════════════════════════
// Card — contenedor base del design system
// ════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-app ${className}`}>
      {children}
    </div>
  );
}
