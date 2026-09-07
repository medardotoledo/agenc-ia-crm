import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { rawVoiceText } = body;

    if (!rawVoiceText || typeof rawVoiceText !== 'string' || !rawVoiceText.trim()) {
      return NextResponse.json({ error: 'No se recibió texto dictado por voz' }, { status: 400 });
    }

    const { rows: agentRows } = await pool.query('SELECT * FROM ai_agents WHERE id = $1 LIMIT 1;', [id]);
    if (!agentRows.length) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    const agent = agentRows[0];

    // Obtener llaves
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
      return NextResponse.json({ error: 'Falta configurar la API Key en /admin/settings' }, { status: 400 });
    }

    const prompt = `Eres un Diseñador y Psicólogo de Personalidades de IA para Ventas y Atención al Cliente.
El fundador o director de la empresa acaba de DICTAR POR VOZ cómo quiere que sea la personalidad y comportamiento de su agente ("${agent.name}", rol: "${agent.role}").

DICTADO DEL USUARIO (AUDIO TRANSCRIBIDO):
"""
${rawVoiceText.trim()}
"""

Tu misión es transformar este dictado coloquial en una configuración técnica y psicológica perfecta:
1. Eliminar muletillas, pausas y redundancias.
2. Identificar el PRESET más adecuado (debe ser exactamente uno de estos cuatro strings):
   - "calido_humano" (cálido, cercano, empático, ideal para servicios, clínicas, salud)
   - "vendedor_consultivo" (consultivo, enfocado en cierre y dolor, Alex Hormozi / Chris Voss)
   - "tecnico_experto" (riguroso, datos duros, especificaciones, ingeniería, drones)
   - "paciencia_soporte" (resolutivo, máxima paciencia, calmado, servicio al cliente)
3. Determinar los valores numéricos de los sliders (en escala del 1 al 10):
   - "warmth": Nivel de calidez humana y cercanía (1 al 10)
   - "formality": Nivel de formalidad (1 = habla de tú muy casual, 10 = muy formal de usted)
   - "closing_style": Agresividad de cierre (1 = pasivo y suave, 10 = cerrador enfocado a la cita)
   - "technical_level": Nivel de tecnicismos (1 = lenguaje sencillo, 10 = ingeniería pura)
4. Redactar las "custom_rules": Directrices de oro numeradas en Markdown, redactadas como mandatos directos para el sistema ("1. Saluda siempre con tono alegre y usa un solo emoji. 2. Nunca des el precio en el primer mensaje...").
5. "summary": Una frase breve de retroalimentación explicando qué se detectó y configuró.

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO (sin bloques de código markdown alrededor) con esta estructura:
{
  "preset": "calido_humano",
  "warmth": 8,
  "formality": 4,
  "closing_style": 7,
  "technical_level": 5,
  "custom_rules": "1. Regla uno...\\n2. Regla dos...",
  "summary": "Se detectó un enfoque cálido y consultivo enfocado en empatía y cierre efectivo."
}
`;

    let result: any = null;

    if (provider === 'google') {
      const candidateModels = [
        agent.llm_model && !agent.llm_model.startsWith('gemini-2') ? agent.llm_model : 'gemini-3.5-flash',
        'gemini-3.5-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
      ];
      const modelsToTry = Array.from(new Set(candidateModels));

      for (const mName of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${effectiveApiKey}`;
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          });
          if (response.ok) {
            const resJson = await response.json();
            const raw = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            result = JSON.parse(raw);
            if (result) break;
          }
        } catch {}
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
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (response.ok) {
        const resJson = await response.json();
        const raw = (resJson.content?.[0]?.text || '').replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '').trim();
        result = JSON.parse(raw);
      }
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
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (response.ok) {
        const resJson = await response.json();
        result = JSON.parse(resJson.choices?.[0]?.message?.content || '{}');
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'No se pudo procesar el dictado con IA' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Soul Distill POST Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
