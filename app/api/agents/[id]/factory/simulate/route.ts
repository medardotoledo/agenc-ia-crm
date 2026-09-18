import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { scenario } = body;

    const { rows: agentRows } = await pool.query('SELECT * FROM ai_agents WHERE id = $1 LIMIT 1;', [id]);
    if (!agentRows.length) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }
    const agent = agentRows[0];

    const { rows: brainDocs } = await pool.query(
      'SELECT * FROM ai_agent_brains WHERE agent_id = $1 ORDER BY file_slug ASC;',
      [id]
    );

    const brainContext = brainDocs.map((b: any) => `### ${b.title}\n${b.markdown_content}`).join('\n\n');

    const { rows: keyRows } = await pool.query(`
      SELECT gemini_key, anthropic_key, openai_key FROM account_ai_keys 
      WHERE account_id = $1 OR account_id = 'OS9czz85LUvBeljk8FEv' OR account_id = 'default'
      ORDER BY CASE WHEN account_id = $1 THEN 1 WHEN account_id = 'OS9czz85LUvBeljk8FEv' THEN 2 ELSE 3 END 
      LIMIT 1;
    `, [agent.account_id || 'OS9czz85LUvBeljk8FEv']);
    const accountKeys = keyRows[0] || {};

    const provider = agent.llm_provider || 'google';
    const effectiveApiKey = (
      provider === 'google'
        ? (accountKeys.gemini_key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
        : provider === 'anthropic'
        ? (accountKeys.anthropic_key || process.env.ANTHROPIC_API_KEY)
        : (accountKeys.openai_key || process.env.OPENAI_API_KEY)
    ) || (agent.encrypted_api_key ? Buffer.from(agent.encrypted_api_key, 'base64').toString('utf8') : '');

    if (!effectiveApiKey) {
      return NextResponse.json({
        error: `Falta configurar la API Key para ${provider.toUpperCase()}. Puedes ingresarla en Configuración (/admin/settings).`,
      }, { status: 400 });
    }

    const { rows: products } = await pool.query(
      'SELECT name, short_description, price_range, irresistible_offer FROM ai_agent_products WHERE agent_id = $1 ORDER BY display_order ASC;',
      [id]
    );

    const productsContext = products.map((p: any, idx: number) => 
      `- Servicio ${idx + 1}: "${p.name}". Descripción: ${p.short_description || ''}. Rango Inversión: ${p.price_range || ''}. Oferta: ${p.irresistible_offer || ''}`
    ).join('\n');

    const sampleProduct = products.length > 0 
      ? products[Math.floor(Math.random() * products.length)].name 
      : 'sus servicios dentales y tratamientos';

    const defaultScenarios = [
      {
        name: 'Entrada por Anuncio / Información General',
        prompt: `El cliente vio un anuncio en redes sociales de ${agent.name} / la clínica y escribe con una pregunta típica de apertura: "Hola, buenas tardes, vi su anuncio en redes sociales, ¿de qué se trata o qué servicios manejan?"`
      },
      {
        name: `Interés en Servicio Específico (${sampleProduct})`,
        prompt: `El cliente escribe interesado en un servicio específico del catálogo ("${sampleProduct}"): "Hola, vi que ofrecen ${sampleProduct}, ¿me podrían dar información de cómo funciona, qué incluye y cuál es el procedimiento?"`
      },
      {
        name: 'Miedo al Dolor / Validación Emocional',
        prompt: 'El cliente necesita atención pero tiene miedo o desconfianza por malas experiencias previas: "Hola, me interesa atenderme pero la verdad le tengo pavor al dentista y al dolor. ¿Cómo garantizan que con ustedes no voy a sentir dolor?"'
      },
      {
        name: 'Objeción de Precio y Facilidades de Pago',
        prompt: 'El cliente pregunta por costos, promociones y formas de pago: "Hola, me interesa atenderme con ustedes pero quiero saber si tienen facilidades de pago o mensualidades, porque en otros lugares me parece muy costoso."'
      },
      {
        name: 'Cierre y Agendamiento de Cita',
        prompt: 'El cliente ya está convencido y pide fecha para acudir: "Hola, quiero agendar una cita de valoración esta semana para mí o mi familia, ¿qué días y horarios tienen disponibles en sus sucursales?"'
      }
    ];

    const chosenScenario = scenario 
      ? { name: scenario, prompt: scenario }
      : defaultScenarios[Math.floor(Math.random() * defaultScenarios.length)];

    const simPrompt = `Eres el Entrenador en Jefe y Sparring Partner de IA para Ventas y Servicio de Élite.
Tu objetivo es simular un COMBATE DE ENTRENAMIENTO REALISTA Y MULTI-TURNO (Self-Play) entre:
1. Prospecto / Comprador de WhatsApp: Una persona real con dudas, curiosidad o una necesidad concreta.
2. Agente en Entrenamiento: "${agent.name}" (Rol: ${agent.role}), quien debe responder usando estrictamente el Segundo Cerebro, las Ofertas Irresistibles de los productos y venta consultiva (Brian Tracy, Chris Voss, Hormozi, DISC).

Escenario específico a simular:
"${chosenScenario.prompt}"

REGLA CRUCIAL DE REALISMO:
- NO simules una sola pregunta y una sola respuesta.
- Debe ser una CONVERSACIÓN COMPLETA Y REALISTA de 4 a 6 turnos (2 a 3 intervenciones de cada uno) simulando un chat fluido de WhatsApp:
  * Turno 1 (buyer): El cliente inicia según el escenario planteado.
  * Turno 2 (agent): El agente saluda con calidez humana, responde con alto valor/mecanismo único y hace una pregunta de diagnóstico.
  * Turno 3 (buyer): El cliente responde al diagnóstico o plantea una duda de seguimiento (sucursales, horarios, tecnología, etc.).
  * Turno 4 (agent): El agente responde resolviendo la duda, da certeza y propone un micro-compromiso o cierre por alternativa.
  * Turno 5 (buyer, opcional): El cliente muestra acuerdo o pide confirmar el horario.
  * Turno 6 (agent, opcional): El agente confirma y deja el siguiente paso claro.

Debes devolver ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "simulations": [
    {
      "scenario_name": "${chosenScenario.name}",
      "buyer_persona": "Prospecto Real en WhatsApp",
      "dialogue": [
        { "sender": "buyer", "text": "Mensaje del cliente..." },
        { "sender": "agent", "text": "Respuesta de ${agent.name}..." },
        { "sender": "buyer", "text": "Siguiente mensaje del cliente..." },
        { "sender": "agent", "text": "Siguiente respuesta de ${agent.name}..." }
      ],
      "score": 95,
      "feedback_notes": "Explicación de aciertos técnicos, manejo de objeción o cierre consultivo."
    }
  ]
}

Catálogo de Productos del Negocio:
${productsContext || 'Sin productos específicos registrados aún.'}

Contexto del Segundo Cerebro del Agente:
${brainContext || 'Usa respuestas asertivas, datos técnicos duros y empatía.'}`;

    let simResults: any = null;

    if (provider === 'google') {
      const candidateModels = [
        'gemini-3.6-flash',
        'gemini-flash-lite-latest',
        agent.llm_model && !agent.llm_model.startsWith('gemini-2') && !agent.llm_model.startsWith('gemini-1') ? agent.llm_model : 'gemini-3.6-flash',
        'gemini-3.5-flash',
      ];
      const modelsToTry = Array.from(new Set(candidateModels));

      let lastError = '';
      for (const mName of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${effectiveApiKey}`;
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: simPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          });
          if (response.ok) {
            const resJson = await response.json();
            simResults = JSON.parse(resJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
            if (simResults) break;
          } else {
            const errData = await response.json().catch(() => ({}));
            lastError = errData.error?.message || `Error (${response.status}) en ${mName}`;
          }
        } catch (mErr: any) {
          lastError = mErr.message;
        }
      }

      if (!simResults) {
        throw new Error(lastError || 'Error en simulación con Google Gemini');
      }
    } else if (provider === 'anthropic' || effectiveApiKey.startsWith('sk-ant-')) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': effectiveApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.llm_model || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [{ role: 'user', content: simPrompt }],
        }),
      });

      if (!response.ok) throw new Error('Error en llamada a Anthropic');
      const resJson = await response.json();
      const rawText = resJson.content?.[0]?.text || '';
      const cleanJson = rawText.replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '').trim();
      simResults = JSON.parse(cleanJson);
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.llm_model || 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: simPrompt }],
        }),
      });

      if (!response.ok) throw new Error('Error en llamada a OpenAI');
      const resJson = await response.json();
      simResults = JSON.parse(resJson.choices?.[0]?.message?.content || '{}');
    }

    await pool.query("DELETE FROM ai_agent_simulations WHERE agent_id = $1 AND status = 'pending_review';", [id]);

    const createdSims: any[] = [];
    const simsList = simResults.simulations || [];
    for (const sim of simsList) {
      const { rows } = await pool.query(`
        INSERT INTO ai_agent_simulations (agent_id, scenario_name, buyer_persona, dialogue, status, feedback_notes, score)
        VALUES ($1, $2, $3, $4, 'pending_review', $5, $6)
        RETURNING *;
      `, [
        id,
        sim.scenario_name || 'Combate Simulado',
        sim.buyer_persona || 'Comprador Escéptico',
        JSON.stringify(sim.dialogue || []),
        sim.feedback_notes || 'Revisión recomendada',
        sim.score || 90,
      ]);
      createdSims.push(rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: 'Combate de entrenamiento generado.',
      simulations: createdSims,
    });
  } catch (err: any) {
    console.error('[Factory Simulate] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
