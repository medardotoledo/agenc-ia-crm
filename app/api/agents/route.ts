import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || 'OS9czz85LUvBeljk8FEv';

    const query = `
      SELECT 
        a.*,
        COALESCE(k.study_count, 0) AS study_files_count,
        COALESCE(k.shareable_count, 0) AS shareable_files_count,
        COALESCE(b.brain_count, 0) AS brain_docs_count,
        COALESCE(s.sim_count, 0) AS simulations_count
      FROM ai_agents a
      LEFT JOIN (
        SELECT agent_id,
          COUNT(*) FILTER (WHERE folder = 'material_estudio') AS study_count,
          COUNT(*) FILTER (WHERE folder = 'material_compartible') AS shareable_count
        FROM ai_agent_knowledge
        GROUP BY agent_id
      ) k ON a.id = k.agent_id
      LEFT JOIN (
        SELECT agent_id, COUNT(*) AS brain_count
        FROM ai_agent_brains
        GROUP BY agent_id
      ) b ON a.id = b.agent_id
      LEFT JOIN (
        SELECT agent_id, COUNT(*) AS sim_count
        FROM ai_agent_simulations
        GROUP BY agent_id
      ) s ON a.id = s.agent_id
      WHERE a.account_id = $1
      ORDER BY a.created_at DESC;
    `;

    const { rows } = await pool.query(query, [accountId]);
    return NextResponse.json({ agents: rows });
  } catch (err: any) {
    console.error('[API Agents GET] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      accountId = 'OS9czz85LUvBeljk8FEv',
      name,
      role = 'setter',
      missionType = 'sales',
      avatarUrl = '',
      llmProvider = 'anthropic',
      llmModel = 'claude-3-5-sonnet-20241022',
      apiKey = '',
      systemInstructions = '',
      config = {},
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del agente es requerido' }, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO ai_agents (
        account_id, name, role, mission_type, status, avatar_url, 
        llm_provider, llm_model, encrypted_api_key, system_instructions, config
      ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const { rows } = await pool.query(insertQuery, [
      accountId,
      name.trim(),
      role,
      missionType,
      avatarUrl || null,
      llmProvider,
      llmModel,
      apiKey ? Buffer.from(apiKey.trim()).toString('base64') : null,
      systemInstructions || null,
      JSON.stringify(config || {}),
    ]);

    return NextResponse.json({ agent: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[API Agents POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
