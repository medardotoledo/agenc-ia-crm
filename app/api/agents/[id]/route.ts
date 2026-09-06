import { NextResponse } from 'next/server';
import { Pool } from 'pg';

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
    // No exponer la API key en texto plano, solo indicador
    agent.hasApiKey = hasApiKey;
    delete agent.encrypted_api_key;

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
      llmProvider,
      llmModel,
      apiKey,
      systemInstructions,
      config,
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
    if (role !== undefined) { updates.push(`role = $${idx++}`); values.push(role); }
    if (missionType !== undefined) { updates.push(`mission_type = $${idx++}`); values.push(missionType); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (avatarUrl !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatarUrl); }
    if (llmProvider !== undefined) { updates.push(`llm_provider = $${idx++}`); values.push(llmProvider); }
    if (llmModel !== undefined) { updates.push(`llm_model = $${idx++}`); values.push(llmModel); }
    if (apiKey !== undefined && apiKey !== '') {
      updates.push(`encrypted_api_key = $${idx++}`);
      values.push(Buffer.from(apiKey.trim()).toString('base64'));
    }
    if (systemInstructions !== undefined) { updates.push(`system_instructions = $${idx++}`); values.push(systemInstructions); }
    if (config !== undefined) { updates.push(`config = $${idx++}`); values.push(JSON.stringify(config)); }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateSql = `
      UPDATE ai_agents
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(updateSql, values);
    if (!rows.length) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const updated = rows[0];
    delete updated.encrypted_api_key;
    return NextResponse.json({ agent: updated });
  } catch (err: any) {
    console.error('[API Agent ID PUT] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM ai_agents WHERE id = $1;', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Agent ID DELETE] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
