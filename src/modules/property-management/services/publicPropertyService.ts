// ════════════════════════════════════════════════════════════════
// Servicio PÚBLICO — lectura de propiedades publicadas (sin login)
// ════════════════════════════════════════════════════════════════
// Usado por la landing page pública. Depende de políticas RLS que
// permiten leer propiedades publicadas y sus agentes/instancia.

import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Property, Agent, Account } from '@/types/database';

export interface PublicPropertyData {
  property: Property;
  account: Account | null;
  agents: Agent[];
}

// cache(): evita doble fetch entre generateMetadata y el render de la página
export const getPublicPropertyBySlug = cache(
  async (slug: string): Promise<PublicPropertyData | null> => {
    const supabase = createServerSupabaseClient();

    // Busca por slug primero, luego por id (fallback para props importadas sin slug)
    let { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!property) {
      const { data: byId } = await supabase
        .from('properties')
        .select('*')
        .eq('id', slug)
        .single();
      property = byId;
    }

    if (!property) return null;
    const prop = property as Property;

    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', prop.account_id)
      .single();

    let agents: Agent[] = [];
    if (prop.assigned_agents && prop.assigned_agents.length > 0) {
      const { data: ag } = await supabase
        .from('agents')
        .select('*')
        .in('id', prop.assigned_agents);
      agents = (ag ?? []) as Agent[];
    }

    return { property: prop, account: (account ?? null) as Account | null, agents };
  }
);
