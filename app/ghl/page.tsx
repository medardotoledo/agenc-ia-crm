export const dynamic = 'force-dynamic';
import { WhatsAppSettings } from '@/modules/settings/components/WhatsAppSettings';

export default async function GhlPage({ searchParams }: { searchParams: Promise<any> }) {
  // En Next.js 15+, searchParams es una promesa que debe resolverse
  const resolvedParams = await searchParams;
  
  // Intentar leer diferentes variaciones de location_id
  const locationId = resolvedParams.location_id || resolvedParams.locationId || resolvedParams.location;

  if (!locationId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-lg text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Modo Depuración</h1>
          <p className="text-gray-600 mb-4">
            Parece que la URL no tiene el parámetro esperado. 
            Esto es lo que GoHighLevel está enviando a la aplicación:
          </p>
          <pre className="bg-gray-100 p-4 rounded text-left text-xs overflow-auto text-red-600 font-mono mb-4">
            {JSON.stringify(resolvedParams, null, 2)}
          </pre>
          <p className="text-sm text-gray-500">
            Asegúrate de que la URL en GoHighLevel termine en:<br/>
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
