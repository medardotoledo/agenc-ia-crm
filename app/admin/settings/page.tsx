/**
 * POST /admin/settings
 * Panel de configuración de credenciales (EasyBroker, OpenAI, Claude, GHL)
 */

'use client';

import { EasyBrokerSettings } from '@/modules/settings/components/EasyBrokerSettings';
import { WhatsAppSettings } from '@/modules/settings/components/WhatsAppSettings';
import { PipelineStagesSettings } from '@/modules/crm/components/PipelineStagesSettings';
import { ProspectoStagesSettings } from '@/modules/property-management/components/ProspectoStagesSettings';
import { GHLSettings } from '@/modules/settings/components/GHLSettings';
import { AiKeysSettings } from '@/modules/settings/components/AiKeysSettings';
import { useActiveAccount } from '@/core/account/activeAccount';

export default function SettingsPage() {
  // Subcuenta ACTIVA (la seleccionada por el dueño de agencia, o la propia).
  const { account } = useActiveAccount();
  const account_id = account?.id ?? '';

  return (
    <div className="min-h-screen bg-app">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-ink mb-2">Configuración</h1>
          <p className="text-ink-soft">Gestiona tus APIs, WhatsApp y canales de comunicación</p>
        </div>

        {/* Canales principales: WhatsApp QR & EasyBroker */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <WhatsAppSettings accountId={account_id} />
          <EasyBrokerSettings accountId={account_id} />
        </div>

        {/* Etapas del pipeline */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <PipelineStagesSettings />
          <ProspectoStagesSettings />
        </div>

        {/* Integraciones de IA & GHL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AiKeysSettings accountId={account_id} />
          <div className="space-y-6">
            <GHLSettings accountId={account_id} />
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">💡 Tip</h3>
          <p className="text-blue-800 text-sm">
            Todos los datos se almacenan de forma segura en Supabase. Las API Keys se encriptan
            y nunca se exponen en el frontend.
          </p>
        </div>
      </div>
    </div>
  );
}
