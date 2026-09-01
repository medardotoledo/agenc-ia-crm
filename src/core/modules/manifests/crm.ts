import { Mail, MessageSquare } from 'lucide-react';
import type { ModuleManifest } from '../types';

/**
 * MÓDULO CRM (espejo estilo GHL)
 * Contactos, pipeline/oportunidades, conversaciones, citas.
 */
export const crmModule: ModuleManifest = {
  key: 'crm',
  name: 'CRM',
  navGroup: 'CRM',
  nav: [
    { href: '/admin/conversaciones', label: 'Conversaciones', Icon: MessageSquare },
  ],
  permissions: [
    { key: 'leads.view_all', label: 'Ver todos los prospectos' },
    { key: 'leads.view_assigned', label: 'Ver solo prospectos asignados' },
    { key: 'leads.assign', label: 'Asignar prospectos' },
    { key: 'leads.edit', label: 'Editar prospectos' },
  ],
};
