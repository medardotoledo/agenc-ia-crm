import { Megaphone } from 'lucide-react';
import type { ModuleManifest } from '../types';

/**
 * MÓDULO ADFLOW (Smart Ads Manager con IA)
 * Campañas automatizadas para Meta (Facebook/Instagram), TikTok, Google y WhatsApp Ads.
 * Integrado de forma nativa con la Fábrica de Agentes y el catálogo de productos.
 */
export const adflowModule: ModuleManifest = {
  key: 'adflow',
  name: 'AdFlow',
  navGroup: 'MARKETING',
  nav: [
    { href: '/admin/adflow', label: 'AdFlow (Smart Ads)', Icon: Megaphone },
  ],
  permissions: [
    { key: 'adflow.view', label: 'Ver campañas y analíticas publicitarias' },
    { key: 'adflow.create', label: 'Crear y lanzar campañas con IA' },
    { key: 'adflow.manage_budget', label: 'Modificar presupuestos y pausar anuncios' },
    { key: 'adflow.settings', label: 'Configurar credenciales publicitarias (Zernio & AI)' },
  ],
};
