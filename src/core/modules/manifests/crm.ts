import { Mail, MessageSquare, CalendarDays, Users, Package, Bot, Megaphone } from 'lucide-react';
import type { ModuleManifest } from '../types';

/**
 * MÓDULO CRM (espejo estilo GHL)
 * Contactos, pipeline/oportunidades, conversaciones, citas, fábrica de agentes, productos & servicios, AdFlow.
 */
export const crmModule: ModuleManifest = {
  key: 'crm',
  name: 'CRM',
  navGroup: 'CRM',
  nav: [
    { href: '/admin/leads', label: 'Prospectos', Icon: Users },
    { href: '/admin/conversaciones', label: 'Inbox', Icon: MessageSquare },
    { href: '/admin/citas', label: 'Citas', Icon: CalendarDays },
    { href: '/admin/fabrica-agentes', label: 'Fábrica de Agentes', Icon: Bot },
    { href: '/admin/productos', label: 'Mis Productos & Servicios', Icon: Package },
    { href: '/admin/adflow', label: 'AdFlow (Smart Ads)', Icon: Megaphone, badge: 'IA' },
  ],
  permissions: [
    { key: 'leads.view_all', label: 'Ver todos los prospectos' },
    { key: 'leads.view_assigned', label: 'Ver solo prospectos asignados' },
    { key: 'leads.assign', label: 'Asignar prospectos' },
    { key: 'leads.edit', label: 'Editar prospectos' },
  ],
};
