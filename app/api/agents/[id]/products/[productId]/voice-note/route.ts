import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params;
    const body = await req.json();
    const { rawVoiceText, customTitle = '' } = body;

    if (!rawVoiceText || typeof rawVoiceText !== 'string' || !rawVoiceText.trim()) {
      return NextResponse.json({ error: 'No se recibió texto dictado por voz' }, { status: 400 });
    }

    const { rows: prodRows } = await pool.query('SELECT * FROM ai_agent_products WHERE id = $1 LIMIT 1;', [productId]);
    if (!prodRows.length) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    const product = prodRows[0];

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

    const prompt = `Eres un Especialista en Documentación y Arquitecto de Conocimiento Técnico y Comercial.
El fundador o experto del producto "${product.name}" acaba de EXPLICAR Y DICTAR POR VOZ información clave de su producto.

DICTADO POR VOZ DEL EXPERTO (AUDIO TRANSCRIBIDO):
"""
${rawVoiceText.trim()}
"""

Tu misión es transformar este dictado hablado en un DOCUMENTO DE ESTUDIO DE ALTO NIVEL para que el agente de IA lo aprenda y lo use para vender.
Instrucciones:
1. Elimina muletillas ("este...", "o sea...", repeticiones).
2. Organiza con títulos y subtítulos claros en Markdown (#, ##, ###).
3. Resalta datos duros, ventajas frente a la competencia (por qué comprar aquí y no en otro lado), garantías y mecanismos de funcionamiento.
4. Genera un título profesional y claro (máximo 60 caracteres).

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO con esta estructura:
{
  "title": "Explicación Técnica del Fundador: [Tema]",
  "formattedMarkdown": "# [Título]\n\n## 1. Resumen Ejecutivo\n...\n\n## 2. Diferenciadores frente a la Competencia\n...\n\n## 3. Puntos Clave para el Cliente\n...",
  "wordCount": 350
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
          max_tokens: 3000,
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

    if (!result || !result.formattedMarkdown) {
      return NextResponse.json({ error: 'No se pudo estructurar el dictado de voz' }, { status: 500 });
    }

    const fileName = `🎙️ ${customTitle.trim() || result.title || 'Dictado de Voz del Fundador'}`;
    const wordCount = result.wordCount || result.formattedMarkdown.split(/\s+/).filter(Boolean).length;

    // Guardar en ai_agent_knowledge
    const insertSql = `
      INSERT INTO ai_agent_knowledge (
        agent_id, folder, file_name, file_type, file_size, storage_url, cdn_url,
        content_text, trigger_rule, product_id, status
      ) VALUES ($1, 'material_estudio', $2, 'voice_note', $3, 'voice_dictation', null, $4, $5, $6, 'processed')
      RETURNING *;
    `;

    const { rows } = await pool.query(insertSql, [
      id,
      fileName,
      wordCount,
      result.formattedMarkdown,
      'Explicación verbal dictada por el fundador/experto del producto.',
      productId,
    ]);

    return NextResponse.json({
      success: true,
      file: rows[0],
      title: result.title,
      wordCount,
      formattedMarkdown: result.formattedMarkdown,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[Voice Note POST Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
