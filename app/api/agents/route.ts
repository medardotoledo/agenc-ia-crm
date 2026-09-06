import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const { rows } = await pool.query(`
      SELECT 
        a.id,
        a.account_id,
        a.name,
        a.role,
        a.mission_type,
        a.status,
        a.avatar_url,
        a.target_channel,
        a.llm_provider,
        a.llm_model,
        (a.encrypted_api_key IS NOT NULL) AS "hasApiKey",
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT k.id) AS total_files,
        COUNT(DISTINCT b.id) AS total_brains,
        COUNT(DISTINCT s.id) AS total_simulations
      FROM ai_agents a
      LEFT JOIN ai_agent_knowledge k ON k.agent_id = a.id
      LEFT JOIN ai_agent_brains b ON b.agent_id = a.id
      LEFT JOIN ai_agent_simulations s ON s.agent_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC;
    `);

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
      accountId = 'default',
      name,
      role = 'Setter Comercial WhatsApp',
      missionType = 'ventas_setter',
      targetChannel = 'whatsapp',
      llmProvider = 'google',
      llmModel,
      apiKey,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del agente es obligatorio' }, { status: 400 });
    }

    const effectiveModel = llmModel || (
      llmProvider === 'google'
        ? 'gemini-2.0-flash'
        : llmProvider === 'anthropic'
        ? 'claude-3-5-sonnet-20241022'
        : 'gpt-4o'
    );

    const encryptedKey = apiKey && apiKey.trim() ? Buffer.from(apiKey.trim()).toString('base64') : null;

    const { rows } = await pool.query(`
      INSERT INTO ai_agents (
        account_id, name, role, mission_type, target_channel, 
        llm_provider, llm_model, encrypted_api_key, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
      RETURNING *;
    `, [accountId, name.trim(), role.trim(), missionType, targetChannel, llmProvider, effectiveModel, encryptedKey]);

    const created = rows[0];
    created.hasApiKey = Boolean(created.encrypted_api_key);
    delete created.encrypted_api_key;

    return NextResponse.json({ agent: created, success: true }, { status: 201 });
  } catch (err: any) {
    console.error('[API Agents POST] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
