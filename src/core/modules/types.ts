/**
 * ════════════════════════════════════════════════════════════════
 * NÚCLEO · TIPOS DEL REGISTRO DE MÓDULOS
 * ════════════════════════════════════════════════════════════════
 * Un "módulo" (CRM, Inmobiliario, y futuros: Directorio, Salud…) se
 * autodescribe con un ModuleManifest. El Núcleo no conoce los módulos
 * por nombre: los descubre desde este registro + la tabla account_modules
 * (qué módulos están activos por subcuenta).
 *
 * Portabilidad: este archivo vive en src/core y NO importa nada de
 * src/modules. Cada módulo depende del Núcleo, nunca al revés.
 * ════════════════════════════════════════════════════════════════
 */

import type { LucideIcon } from 'lucide-react';

export interface ModuleNavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

export interface ModulePermission {
  key: string; // ej: 'properties.edit'
  label: string; // texto para el panel de permisos (estilo GHL)
}

export interface ModuleManifest {
  /** Clave estable usada en account_modules.module_key */
  key: string;
  /** Nombre visible */
  name: string;
  /** Grupo del sidebar (ej: 'INMUEBLES', 'CRM') */
  navGroup: string;
  /** Ítems de navegación que aporta el módulo */
  nav: ModuleNavItem[];
  /** Permisos que declara el módulo (para el panel de roles) */
  permissions: ModulePermission[];
}
