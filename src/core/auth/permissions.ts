/**
 * ════════════════════════════════════════════════════════════════
 * NÚCLEO · MOTOR DE PERMISOS (estilo GoHighLevel)
 * ════════════════════════════════════════════════════════════════
 * Resuelve si un usuario PUEDE hacer algo, combinando:
 *   1) su ROL (super_admin / admin / agent) → defaults
 *   2) su objeto `permissions` (overrides granulares por usuario, como
 *      los toggles por módulo de GHL)
 *
 * Las CLAVES de permiso las declara cada módulo en su manifest
 * (ej: 'properties.edit', 'leads.assign'). Ver src/core/modules.
 *
 * Portable: archivo de Núcleo, sin dependencias de módulos ni de BD.
 * ════════════════════════════════════════════════════════════════
 */

import type { UserRole } from '@/hooks/useAuth';

export type PermissionMap = Record<string, boolean>;

/**
 * Defaults por rol:
 * - super_admin: todo (dueño de agencia)
 * - admin: todo dentro de su subcuenta
 * - agent: nada por default → se habilita con `permissions` por usuario
 *   (y normalmente con only_assigned_data = true)
 */
const ROLE_GRANTS_ALL: Record<UserRole, boolean> = {
  super_admin: true,
  admin: true,
  agent: false,
};

/**
 * ¿El usuario tiene el permiso `key`?
 * @param role  rol del usuario (de useAuth)
 * @param permissions  overrides por usuario (users.permissions jsonb)
 * @param key  clave declarada por un módulo (ej: 'properties.edit')
 */
export function can(
  role: UserRole | null | undefined,
  permissions: Record<string, unknown> | null | undefined,
  key: string
): boolean {
  if (!role) return false;
  // super_admin / admin: acceso total a permisos de módulo.
  if (ROLE_GRANTS_ALL[role]) return true;
  // agent u otros: solo lo explícitamente concedido en su objeto permissions.
  const map = (permissions ?? {}) as PermissionMap;
  return map[key] === true;
}

/** ¿Es dueño de agencia (acceso cruzado a subcuentas)? */
export function isAgencyOwner(role: UserRole | null | undefined): boolean {
  return role === 'super_admin';
}

/** ¿Administra su subcuenta (alta de usuarios, ajustes, etc.)? */
export function isAccountAdmin(role: UserRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}
