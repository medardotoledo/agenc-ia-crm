import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params;

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

    // 2. Obtener archivos del producto
    const { rows: files } = await pool.query(
      'SELECT * FROM ai_agent_knowledge WHERE product_id = $1 ORDER BY created_at ASC;',
      [productId]
    );

    const studyFiles = files.filter((f) => f.folder === 'material_estudio');
    const shareableFiles = files.filter((f) => f.folder === 'material_compartible');

    const studySummary = studyFiles
      .map((f, i) => `[${i + 1}] Archivo: ${f.file_name}\nContenido:\n${f.content_text || '(Documento técnico analizado)'}`)
      .join('\n\n');

    const shareableSummary = shareableFiles
      .map((f, i) => `[${i + 1}] Archivo para WhatsApp: ${f.file_name} (${f.file_type})\nURL: ${f.cdn_url || f.storage_url}\nRegla: ${f.trigger_rule || 'Enviar cuando el prospecto pida ver el producto o ejemplos.'}`)
      .join('\n\n');

    // 3. Obtener credenciales de la cuenta con fallback seguro
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
        error: `Falta configurar la API Key para ${provider.toUpperCase()} en Configuración (/admin/settings).`,
      }, { status: 400 });
    }

    const prompt = `Eres el Arquitecto de Conocimiento de un CRM Agentico.
Tu misión es destilar la "Ficha de Conocimiento (Información estructurada para la IA)" del producto: "${product.name}".

Datos preliminares del producto:
- Descripción breve: ${product.short_description || 'No especificada'}
- Cuándo activarlo (síntomas/dolores/triggers): ${product.target_triggers || 'Cuando el cliente pregunte por este servicio'}
- Rango de precio u oferta: ${product.price_range || 'A consultar'}

Materia Prima disponible:
=== DOCUMENTOS DE ESTUDIO (INTERNOS) ===
${studySummary || 'No se subieron manuales extensos. Genera la ficha a partir de la descripción y rol del agente.'}

=== ARCHIVOS PARA WHATSAPP (EL MALETÍN) ===
${shareableSummary || 'Sin archivos para compartir registrados.'}

INSTRUCCIONES DE FORMATO:
Debes responder en formato Markdown estructurado y directo para la memoria del agente.
Incluye exactamente estas secciones:
# Ficha de Conocimiento: ${product.name}

## 1. ¿Qué es y qué dolor principal resuelve?
(Explicación clara en 2 párrafos de la propuesta única de valor)

## 2. Mecanismos Técnicos Duros y Especificaciones
(Datos duros comprobables: materiales, micras, tolerancias, certificaciones, dosis, tiempos, etc.)

## 3. Disparadores de Activación (Triggers)
(¿Qué palabras o síntomas del cliente indican que este es el producto ideal?)

## 4. Matriz de Objeciones y Manejo Táctico (Chris Voss)
(Las 3 objeciones más comunes para este producto y cómo responderlas buscando el "no" protector y usando etiquetas tácticas)

## 5. Reglas para enviar archivos de WhatsApp
(Cuándo disparar los videos, fotos o folletos registrados en el maletín de este producto)
`;

    let generatedSheet = '';

    if (provider === 'google') {
      const modelName = agent.llm_model || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveApiKey}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Error en Google Gemini (${response.status})`);
      }

      const resJson = await response.json();
      generatedSheet = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('Error en llamada a Anthropic');
      const resJson = await response.json();
      generatedSheet = resJson.content?.[0]?.text || '';
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${effectiveApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.llm_model || 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('Error en llamada a OpenAI');
      const resJson = await response.json();
      generatedSheet = resJson.choices?.[0]?.message?.content || '';
    }

    // 4. Guardar en ai_agent_products
    const { rows } = await pool.query(`
      UPDATE ai_agent_products
      SET knowledge_sheet = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `, [generatedSheet.trim(), productId]);

    return NextResponse.json({
      success: true,
      product: rows[0],
      knowledge_sheet: generatedSheet.trim(),
    });
  } catch (err: any) {
    console.error('[Product Digest POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
