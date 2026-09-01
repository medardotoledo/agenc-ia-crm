import { Building2, Users, Globe, Inbox } from 'lucide-react';
import type { ModuleManifest } from '../types';

/**
 * MÓDULO INMOBILIARIO
 * Propiedades, agentes (perfiles públicos), import EasyBroker, sitio web.
 */
export const inmobiliarioModule: ModuleManifest = {
  key: 'inmobiliario',
  name: 'Inmobiliario',
  navGroup: 'INMUEBLES',
  nav: [
    { href: '/admin/properties', label: 'Propiedades', Icon: Building2 },
    { href: '/admin/prospectos', label: 'Prospectos', Icon: Inbox },
    { href: '/admin/agents', label: 'Agentes', Icon: Users },
    { href: '/admin/website', label: 'Sitio Web', Icon: Globe },
  ],
  permissions: [
    { key: 'properties.view', label: 'Ver propiedades' },
    { key: 'properties.edit', label: 'Crear / editar propiedades' },
    { key: 'properties.delete', label: 'Eliminar propiedades' },
    { key: 'properties.import', label: 'Importar de EasyBroker' },
    { key: 'agents.manage', label: 'Gestionar agentes' },
  ],
};
