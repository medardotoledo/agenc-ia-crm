/**
 * ════════════════════════════════════════════════════════════════
 * EASYBROKER API CLIENT
 * ════════════════════════════════════════════════════════════════
 * Cliente para interactuar con la API de EasyBroker
 *
 * Docs: https://developers.easybroker.com/
 *
 * Última actualización: 15 de junio de 2026
 * ════════════════════════════════════════════════════════════════
 */

// Detalle completo tal como llega en /properties/{public_id}.
interface EasyBrokerProperty {
  public_id: string;
  title: string;
  description?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  half_bathrooms?: number;
  parking_spaces?: number;
  construction_size?: number;
  lot_size?: number;
  age?: number | string;
  operations?: Array<{
    type: 'sale' | 'rental' | 'development' | 'auction';
    amount: number;
    currency: string;
    period?: string; // 'monthly', 'annual'
    formatted_amount?: string;
  }>;
  location?: {
    name?: string;
    street?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    exterior_number?: string;
    interior_number?: string | null;
  };
  property_images?: Array<{
    url: string;
    title?: string | null;
  }>;
  public_url?: string;
  status?: string;
}

interface EasyBrokerResponse {
  public_id: string;
  title: string;
  [key: string]: any;
}

// Item tal como llega en el listado (/properties) — datos resumidos.
// OJO: el listado NO trae recámaras, baños, descripción ni galería completa.
// Para eso hay que pedir el detalle (/properties/{public_id}).
export interface EasyBrokerListItem {
  public_id: string;
  title: string;
  title_image_full?: string;
  title_image_thumb?: string;
  location?: string; // en el listado es un string, ej: "La Pradera, El Marqués, Querétaro"
  operations?: Array<{
    type: 'sale' | 'rental' | 'development' | 'auction';
    amount: number;
    currency: string;
    formatted_amount?: string;
  }>;
  property_type?: string;
}

interface EasyBrokerListResponse {
  pagination: {
    limit: number;
    page: number;
    total: number;
    next_page?: string | null;
  };
  content: EasyBrokerListItem[];
}

export class EasyBrokerClient {
  private apiKey: string;
  private baseURL = 'https://api.easybroker.com/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        'EasyBroker API Key is required. Check your agency settings.'
      );
    }
    this.apiKey = apiKey;
  }

  /**
   * Obtiene una página del listado de propiedades.
   * EasyBroker pagina con `page` (no `offset`) y el máximo por página es 50.
   */
  async getAllProperties(
    limit: number = 50,
    page: number = 1
  ): Promise<EasyBrokerListResponse> {
    return this.request('/properties', {
      method: 'GET',
      params: { limit: Math.min(limit, 50), page },
    });
  }

  /**
   * Obtiene una propiedad por ID
   */
  async getProperty(publicId: string): Promise<EasyBrokerProperty> {
    return this.request(`/properties/${publicId}`, {
      method: 'GET',
    });
  }

  /**
   * Crea una nueva propiedad en EasyBroker
   */
  async createProperty(
    payload: Partial<EasyBrokerProperty>
  ): Promise<EasyBrokerResponse> {
    return this.request('/properties', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Actualiza una propiedad existente
   */
  async updateProperty(
    publicId: string,
    payload: Partial<EasyBrokerProperty>
  ): Promise<EasyBrokerResponse> {
    return this.request(`/properties/${publicId}`, {
      method: 'PATCH',
      body: payload,
    });
  }

  /**
   * Elimina una propiedad
   */
  async deleteProperty(publicId: string): Promise<void> {
    return this.request(`/properties/${publicId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Método interno para hacer requests
   */
  private async request(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      params?: Record<string, any>;
      body?: any;
    } = {}
  ): Promise<any> {
    const { method = 'GET', params, body } = options;

    let url = `${this.baseURL}${endpoint}`;

    // Agregar parámetros query
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // EasyBroker autentica con el header `X-Authorization` (NO `Authorization: Bearer`).
    const headers: Record<string, string> = {
      'X-Authorization': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new EasyBrokerAPIError(
          `EasyBroker API Error: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // DELETE responses pueden no tener body
      if (method === 'DELETE') {
        return void 0;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof EasyBrokerAPIError) {
        throw error;
      }

      throw new Error(
        `Failed to call EasyBroker API at ${endpoint}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Error personalizado para EasyBroker
 */
export class EasyBrokerAPIError extends Error {
  constructor(message: string, public statusCode: number, public responseBody: string) {
    super(message);
    this.name = 'EasyBrokerAPIError';
  }
}

/**
 * Factory function para crear un cliente con credenciales desde BD
 */
export async function createEasyBrokerClient(
  accountId: string
): Promise<EasyBrokerClient> {
  // TODO: Obtener desde BD
  // const settings = await getAgencySettings(accountId);
  // return new EasyBrokerClient(settings.easybroker_api_key);

  // Por ahora, retorna error si no está configurado
  throw new Error('EasyBroker not configured for this account');
}
