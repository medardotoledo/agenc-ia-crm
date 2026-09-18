import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getEffectiveApiKey(agentAccountId: string, agentProvider: string) {
  const { rows: keyRows } = await pool.query(`
    SELECT gemini_key, anthropic_key, openai_key FROM account_ai_keys 
    WHERE account_id = $1 OR account_id = 'OS9czz85LUvBeljk8FEv' OR account_id = 'default'
    ORDER BY CASE WHEN account_id = $1 THEN 1 WHEN account_id = 'OS9czz85LUvBeljk8FEv' THEN 2 ELSE 3 END 
    LIMIT 1;
  `, [agentAccountId || 'OS9czz85LUvBeljk8FEv']);
  const accountKeys = keyRows[0] || {};

  const provider = agentProvider || 'google';
  const apiKey = (
    provider === 'google'
      ? (accountKeys.gemini_key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
      : provider === 'anthropic'
      ? (accountKeys.anthropic_key || process.env.ANTHROPIC_API_KEY)
      : (accountKeys.openai_key || process.env.OPENAI_API_KEY)
  ) || '';

  return { provider, apiKey };
}

async function callLLM(provider: string, apiKey: string, model: string, prompt: string, expectJson = true): Promise<string> {
  if (!apiKey) throw new Error(`Falta configurar la API Key para ${provider.toUpperCase()} en Configuración.`);

  if (provider === 'google') {
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      model && !model.startsWith('gemini-2') && !model.startsWith('gemini-1') ? model : 'gemini-3.6-flash',
      'gemini-3.5-flash',
    ];
    const modelsToTry = Array.from(new Set(candidateModels));
    let lastError = '';

    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: expectJson ? { responseMimeType: 'application/json' } : {},
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error?.message || `Status ${res.status} on ${m}`;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }
    throw new Error(lastError || 'Falla llamando a Google Gemini');
  } else if (provider === 'anthropic' || apiKey.startsWith('sk-ant-')) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error('Error en Anthropic API');
    const data = await res.json();
    return data.content?.[0]?.text || '';
  } else {
    // OpenAI
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        ...(expectJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error('Error en OpenAI API');
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

/**
 * GET: Obtiene el estado actual de la entrevista de oferta y el market intelligence
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { productId } = await params;
    const { rows } = await pool.query(
      'SELECT id, name, market_intel_data, offer_interview_data, irresistible_offer, knowledge_sheet FROM ai_agent_products WHERE id = $1 LIMIT 1;',
      [productId]
    );
    if (!rows.length) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    const prod = rows[0];
    const marketIntelReady = Boolean(prod.market_intel_data && prod.market_intel_data.questions);

    return NextResponse.json({
      success: true,
      marketIntelReady,
      market_intel_data: prod.market_intel_data || null,
      offer_interview_data: prod.offer_interview_data || null,
      irresistible_offer: prod.irresistible_offer || null,
      has_knowledge_sheet: Boolean(prod.knowledge_sheet),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Ejecuta Fase 1 (process_base) o Fase 2 (synthesize_offer)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params;
    const body = await req.json();
    const { action } = body; // 'process_base' | 'synthesize_offer'

    // 1. Obtener producto y agente
    const { rows: prodRows } = await pool.query(
      'SELECT * FROM ai_agent_products WHERE id = $1 LIMIT 1;',
      [productId]
    );
    if (!prodRows.length) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    const product = prodRows[0];

    const { rows: agentRows } = await pool.query('SELECT * FROM ai_agents WHERE id = $1 LIMIT 1;', [id]);
    if (!agentRows.length) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    const agent = agentRows[0];

    // 2. Obtener documentos de estudio
    const { rows: files } = await pool.query(
      'SELECT * FROM ai_agent_knowledge WHERE product_id = $1 AND folder = \'material_estudio\' ORDER BY created_at ASC;',
      [productId]
    );
    const studySummary = files
      .map((f, i) => `[Doc ${i + 1}: ${f.file_name}]
${f.content_text || '(Documento analizado)'}`)
      .join('\n\n');

    // 3. Credenciales del LLM
    const { provider, apiKey } = await getEffectiveApiKey(agent.account_id, agent.llm_provider);

    // ══════════════════════════════════════════════════════════════════════════
    // FASE 1: PROCESAR INFORMACIÓN BASE (Market Intelligence & Avatar Ocultos)
    // ══════════════════════════════════════════════════════════════════════════
    if (action === 'process_base') {
      const prompt = `Eres el Director de Estrategia Comercial y Neuro-Marketing de un CRM Agentico de Élite.
Tu misión es procesar en segundo plano la información base y documentos de un servicio/producto, para deducir de forma sintética:
1. Las intenciones de búsqueda reales y dudas del mercado (Market Intelligence).
2. Los puntos débiles, quejas comunes y vacíos de la competencia en este nicho.
3. El perfil psicológico profundo del Avatar (dolores viscerales, miedos ocultos, pesadillas y deseos de transformación).
4. Generar exactamente 3 a 4 PREGUNTAS DE ENTREVISTA CONTEXTUALES para hacerle al dueño del negocio, diseñadas específicamente para extraer su "Oferta Irresistible" (Diferenciadores reales, extras tipo efecto Starbucks, garantías y ganchos de entrada).

Datos del Servicio:
- Nombre: "${product.name}"
- Descripción: "${product.short_description || 'Sin descripción'}"
- Disparadores / Triggers: "${product.target_triggers || 'Consultas generales'}"
- Rango de Precio: "${product.price_range || 'A consultar'}"

Documentos de Estudio aportados por el negocio:
${studySummary || 'No hay documentos adicionales; usa el nombre, descripción y nicho del producto.'}

Debes responder ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "niche_summary": "Breve resumen del nicho y ángulo de mercado detectado",
  "search_intent_keywords": [
    "Ejemplo de búsqueda 1 que la gente hace con dolor o urgencia",
    "Ejemplo de búsqueda 2",
    "Ejemplo de búsqueda 3",
    "Ejemplo de búsqueda 4"
  ],
  "competitor_blindspots": [
    "Queja o vacío típico de la competencia 1 (ej. tiempos de espera, precios ocultos, dolor en el procedimiento)",
    "Queja o vacío típico 2"
  ],
  "avatar_deep_profile": {
    "core_emotional_pain": "Qué le duele emocionalmente en el día a día",
    "worst_fear_or_nightmare": "Cuál es su mayor miedo o pesadilla al contratar este servicio",
    "secret_hesitation": "Por qué suele dudar o posponer su decisión",
    "desired_outcome": "La transformación final que realmente busca"
  },
  "questions": [
    {
      "id": 1,
      "category": "diferenciador",
      "title": "¿Por qué un cliente debería elegirte a ti y no a tu competencia?",
      "contextual_prompt": "Pregunta personalizada con contexto de su negocio (ej: 'Vemos que en ${product.name} se enfocan en calidad. Cuando un paciente evalúa opciones en su zona, ¿cuál es esa razón principal por la que deben atenderse con ustedes y no con otra clínica?')"
    },
    {
      "id": 2,
      "category": "efecto_starbucks",
      "title": "El Efecto Starbucks: ¿Qué extras, tecnología o experiencia se llevan?",
      "contextual_prompt": "Pregunta personalizada sobre el valor agregado sin costo extra (ej: 'En Starbucks pagas por el entorno y no solo por el café. En ${product.name}, ¿qué tecnología, atención, comodidades o seguimiento se lleva el cliente que la competencia no le da?')"
    },
    {
      "id": 3,
      "category": "eliminador_riesgo",
      "title": "Garantía y Tranquilidad: ¿Cómo eliminas el miedo o la desconfianza?",
      "contextual_prompt": "Pregunta sobre garantías (ej: 'Para alguien que ha tenido malas experiencias previas o tiene miedo de pagar, ¿qué garantía, respaldo o certeza por escrito le ofreces para que sienta que no arriesga nada?')"
    },
    {
      "id": 4,
      "category": "gancho_entrada",
      "title": "El Primer Paso Fácil: ¿Cuál es la oferta o gancho para agendar ya?",
      "contextual_prompt": "Pregunta sobre el llamado a la acción inicial (ej: '¿Cuál es el primer paso accesible que le propones a un prospecto nuevo en WhatsApp para que diga Sí de inmediato? (ej. Valoración con escaneo a precio especial, cortesía si inician, etc.)')"
    }
  ]
}
`;

      const rawJson = await callLLM(provider, apiKey, agent.llm_model, prompt, true);
      const cleanJson = rawJson.replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '').trim();
      const marketIntelData = JSON.parse(cleanJson);

      await pool.query(
        'UPDATE ai_agent_products SET market_intel_data = $1, updated_at = NOW() WHERE id = $2;',
        [JSON.stringify(marketIntelData), productId]
      );

      return NextResponse.json({
        success: true,
        action: 'process_base',
        marketIntelReady: true,
        market_intel_data: marketIntelData,
        questions: marketIntelData.questions || [],
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FASE 2: EMPAQUETAR OFERTA IRRESISTIBLE & BLINDAR CON DISC + BRIAN TRACY
    // ══════════════════════════════════════════════════════════════════════════
    if (action === 'synthesize_offer') {
      const { answers, rawOfferText } = body;
      const marketIntel = product.market_intel_data || {};

      const prompt = `Eres el Arquitecto Supremo de Ofertas de Alex Hormozi ($100M Offers) y Maestro en Ventas Consultivas (Brian Tracy) y Psicología DISC.
Tu misión es tomar las respuestas de la entrevista del cliente y empaquetar una OFERTA IRRESISTIBLE perfecta, integrando:
1. La Oferta Irresistible (Nombre de Alto Valor, Value Stack con bonos, garantía cero riesgo y llamado a la acción).
2. Diccionario de Botones Mentales (Neuro-Semántica: Palabras Prohibidas que generan dolor/fricción vs Palabras de Inversión y Alivio).
3. Tácticas de Venta Consultiva de Brian Tracy: Preguntas de diagnóstico ("El doctor de las ventas") y Cierre por Alternativa.
4. Matriz de Adaptación DISC en Tiempo Real (Cómo modular la oferta para perfiles Rojo, Amarillo, Verde y Azul).
5. La Ficha de Conocimiento Completa en Markdown lista para la memoria del agente de WhatsApp.

Contexto del Producto:
- Nombre: "${product.name}"
- Descripción: "${product.short_description || ''}"
- Rango de Inversión: "${product.price_range || ''}"
- Market Intelligence Previos: ${JSON.stringify(marketIntel.avatar_deep_profile || {})}

Respuestas del Cliente a la Entrevista (Transcripción / Documento / Texto):
${rawOfferText || JSON.stringify(answers || 'El cliente busca ofrecer el mejor servicio con respaldo y tecnología.')}

Debes responder ÚNICAMENTE con un JSON válido con esta estructura:
{
  "irresistible_offer_summary": "Resumen ejecutivo de la oferta irresistible empaquetada (Alex Hormozi style: Nombre, qué incluye, bono y garantía)",
  "buttons_dictionary": {
    "forbidden_words": ["costo", "gasto", "pagar", "cuota", "cobro", "sacrificio"],
    "power_words": ["inversión", "garantía", "resultado", "tu nueva sonrisa", "acompañamiento", "tecnología"],
    "controlled_pain_triggers": ["evitar complicaciones mayores", "prevenir infecciones silenciosas", "ahorrarte procedimientos invasivos"]
  },
  "brian_tracy_tactics": {
    "diagnostic_question": "¿Qué pregunta hace el agente antes de recetar o dar precio?",
    "alternative_close": "¿Cómo cierra dando 2 opciones de horario sin dar opción a decir 'no'?",
    "porcupine_close": "¿Cómo responde cuando el cliente pide facilidades o descuentos devolviendo el cierre?"
  },
  "disc_matrix": {
    "rojo_d": "Cómo presentar la oferta al Rojo: Directo, resultados rápidos, máximo 2 oraciones, tú decides.",
    "amarillo_i": "Cómo presentar la oferta al Amarillo: Entusiasta, estético, cómo se verá, validación social.",
    "verde_s": "Cómo presentar la oferta al Verde: Cálido, paso a paso, cero dolor, garantías por escrito, sin prisa.",
    "azul_c": "Cómo presentar la oferta al Azul: Datos técnicos, materiales, certificados, proceso clínico exacto."
  },
  "knowledge_sheet_markdown": "# Ficha de Conocimiento: ${product.name}\n\n(Markdown exhaustivo y completo con la oferta empaquetada, botones mentales, reglas DISC y Brian Tracy para que el agente la use en WhatsApp)"
}
`;

      const rawJson = await callLLM(provider, apiKey, agent.llm_model, prompt, true);
      const cleanJson = rawJson.replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '').trim();
      const synthesizedData = JSON.parse(cleanJson);

      const offerSummary = synthesizedData.irresistible_offer_summary || '';
      const knowledgeSheet = synthesizedData.knowledge_sheet_markdown || '';

      // Actualizar producto
      const { rows: updatedRows } = await pool.query(`
        UPDATE ai_agent_products 
        SET 
          irresistible_offer = $1,
          offer_interview_data = $2,
          knowledge_sheet = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *;
      `, [offerSummary, JSON.stringify(synthesizedData), knowledgeSheet, productId]);

      // Sincronizar también con el Segundo Cerebro del Agente (05-oferta-y-plan-storybrand)
      const brainDocContent = `# 05. Oferta Irresistible y Plan Comercial
## Producto: ${product.name}
${offerSummary}

### Diccionario de Botones Mentales (Neuro-Semántica)
- **Palabras Prohibidas (Fricción):** ${(synthesizedData.buttons_dictionary?.forbidden_words || []).join(', ')}
- **Palabras de Poder (Valor):** ${(synthesizedData.buttons_dictionary?.power_words || []).join(', ')}
- **Gatillos de Dolor Controlado:** ${(synthesizedData.buttons_dictionary?.controlled_pain_triggers || []).join(', ')}

### Tácticas de Venta Consultiva Brian Tracy
- **Pregunta de Diagnóstico:** ${synthesizedData.brian_tracy_tactics?.diagnostic_question || ''}
- **Cierre por Alternativa:** ${synthesizedData.brian_tracy_tactics?.alternative_close || ''}
- **Cierre Puercoespín:** ${synthesizedData.brian_tracy_tactics?.porcupine_close || ''}

### Modulación DISC por Color
- **Rojo (D):** ${synthesizedData.disc_matrix?.rojo_d || ''}
- **Amarillo (I):** ${synthesizedData.disc_matrix?.amarillo_i || ''}
- **Verde (S):** ${synthesizedData.disc_matrix?.verde_s || ''}
- **Azul (C):** ${synthesizedData.disc_matrix?.azul_c || ''}

${knowledgeSheet}
`;

      await pool.query(`
        INSERT INTO ai_agent_brains (agent_id, file_slug, title, markdown_content, updated_at)
        VALUES ($1, '05-oferta-y-plan-storybrand', 'Oferta Irresistible y Plan Comercial', $2, NOW())
        ON CONFLICT (agent_id, file_slug)
        DO UPDATE SET markdown_content = EXCLUDED.markdown_content, version = ai_agent_brains.version + 1, updated_at = NOW();
      `, [id, brainDocContent]);

      return NextResponse.json({
        success: true,
        action: 'synthesize_offer',
        product: updatedRows[0],
        irresistible_offer: offerSummary,
        knowledge_sheet: knowledgeSheet,
        synthesized_data: synthesizedData,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    console.error('[Offer Interview POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
