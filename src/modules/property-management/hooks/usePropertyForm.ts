'use client';

import { useState, useCallback } from 'react';
import type { Property, UpdatePropertyInput } from '@/types/database';
import { propertyService } from '../services/propertyService';

export function usePropertyForm(initialProperty?: Property, accountId?: string) {
  const [formData, setFormData] = useState<Partial<Property>>(
    initialProperty || {
      title: '',
      price: 0,
      currency: 'MXN',
      operation: 'Venta',
      property_type: 'Casa',
      city: '',
      state: 'Querétaro',
      bedrooms: 0,
      bathrooms: 0,
      half_baths: 0,
      parking_spaces: 0,
      age_years: 0,
      construction_sqm: 0,
      lot_sqm: 0,
      levels: 1,
      condition: 'Bueno',
      street: '',
      neighborhood: '',
      postal_code: '',
      location_notes: '',
      amenities: '',
      description_short: '',
      description_long: '',
      description_zone: '',
      meta_title: '',
      meta_description: '',
      gallery_images: [],
      video_url: '',
      virtual_tour_url: '',
      floor_plans: [],
      nearby_places: [],
      is_featured: false,
      is_published: false,
      assigned_agents: [],
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update single field
  const updateField = useCallback((field: keyof Property, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setError(null);
  }, []);

  // Update multiple fields
  const updateFields = useCallback((updates: Partial<Property>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
    setError(null);
  }, []);

  // Save (create or update)
  const save = useCallback(async () => {
    if (!accountId) {
      setError('Account ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validaciones básicas
      if (!formData.title?.trim()) throw new Error('El título es requerido');
      if (!formData.price || formData.price <= 0) throw new Error('El precio debe ser mayor a 0');
      if (!formData.city?.trim()) throw new Error('La ciudad es requerida');
      if (!formData.state?.trim()) throw new Error('El estado es requerido');

      let result: Property;

      if (initialProperty?.id) {
        // Update
        result = await propertyService.update(accountId, initialProperty.id, formData as UpdatePropertyInput);
      } else {
        // Create
        result = await propertyService.create(accountId, {
          title: formData.title!,
          price: formData.price!,
          currency: formData.currency || 'MXN',
          operation: formData.operation || 'Venta',
          property_type: formData.property_type || 'Casa',
          city: formData.city!,
          state: formData.state || 'Querétaro',
        });

        // Actualizar con datos adicionales
        if (result.id) {
          result = await propertyService.update(accountId, result.id, formData as UpdatePropertyInput);
        }
      }

      setFormData(result);
      setHasChanges(false);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error saving property';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [formData, initialProperty?.id, accountId]);

  // Publish
  const publish = useCallback(async () => {
    if (!accountId || !initialProperty?.id) {
      setError('Property ID and Account ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await propertyService.publish(accountId, initialProperty.id);
      setFormData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error publishing property';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accountId, initialProperty?.id]);

  // Unpublish
  const unpublish = useCallback(async () => {
    if (!accountId || !initialProperty?.id) {
      setError('Property ID and Account ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await propertyService.unpublish(accountId, initialProperty.id);
      setFormData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error unpublishing property';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accountId, initialProperty?.id]);

  // Toggle featured
  const toggleFeatured = useCallback(async () => {
    if (!accountId || !initialProperty?.id) {
      setError('Property ID and Account ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await propertyService.toggleFeatured(accountId, initialProperty.id);
      setFormData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error toggling featured';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accountId, initialProperty?.id]);

  // Reset
  const reset = useCallback(() => {
    setFormData(
      initialProperty || {
        title: '',
        price: 0,
        currency: 'MXN',
        operation: 'Venta',
        property_type: 'Casa',
        city: '',
        state: 'Querétaro',
      }
    );
    setHasChanges(false);
    setError(null);
  }, [initialProperty]);

  return {
    formData: formData as Property,
    loading,
    error,
    hasChanges,
    updateField,
    updateFields,
    save,
    publish,
    unpublish,
    toggleFeatured,
    reset,
  };
}
