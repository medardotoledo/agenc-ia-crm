// Servicio de etapas del pipeline (por subcuenta).
// Las 5 etapas son fijas en estructura; aquí solo se RENOMBRAN.
import { createBrowserSupabaseClient } from '@/lib/supabase';

export interface StageRow {
  id: string;
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

export const stagesService = {
  async list(accountId: string): Promise<StageRow[]> {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('stages')
      .select('id, name, position, is_won, is_lost')
      .eq('account_id', accountId)
      .order('position');
    if (error) throw error;
    return (data ?? []) as StageRow[];
  },

  async rename(stageId: string, name: string): Promise<void> {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from('stages').update({ name }).eq('id', stageId);
    if (error) throw error;
  },
};
