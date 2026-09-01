/**
 * ════════════════════════════════════════════════════════════════
 * NÚCLEO · REGISTRO CENTRAL DE MÓDULOS
 * ════════════════════════════════════════════════════════════════
 * Lista de TODOS los módulos disponibles en este proyecto. Para agregar
 * un módulo nuevo (Directorio, Salud, etc.): crear su manifest en
 * ./manifests/<clave>.ts e incluirlo aquí. Nada más del Núcleo cambia.
 * ════════════════════════════════════════════════════════════════
 */

import type { ModuleManifest } from './types';
import { crmModule } from './manifests/crm';
import { inmobiliarioModule } from './manifests/inmobiliario';

export const ALL_MODULES: ModuleManifest[] = [crmModule, inmobiliarioModule];

export function getModuleManifest(key: string): ModuleManifest | undefined {
  return ALL_MODULES.find((m) => m.key === key);
}
