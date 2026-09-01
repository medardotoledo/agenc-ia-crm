export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/properties/[id]/pdf
 * Genera y devuelve la ficha técnica PDF de una propiedad.
 *
 * Query params:
 *   ?agentId=<uuid>   → muestra solo ese agente (uso: panel admin)
 *   (sin agentId)     → muestra todos los agentes asignados (uso: landing pública)
 */

import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { PropertyPDF } from '@/modules/property-management/components/pdf/PropertyPDF';
import type { Property, Account, Agent } from '@/types/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const { id: propertyId } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Buscar propiedad (por slug o id)
    let { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('slug', propertyId)
      .maybeSingle();

    if (!property) {
      const { data: byId } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();
      property = byId;
    }

    if (!property) {
      return Response.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    // 2. Cuenta (para branding)
    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, logo_url, brand_primary, brand_accent, tagline')
      .eq('id', property.account_id)
      .maybeSingle();

    // 3. Agentes asignados
    const assignedAgentIds: string[] = property.assigned_agents ?? [];

    let agents: Agent[] = [];

    if (agentId) {
      // Solo el agente solicitado (validamos que esté asignado a esta propiedad)
      const targetId = assignedAgentIds.includes(agentId) ? agentId : agentId;
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();
      if (data) agents = [data];
    } else if (assignedAgentIds.length > 0) {
      // Todos los asignados
      const { data } = await supabase
        .from('agents')
        .select('*')
        .in('id', assignedAgentIds);
      agents = data ?? [];
    }

    // Si no hay agentes asignados, traer hasta 2 de la cuenta como fallback
    if (agents.length === 0) {
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('account_id', property.account_id)
        .limit(2);
      agents = data ?? [];
    }

    // 4. Generar PDF
    const pdfBuffer = await renderToBuffer(
      createElement(PropertyPDF, {
        property: property as Property,
        account: account as Account | null,
        agents,
      })
    );

    // 5. Nombre de archivo limpio
    const slug = (property.slug || property.id).replace(/[^a-zA-Z0-9-_]/g, '-');
    const filename = `ficha-${slug}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[/api/properties/[id]/pdf] Error:', err);
    return Response.json(
      { error: 'Error generando PDF', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
