// ════════════════════════════════════════════════════════════════
// CATÁLOGO MÉXICO — lectura de estados y ciudades
// ════════════════════════════════════════════════════════════════
// Datos de referencia globales (tablas mx_states / mx_cities).

import { createBrowserSupabaseClient } from '@/lib/supabase';

export interface MxState {
  id: number;
  name: string;
  code: string | null;
}

export interface MxCity {
  id: number;
  state_id: number;
  name: string;
}

export async function getStates(): Promise<MxState[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('mx_states')
    .select('id,name,code')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as MxState[];
}

export async function getCitiesByState(stateId: number): Promise<MxCity[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('mx_cities')
    .select('id,state_id,name')
    .eq('state_id', stateId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as MxCity[];
}
