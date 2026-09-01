/**
 * POST /api/agent/chat
 * Agente IA conversacional para búsqueda de propiedades.
 * Recibe historial de chat → devuelve respuesta + propiedades filtradas.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `Eres un buscador inteligente de propiedades en Querétaro, México. Ayudas a las personas a encontrar la propiedad ideal de forma conversacional.

REGLAS IMPORTANTES:
- Responde SIEMPRE en español, de forma natural y directa
- Escribe primero tu respuesta en texto normal, LUEGO el bloque técnico si aplica
- Respuestas cortas: máx 2-3 oraciones + una pregunta de seguimiento si necesitas más info
- NO te presentes como asistente ni chatbot, simplemente responde
- Si el usuario menciona zona/precio/tipo, muéstrale opciones de las propiedades disponibles

PROPIEDADES DISPONIBLES:
{{PROPERTIES_CONTEXT}}

CUANDO TENGAS SUFICIENTE INFO PARA FILTRAR, agrega este bloque AL FINAL (después de tu texto):
[FILTROS]{"operation":"Renta|Venta","property_type":"Casa|Departamento","city":"Querétaro|El Marqués","neighborhood":"La Pradera|Zákia|Palmares","min_price":0,"max_price":0,"bedrooms":0}[/FILTROS]

Usa null para campos que no se mencionaron. Omite el bloque si no hay suficiente info.
Si es momento de conectar con asesor, agrega al final: [LEAD]true[/LEAD]`;

export async function POST(request: Request) {
  try {
    const { messages, accountId } = await request.json();

    if (!accountId) {
      return Response.json({ error: 'accountId requerido' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY no configurado. Agrégalo a .env.local' },
        { status: 503 }
      );
    }

    // Cargar propiedades disponibles para dar contexto a Claude
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, operation, property_type, city, neighborhood, price, currency, bedrooms, bathrooms, construction_sqm')
      .eq('account_id', accountId)
      .eq('status', 'published')
      .limit(50);

    const propertiesContext = (properties || [])
      .map((p) =>
        `- ${p.title} | ${p.operation} | ${p.property_type} | ${p.city}${p.neighborhood ? ', ' + p.neighborhood : ''} | $${p.price?.toLocaleString('es-MX')} ${p.currency}${p.bedrooms ? ' | ' + p.bedrooms + ' rec' : ''}${p.bathrooms ? ', ' + p.bathrooms + ' baños' : ''}${p.construction_sqm ? ', ' + p.construction_sqm + ' m²' : ''}`
      )
      .join('\n');

    const systemWithContext = SYSTEM_PROMPT.replace('{{PROPERTIES_CONTEXT}}', propertiesContext || 'Sin propiedades disponibles aún.');

    // Llamar a Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemWithContext,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extraer filtros del bloque [FILTROS]...[/FILTROS]
    let filters = null;
    const filtersMatch = rawText.match(/\[FILTROS\]([\s\S]*?)\[\/FILTROS\]/);
    if (filtersMatch) {
      try {
        filters = JSON.parse(filtersMatch[1].trim());
      } catch {
        filters = null;
      }
    }

    // Extraer señal de captura de lead
    const captureLead = rawText.includes('[LEAD]true[/LEAD]');

    // Limpiar el texto de los bloques técnicos
    const cleanText = rawText
      .replace(/\[FILTROS\][\s\S]*?\[\/FILTROS\]/g, '')
      .replace(/\[LEAD\][\s\S]*?\[\/LEAD\]/g, '')
      .trim();

    // Log para debug
    console.log('[agent/chat] respuesta limpia:', cleanText.slice(0, 100));
    console.log('[agent/chat] filtros:', filters);

    // Si hay filtros, buscar propiedades que hagan match
    let matchedProperties: typeof properties = [];
    if (filters && properties) {
      matchedProperties = properties.filter((p) => {
        if (filters.operation && p.operation !== filters.operation) return false;
        if (filters.property_type && p.property_type !== filters.property_type) return false;
        if (filters.city && p.city !== filters.city) return false;
        if (filters.neighborhood && p.neighborhood !== filters.neighborhood) return false;
        if (filters.min_price && p.price < filters.min_price) return false;
        if (filters.max_price && p.price > filters.max_price) return false;
        if (filters.bedrooms && p.bedrooms < filters.bedrooms) return false;
        return true;
      });
    }

    return Response.json({
      message: cleanText,
      filters,
      properties: matchedProperties,
      captureLead,
    });
  } catch (error) {
    console.error('[/api/agent/chat]', error);
    return Response.json(
      { error: 'Error al procesar la consulta', details: String(error) },
      { status: 500 }
    );
  }
}
