/**
 * ════════════════════════════════════════════════════════════════
 * PROPERTIES SYNC SERVICE
 * ════════════════════════════════════════════════════════════════
 * Servicio para sincronizar propiedades entre EasyBroker y BD local
 *
 * Flujos:
 * 1. Import masivo: EasyBroker → BD (al hacer click en "Importar")
 * 2. Sync individual: al publicar una propiedad local → EasyBroker
 * 3. Webhook: cambios en EB → webhook → sync local
 *
 * Última actualización: 15 de junio de 2026
 * ════════════════════════════════════════════════════════════════
 */

import { EasyBrokerClient, EasyBrokerAPIError } from '@/lib/easybroker-client';
import { createClient } from '@supabase/supabase-js';

interface SyncResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ ebId: string; error: string }>;
}

interface PropertyImportOptions {
  limit?: number;
  page?: number;
  convertImages?: boolean; // Convertir a WebP
}

export class PropertiesSyncService {
  private ebClient: EasyBrokerClient;
  // Usa la service role key si está disponible; si no, cae a la anon key
  // (las tablas tienen RLS permisivo en desarrollo). Para producción se
  // recomienda configurar SUPABASE_SERVICE_ROLE_KEY y endurecer RLS.
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
  );

  constructor(apiKey: string) {
    this.ebClient = new EasyBrokerClient(apiKey);
  }

  /**
   * Importa propiedades de EasyBroker a BD local.
   *
   * `limit` controla CUÁNTAS propiedades se importan (útil para pruebas:
   * limit=3 trae solo 3 en vez de las cientos de la cuenta).
   */
  async importAllProperties(
    accountId: string,
    options: PropertyImportOptions = {}
  ): Promise<SyncResult> {
    const { limit = 50, page = 1 } = options;

    const result: SyncResult = {
      success: true,
      imported: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 1. Obtener el listado (resumen) de EasyBroker. EB devuelve { pagination, content }.
      console.log(`[EasyBroker] Listando propiedades (limit=${limit})...`);
      const response = await this.ebClient.getAllProperties(limit, page);
      const items = (response.content || []).slice(0, limit);

      if (items.length === 0) {
        console.log(`[EasyBroker] No se encontraron propiedades`);
        return result;
      }

      console.log(
        `[EasyBroker] ${items.length} propiedades a importar (total en cuenta: ${response.pagination?.total ?? '?'})`
      );

      // 2. Procesar en lotes pequeños (cada una requiere pedir su detalle).
      const batchSize = 5;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const settled = await Promise.allSettled(
          batch.map((item) => this.importSingleProperty(accountId, item.public_id))
        );

        settled.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            result.imported++;
          } else {
            result.failed++;
            result.errors.push({
              ebId: batch[idx].public_id,
              error:
                res.reason instanceof Error
                  ? res.reason.message
                  : String(res.reason),
            });
          }
        });
      }

      await this.logSync(accountId, 'IMPORT', 'success', {
        imported: result.imported,
        failed: result.failed,
      });

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        ebId: 'N/A',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.logSync(accountId, 'IMPORT', 'failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return result;
    }
  }

  /**
   * Importa una propiedad individual: pide su detalle a EasyBroker y la
   * inserta (o actualiza si ya existe el easybroker_id) en BD local.
   * Las imágenes se guardan como URLs directas de EasyBroker (sin descargar).
   */
  private async importSingleProperty(
    accountId: string,
    publicId: string
  ): Promise<any> {
    // 1. Detalle completo (recámaras, baños, descripción, imágenes solo vienen aquí).
    const eb = await this.ebClient.getProperty(publicId);

    const op = eb.operations?.[0];

    // 2. Mapear al schema local.
    const property = {
      account_id: accountId,
      easybroker_id: eb.public_id,
      title: eb.title,
      slug: eb.public_id,
      is_published: true,
      description_long: eb.description ?? null,
      property_type: eb.property_type ?? null,
      status: 'published',

      operation: op?.type === 'rental' ? 'Renta' : 'Venta',

      // Ubicación (en el detalle `location` es un objeto).
      street:
        [eb.location?.street, eb.location?.exterior_number]
          .filter(Boolean)
          .join(' ') || null,
      neighborhood: eb.location?.name?.split(',')[0]?.trim() || null,
      city: eb.location?.name?.split(',')[1]?.trim() || null,
      state: eb.location?.name?.split(',')[2]?.trim() || null,
      postal_code: eb.location?.postal_code ?? null,
      latitude: eb.location?.latitude ?? null,
      longitude: eb.location?.longitude ?? null,

      // Precio
      price: op?.amount ?? null,
      currency: op?.currency || 'MXN',

      // Especificaciones
      bedrooms: eb.bedrooms ?? null,
      bathrooms: eb.bathrooms ?? null,
      parking_spaces: eb.parking_spaces ?? null,
      construction_sqm: eb.construction_size ?? null,
      lot_sqm: eb.lot_size ?? null,
      age_years:
        typeof eb.age === 'number'
          ? eb.age
          : eb.age
          ? parseInt(String(eb.age), 10) || null
          : null,

      // Imágenes (URLs directas de EasyBroker)
      gallery_images: (eb.property_images || []).map((img) => img.url),

      // Sync
      easybroker_sync_status: 'synced',
      easybroker_last_sync: new Date().toISOString(),
      easybroker_sync_error: null,
    };

    // 3. Upsert por easybroker_id (evita duplicados si se reimporta).
    const { data, error } = await this.supabase
      .from('properties')
      .upsert(property, { onConflict: 'easybroker_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Insert falló para ${publicId}: ${error.message}`);
    }

    return data;
  }

  /**
   * Sincroniza una propiedad local a EasyBroker
   */
  async syncPropertyToEasyBroker(propertyId: string): Promise<void> {
    try {
      // 1. Obtener propiedad local
      const { data: property, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error || !property) {
        throw new Error(`Property not found: ${propertyId}`);
      }

      // 2. Mapear a payload de EasyBroker
      const payload = this.buildEasyBrokerPayload(property);

      // 3. Enviar a EasyBroker (crear o actualizar)
      let response;
      if (property.easybroker_id) {
        // Actualizar
        response = await this.ebClient.updateProperty(
          property.easybroker_id,
          payload
        );
      } else {
        // Crear
        response = await this.ebClient.createProperty(payload);
      }

      // 4. Guardar EB ID si es creación
      if (!property.easybroker_id && response.public_id) {
        await this.supabase
          .from('properties')
          .update({
            easybroker_id: response.public_id,
            easybroker_sync_status: 'synced',
            easybroker_last_sync: new Date().toISOString(),
          })
          .eq('id', propertyId);
      }

      // 5. Registrar en logs
      await this.logSync(
        property.account_id,
        property.easybroker_id ? 'UPDATE' : 'CREATE',
        'success',
        { property_id: propertyId, easybroker_id: response.public_id }
      );
    } catch (error) {
      // Registrar error
      await this.supabase
        .from('properties')
        .update({
          easybroker_sync_status: 'failed',
          easybroker_sync_error: error instanceof Error ? error.message : String(error),
        })
        .eq('id', propertyId);

      throw error;
    }
  }

  /**
   * Construye el payload para EasyBroker desde propiedad local
   */
  private buildEasyBrokerPayload(property: any): any {
    return {
      title: property.title,
      description: property.description_long || property.description_short,
      property_type: property.property_type,
      status: 'not_published',
      operations: [
        {
          type: property.operation === 'Renta' ? 'rental' : 'sale',
          amount: property.price,
          currency: property.currency,
          period: property.operation === 'Renta' ? 'monthly' : undefined,
        },
      ],
      location: {
        address: [
          property.street,
          property.neighborhood,
          property.city,
          property.state,
          property.postal_code,
        ]
          .filter(Boolean)
          .join(', '),
        latitude: property.latitude,
        longitude: property.longitude,
      },
      property_details: {
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parking_spaces: property.parking_spaces,
        construction_area: property.construction_sqm,
        lot_area: property.lot_sqm,
        age: property.age_years,
      },
      amenities: property.amenities || [],
      images: (property.gallery_images || []).map((url: string) => ({
        url,
        description: property.title,
      })),
    };
  }

  /**
   * Registra una sincronización en logs
   */
  private async logSync(
    accountId: string,
    action: string,
    status: string,
    data: any
  ): Promise<void> {
    try {
      await this.supabase.from('easybroker_sync_logs').insert({
        account_id: accountId,
        action,
        status,
        response_data: data,
      });
    } catch (error) {
      console.error('[PropertiesSyncService] Failed to log sync:', error);
    }
  }
}
