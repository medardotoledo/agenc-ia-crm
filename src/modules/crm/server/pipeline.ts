/**
 * Helper de servidor (service role): asegura que una cuenta tenga un
 * pipeline por defecto + sus 5 etapas estándar. Idempotente.
 * Se llama al activar el módulo CRM en una subcuenta.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const STAGES: Array<[string, number, boolean, boolean]> = [
  ['Nuevo', 0, false, false],
  ['Contactado', 1, false, false],
  ['Propuesta', 2, false, false],
  ['Cierre', 3, true, false],
  ['Perdido', 4, false, true],
];

export async function ensureDefaultPipeline(svc: SupabaseClient, accountId: string): Promise<string | null> {
  // ¿Ya tiene pipeline por defecto?
  const { data: existing } = await svc
    .from('pipelines')
    .select('id')
    .eq('account_id', accountId)
    .eq('is_default', true)
    .maybeSingle();

  let pipelineId = existing?.id as string | undefined;

  if (!pipelineId) {
    const { data, error } = await svc
      .from('pipelines')
      .insert({ account_id: accountId, name: 'Ventas', is_default: true })
      .select('id')
      .single();
    if (error) throw error;
    pipelineId = data.id as string;
  }

  // Crear etapas solo si el pipeline no tiene.
  const { data: stages } = await svc.from('stages').select('id').eq('pipeline_id', pipelineId);
  if (!stages || stages.length === 0) {
    const rows = STAGES.map(([name, position, is_won, is_lost]) => ({
      account_id: accountId,
      pipeline_id: pipelineId,
      name,
      position,
      is_won,
      is_lost,
    }));
    const { error } = await svc.from('stages').insert(rows);
    if (error) throw error;
  }

  return pipelineId;
}
