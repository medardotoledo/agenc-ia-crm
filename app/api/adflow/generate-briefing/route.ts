import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      productName,
      irresistibleOffer,
      targetTriggers,
      shortDescription,
      priceRange,
      agentName,
      additionalContext,
    } = body;

    const systemPrompt = `Eres un copywriter publicitario de élite y estratega de medios senior, especializado en anuncios de alta conversión para Meta Ads (Facebook/Instagram), TikTok y Google Ads.
Tu misión es tomar los datos de un producto/servicio, su Oferta Irresistible y los dolores de su avatar, y redactar una campaña publicitaria irresistible y los prompts visuales para generar imágenes.

DATOS DEL PRODUCTO:
- Nombre del Producto: ${productName || 'Producto/Servicio'}
- Oferta Irresistible (Promesa, Garantía, Urgencia): ${irresistibleOffer || 'No especificada'}
- Gatillos y Dolores del Avatar: ${targetTriggers || 'No especificados'}
- Descripción breve: ${shortDescription || 'No especificada'}
- Rango de Precio: ${priceRange || 'No especificado'}
- Agente de atención asignado: ${agentName || 'Setter Comercial'}
${additionalContext ? `- Contexto adicional:\n${additionalContext}` : ''}

INSTRUCCIONES DE GENERACIÓN:
1. **single_headline**: Titular corto, magnético y de alto impacto (máx. 55 caracteres).
2. **single_body**: Texto persuasivo para el cuerpo del anuncio usando la fórmula AIDA (Atención, Interés, Deseo, Acción) con emojis profesionales.
3. **single_cta**: Llamado a la acción recomendado (ej. "Enviar WhatsApp", "Registrarte", "Más información").
4. **suggested_interests**: Lista de 5 a 8 intereses/hashtags sugeridos para Meta y TikTok (ej. ["#BienesRaices", "Inversionistas", "Arquitectura"]).
5. **prompt_1_1**: Prompt detallado y fotorrealista para generar una imagen cuadrada 1:1 (ideal para Feed de Instagram/Facebook).
6. **prompt_9_16**: Prompt detallado para generar una imagen o escena vertical 9:16 (ideal para Stories, Reels y TikTok Ads).
7. **prompt_16_9**: Prompt detallado para generar una imagen horizontal 16:9 (ideal para Google Display y YouTube).

REGLAS ESTRICTAS:
- Devuelve EXCLUSIVAMENTE un objeto JSON válido sin bloques markdown \`\`\`json.
- Estructura exacta requerida:
{
  "single_headline": "string",
  "single_body": "string",
  "single_cta": "string",
  "suggested_interests": ["string"],
  "prompt_1_1": "string",
  "prompt_9_16": "string",
  "prompt_16_9": "string"
}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fallback inteligente estructurado si aún no hay API key en el entorno
      return NextResponse.json({
        single_headline: `Descubre ${productName || 'tu próxima oportunidad'}`,
        single_body: `¿Cansado de buscar sin encontrar la opción ideal? 🔥\n\nConoce ${productName || 'nuestra propuesta exclusiva'}: ${shortDescription || 'diseñada para darte los mejores resultados'}.\n\n✅ ${irresistibleOffer || 'Garantía y beneficios exclusivos por tiempo limitado'}.\n\n👉 Da clic abajo y habla en directo con ${agentName || 'nuestro asesor'} por WhatsApp.`,
        single_cta: 'Enviar WhatsApp',
        suggested_interests: ['#Inversiones', '#Oportunidad', '#Exclusivo', '#Ventas'],
        prompt_1_1: `Fotografía publicitaria profesional y elegante de ${productName || 'producto premium'}, iluminación cinemática suave, composición centrada, estilo contemporáneo de alta gama 8k.`,
        prompt_9_16: `Escena vertical cinematográfica para Stories mostrando estilo de vida aspiracional y ${productName || 'servicio exclusivo'}, luz natural dorada, estética moderna de alta conversión.`,
        prompt_16_9: `Composición horizontal arquitectónica y limpia de ${productName || 'espacio comercial'}, estilo minimalista corporativo con espacio negativo para texto publicitario.`,
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1800,
        messages: [{ role: 'user', content: systemPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[AdFlow Briefing] Falló Claude (${response.status}): ${errText}`);
      throw new Error(`Error de Claude: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.content?.[0]?.text || '{}';
    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('[API AdFlow Generate Briefing] Error:', err.message);
    return NextResponse.json(
      {
        error: err.message,
        single_headline: 'Oportunidad Exclusiva',
        single_body: 'Conoce los detalles de esta increíble propuesta. Habla directamente con nuestro asesor.',
        single_cta: 'Enviar WhatsApp',
        suggested_interests: ['#Negocios', '#Inversiones'],
        prompt_1_1: 'Fotografía publicitaria comercial moderna de alta definición.',
        prompt_9_16: 'Escena publicitaria vertical para móvil en alta resolución.',
        prompt_16_9: 'Composición panorámica moderna para anuncios digitales.',
      },
      { status: 200 }
    );
  }
}
