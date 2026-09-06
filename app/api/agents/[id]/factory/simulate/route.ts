import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { rows: agentRows } = await pool.query('SELECT * FROM ai_agents WHERE id = $1 LIMIT 1;', [id]);
    if (!agentRows.length) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    const agent = agentRows[0];

    // Cargar documentos del Segundo Cerebro
    const { rows: brains } = await pool.query('SELECT * FROM ai_agent_brains WHERE agent_id = $1;', [id]);
    if (!brains.length) {
      return NextResponse.json({ error: 'El agente aún no tiene su Segundo Cerebro procesado. Ejecuta La Fábrica de Conocimiento primero.' }, { status: 400 });
    }

    const brainContext = brains.map((b: any) => `### ${b.title} (${b.file_slug})
${b.markdown_content}`).join('\n\n');

    let apiKey = '';
    if (agent.encrypted_api_key) apiKey = Buffer.from(agent.encrypted_api_key, 'base64').toString('utf8');
    const provider = agent.llm_provider || 'anthropic';
    const effectiveApiKey = apiKey || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY) || process.env.ANTHROPIC_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json({ error: 'Falta configurar la API Key de Anthropic o OpenAI.' }, { status: 400 });
    }

    const simPrompt = `Eres el Director de Pruebas del Gimnasio de Role-Playing de IA.
Vas a orquestar una sesión de Self-Play (Subagente Comprador Difícil vs. Agente Vendedor) para el agente "${agent.name}".

Debes simular EXACTAMENTE 3 escenarios de prueba realistas y desafiantes para WhatsApp:
1. Escenario 1: Objeción de precio / Comparación con producto barato en internet (Amazon/MercadoLibre).
2. Escenario 2: Desconfianza o miedo a la instalación/dificultad técnica.
3. Escenario 3: Cliente indeciso que dice "lo voy a pensar" o "mándame info por correo".

Para cada escenario:
- El "Comprador" lanza el reto de forma natural.
- El "Agente" responde aplicando la FÓRMULA HÍBRIDA: Empatía Voss + Mecanismo Técnico Real + Future Pacing + Micro-CTA (pregunta abierta).

Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "simulations": [
    {
      "scenario_name": "Objeción de Precio vs. Marketplace",
      "buyer_persona": "Comprador Escéptico",
      "dialogue": [
        { "sender": "buyer", "text": "Oye, pero vi uno casi igual en Amazon que cuesta la mitad..." },
        { "sender": "agent", "text": "Entiendo perfecto tu punto Carlos..." }
      ],
      "score": 95,
      "feedback_notes": "Defendió el mecanismo técnico de 4 etapas sin confrontar y usó etiqueta táctica."
    }
  ]
}

Contexto del Segundo Cerebro del Agente:
${brainContext}`;

    let simResults: any = null;

    if (provider === 'anthropic' || effectiveApiKey.startsWith('sk-ant-')) {
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

    // Borrar simulaciones anteriores pendientes y guardar las nuevas
    await pool.query("DELETE FROM ai_agent_simulations WHERE agent_id = $1 AND status = 'pending_review';", [id]);

    const createdSims: any[] = [];
    const simsList = simResults.simulations || [];
    for (const sim of simsList) {
      const { rows } = await pool.query(`
        INSERT INTO ai_agent_simulations (agent_id, scenario_name, buyer_persona, dialogue, status, feedback_notes, score)
        VALUES ($1, $2, $3, $4, 'pending_review', $5, $6)
        RETURNING *;
      `, [id, sim.scenario_name, sim.buyer_persona, JSON.stringify(sim.dialogue), sim.feedback_notes || '', sim.score || 90]);
      createdSims.push(rows[0]);
    }

    return NextResponse.json({ success: true, simulations: createdSims });
  } catch (err: any) {
    console.error('[Factory Simulate] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
