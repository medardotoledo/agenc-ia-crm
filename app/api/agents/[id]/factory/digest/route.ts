import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { rows: agentRows } = await pool.query('SELECT * FROM ai_agents WHERE id = $1 LIMIT 1;', [id]);
    if (!agentRows.length) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }
    const agent = agentRows[0];

    const { rows: knowledge } = await pool.query(
      'SELECT * FROM ai_agent_knowledge WHERE agent_id = $1 ORDER BY created_at ASC;',
      [id]
    );

    const studyFiles = knowledge.filter((k: any) => k.folder === 'material_estudio');
    const shareableFiles = knowledge.filter((k: any) => k.folder === 'material_compartible');

    const studySummary = studyFiles.map((f: any, idx: number) => {
      return `[${idx + 1}] Archivo: ${f.file_name} (${f.file_type})
Contenido / Resumen:
${f.content_text || '(Documento técnico procesado en base de conocimiento)'}`;
    }).join('\n\n');

    const shareableSummary = shareableFiles.map((f: any, idx: number) => {
      return `[${idx + 1}] Activo para compartir: ${f.file_name} (${f.file_type})
URL CDN: ${f.cdn_url || f.storage_url}
Regla sugerida: ${f.trigger_rule || 'Enviar cuando el cliente pregunte o solicite demostración.'}
Caption: ${f.suggested_caption || ''}`;
    }).join('\n\n');

    const { rows: keyRows } = await pool.query(
      'SELECT gemini_key, anthropic_key, openai_key FROM account_ai_keys WHERE account_id = $1 LIMIT 1;',
      [agent.account_id || 'default']
    );
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

    const masterPrompt = `Eres el Ingeniero Maestro de la Fábrica de Conocimiento de un CRM Agentico de Élite.
Tu misión es procesar la MATERIA PRIMA proporcionada por una empresa y destilar el SEGUNDO CEREBRO del agente.

El agente se llama: "${agent.name}"
Misión: "${agent.mission_type.startsWith('ventas') ? 'Ventas y Cierre de Citas (Setter/Closer)' : 'Servicio al Cliente, Soporte y Fidelización'}"
Rol: "${agent.role}"

CRUCIAL: Debes tejer DATOS TÉCNICOS DUROS (especificaciones, medidas, certificaciones, componentes reales) con el CÓCTEL MAESTRO DE PERSUASIÓN Y PSICOLOGÍA:
1. Donald Miller (StoryBrand SB7): El cliente es el HÉROE; el agente es el GUÍA que ofrece un Plan Claro de 3 Pasos.
2. Chris Voss (Negociador FBI): Mirroring, Tactical Labeling ("Parece que te preocupa..."), preguntas con "Cómo"/"Qué" y búsqueda del "NO" que protege ("¿Sería mala idea si...?").
3. Robert Cialdini (7 Leyes): Reciprocidad, Autoridad basada en datos, Prueba Social, Escasez real, Micro-compromisos.
4. Alex Hormozi ($100M Offers): El "Mecanismo Único", maximizar certeza y reducir esfuerzo percibido a cero.
5. Fórmula Híbrida del Usuario: Beneficio Emocional + Mecanismo Técnico Real (micras, PSI, materiales) + Future Pacing + Micro-CTA.

Debes responder ÚNICAMENTE con un objeto JSON válido (sin código markdown exterior) con esta estructura exacta:
{
  "identidad_y_tono": "Contenido markdown para 01-identidad-y-tono.md...",
  "mecanismos_tecnicos": "Contenido markdown para 02-mecanismos-tecnicos.md...",
  "beneficios_y_future_pacing": "Contenido markdown para 03-beneficios-y-future-pacing.md...",
  "matriz_de_objeciones": "Contenido markdown para 04-matriz-de-objeciones.md...",
  "oferta_y_plan_storybrand": "Contenido markdown para 05-oferta-y-plan-storybrand.md...",
  "reglas_de_oro": "Contenido markdown para 06-reglas-de-oro.md...",
  "catalogo_maletin": "Contenido markdown para 07-catalogo-maletin.md..."
}

A continuación la MATERIA PRIMA del negocio:

=== MATERIAL DE ESTUDIO (100% CONFIDENCIAL / SOLO PARA APRENDIZAJE) ===
${studySummary || 'No se proporcionó texto explícito de estudio. Usa el contexto de la empresa y el nombre del agente.'}

=== MATERIAL COMPARTIBLE (EL MALETÍN DE WHATSAPP / PARA ENVIAR A CLIENTES) ===
${shareableSummary || 'Sin archivos multimedia registrados.'}`;

    let generatedBrains: any = null;

    if (provider === 'google') {
      const modelName = agent.llm_model || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveApiKey}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: masterPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Error en llamada a Google Gemini (${response.status})`);
      }

      const resJson = await response.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      generatedBrains = JSON.parse(rawText);
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
          messages: [{ role: 'user', content: masterPrompt }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Error en llamada a Anthropic');
      }

      const resJson = await response.json();
      const rawText = resJson.content?.[0]?.text || '';
      const cleanJson = rawText.replace(/^\s*```(json)?/i, '').replace(/```\s*$/, '').trim();
      generatedBrains = JSON.parse(cleanJson);
    } else {
      // OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.llm_model || 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: masterPrompt }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Error en llamada a OpenAI');
      }

      const resJson = await response.json();
      const rawText = resJson.choices?.[0]?.message?.content || '{}';
      generatedBrains = JSON.parse(rawText);
    }

    const brainDocs = [
      { slug: '01-identidad-y-tono', title: 'Identidad, Tono y Voz Humana', content: generatedBrains.identidad_y_tono || '# Identidad y Tono' },
      { slug: '02-mecanismos-tecnicos', title: 'Mecanismos Técnicos y Datos Duros', content: generatedBrains.mecanismos_tecnicos || '# Mecanismos Técnicos' },
      { slug: '03-beneficios-y-future-pacing', title: 'Beneficios y Future Pacing', content: generatedBrains.beneficios_y_future_pacing || '# Beneficios y Transformación' },
      { slug: '04-matriz-de-objeciones', title: 'Matriz de Objeciones y Negociación Voss', content: generatedBrains.matriz_de_objeciones || '# Matriz de Objeciones' },
      { slug: '05-oferta-y-plan-storybrand', title: 'Oferta Irresistible y Plan StoryBrand', content: generatedBrains.oferta_y_plan_storybrand || '# Oferta y Plan' },
      { slug: '06-reglas-de-oro', title: 'Reglas de Oro y Guardrails Inmutables', content: generatedBrains.reglas_de_oro || '# Reglas de Oro' },
      { slug: '07-catalogo-maletin', title: 'Catálogo de Disparadores del Maletín', content: generatedBrains.catalogo_maletin || '# Maletín Compartible' },
    ];

    for (const doc of brainDocs) {
      await pool.query(`
        INSERT INTO ai_agent_brains (agent_id, file_slug, title, markdown_content, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (agent_id, file_slug)
        DO UPDATE SET title = EXCLUDED.title, markdown_content = EXCLUDED.markdown_content, version = ai_agent_brains.version + 1, updated_at = NOW();
      `, [id, doc.slug, doc.title, doc.content]);
    }

    await pool.query("UPDATE ai_agents SET status = 'training', updated_at = NOW() WHERE id = $1;", [id]);

    return NextResponse.json({
      success: true,
      message: 'Segundo Cerebro generado con éxito por La Fábrica de Conocimiento.',
      brainDocs,
    });
  } catch (err: any) {
    console.error('[Factory Digest] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
