/**
 * useProperties Hook
 * Carga propiedades de la BD local para una agencia
 *
 * Uso:
 * const { properties, isLoading, error } = useProperties(accountId, { featured: true });
 */

'use client';

import { useEffect, useState } from 'react';

interface Property {
  id: string;
  account_id: string;
  easybroker_id?: string;
  title: string;
  description_short?: string;
  description_long?: string;
  price: number;
  currency: string;
  property_type: string;
  operation: string;
  bedrooms?: number;
  bathrooms?: number;
  construction_sqm?: number;
  lot_sqm?: number;
  city: string;
  neighborhood?: string;
  gallery_images?: string[];
  is_featured: boolean;
  status: string;
  created_at: string;
}

interface UsePropertiesOptions {
  featured?: boolean;
  limit?: number;
  offset?: number;
}

interface UsePropertiesResult {
  properties: Property[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProperties(
  accountId: string,
  options: UsePropertiesOptions = {}
): UsePropertiesResult {
  const { featured = false, limit = 10, offset = 0 } = options;

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProperties = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        accountId,
        limit: String(limit),
        offset: String(offset),
        ...(featured && { featured: 'true' }),
      });

      const response = await fetch(`/api/properties?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || 'Failed to fetch properties'
        );
      }

      const { properties: data } = await response.json();
      setProperties(data || []);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('[useProperties] Error:', errorObj);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchProperties();
    }
  }, [accountId, featured, limit, offset]);

  return {
    properties,
    isLoading,
    error,
    refetch: fetchProperties,
  };
}
