import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { CATALOG } from '../models/route';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows: agentRows } = await pool.query('SELECT * FROM ai_agents WHERE id = $1 LIMIT 1;', [id]);
    if (!agentRows.length) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const agent = agentRows[0];
    const hasApiKey = Boolean(agent.encrypted_api_key);
    agent.hasApiKey = hasApiKey;
    delete agent.encrypted_api_key;

    // Chequeo de deprecación preventiva del modelo
    const allModels = [...CATALOG.google, ...CATALOG.anthropic, ...CATALOG.openai];
    const modelInfo = allModels.find((m) => m.id === agent.llm_model);
    
    // Si está marcado como deprecado o si el nombre del modelo contiene pro antiguo
    const isDeprecated = modelInfo?.status === 'deprecated' || modelInfo?.status === 'legacy' || agent.llm_model === 'gemini-1.0-pro' || agent.llm_model === 'gemini-pro';
    if (isDeprecated) {
      const defaultReplacement = agent.llm_provider === 'google'
        ? 'gemini-2.0-flash'
        : agent.llm_provider === 'anthropic'
        ? 'claude-3-5-sonnet-20241022'
        : 'gpt-4o';

      agent.modelWarning = {
        isDeprecated: true,
        currentModel: agent.llm_model,
        provider: agent.llm_provider,
        recommendedModel: modelInfo?.recommendedReplacement || defaultReplacement,
        reason: modelInfo?.description || 'El proveedor de IA ha descontinuado o actualizado este modelo. Te sugerimos actualizar para evitar errores en llamadas.',
      };
    }

    // Obtener material de conocimiento (estudio y compartible)
    const { rows: knowledge } = await pool.query(
      'SELECT * FROM ai_agent_knowledge WHERE agent_id = $1 ORDER BY created_at ASC;',
      [id]
    );

    // Obtener Segundo Cerebro (.md)
    const { rows: brains } = await pool.query(
      'SELECT * FROM ai_agent_brains WHERE agent_id = $1 ORDER BY file_slug ASC;',
      [id]
    );

    // Obtener Simulaciones
    const { rows: simulations } = await pool.query(
      'SELECT * FROM ai_agent_simulations WHERE agent_id = $1 ORDER BY created_at ASC;',
      [id]
    );

    return NextResponse.json({
      agent,
      studyFiles: knowledge.filter((k: any) => k.folder === 'material_estudio'),
      shareableFiles: knowledge.filter((k: any) => k.folder === 'material_compartible'),
      brainDocs: brains,
      simulations,
    });
  } catch (err: any) {
    console.error('[API Agent ID GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      role,
      missionType,
      status,
      avatarUrl,
      targetChannel,
      llmProvider,
      llmModel,
      apiKey,
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (role !== undefined) { updates.push(`role = $${paramIndex++}`); values.push(role); }
    if (missionType !== undefined) { updates.push(`mission_type = $${paramIndex++}`); values.push(missionType); }
    if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }
    if (avatarUrl !== undefined) { updates.push(`avatar_url = $${paramIndex++}`); values.push(avatarUrl); }
    if (targetChannel !== undefined) { updates.push(`target_channel = $${paramIndex++}`); values.push(targetChannel); }
    if (llmProvider !== undefined) { updates.push(`llm_provider = $${paramIndex++}`); values.push(llmProvider); }
    if (llmModel !== undefined) { updates.push(`llm_model = $${paramIndex++}`); values.push(llmModel); }
    if (body.ia_soul !== undefined || body.iaSoul !== undefined) {
      updates.push(`ia_soul = $${paramIndex++}`);
      values.push(JSON.stringify(body.ia_soul || body.iaSoul));
    }
    if (apiKey !== undefined) {
      const encKey = apiKey && apiKey.trim() ? Buffer.from(apiKey.trim()).toString('base64') : null;
      updates.push(`encrypted_api_key = $${paramIndex++}`);
      values.push(encKey);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Sin campos a actualizar' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateSql = `
      UPDATE ai_agents
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const { rows } = await pool.query(updateSql, values);
    if (!rows.length) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const updatedAgent = rows[0];
    updatedAgent.hasApiKey = Boolean(updatedAgent.encrypted_api_key);
    delete updatedAgent.encrypted_api_key;

    return NextResponse.json({ agent: updatedAgent, success: true });
  } catch (err: any) {
    console.error('[API Agent ID PUT] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM ai_agents WHERE id = $1;', [id]);
    return NextResponse.json({ success: true, message: 'Agente y todo su Segundo Cerebro eliminados.' });
  } catch (err: any) {
    console.error('[API Agent ID DELETE] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
