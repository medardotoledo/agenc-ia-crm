import { WhatsAppSettings } from '@/modules/settings/components/WhatsAppSettings';

export default function GhlPage({ searchParams }: { searchParams: { location_id?: string } }) {
  const locationId = searchParams.location_id;

  if (!locationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error de Conexión</h1>
          <p className="text-gray-600 mb-4">
            No se detectó el identificador de la cuenta (location_id). 
          </p>
          <p className="text-sm text-gray-500">
            Asegúrate de configurar el Custom Menu Link en GoHighLevel exactamente con este parámetro en la URL:<br/>
            <code className="bg-gray-100 px-2 py-1 rounded mt-2 block break-all">
              ?location_id=&#123;&#123;location.id&#125;&#125;
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Conexión de WhatsApp
          </h1>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
            Location: {locationId}
          </span>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <WhatsAppSettings accountId={locationId} />
        </div>
      </div>
    </div>
  );
}
