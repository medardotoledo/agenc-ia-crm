import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || 'OS9czz85LUvBeljk8FEv';

    // 1. Obtener estado del switch maestro global
    const { rows: keyRows } = await pool.query(
      `SELECT is_global_auto_reply_enabled FROM account_ai_keys 
       WHERE account_id = $1 OR account_id = 'OS9czz85LUvBeljk8FEv' 
       ORDER BY CASE WHEN account_id = $1 THEN 1 ELSE 2 END 
       LIMIT 1;`,
      [accountId]
    );
    const isGlobalAutoReplyEnabled = Boolean(keyRows[0]?.is_global_auto_reply_enabled);

    // 2. Obtener los controles de chats para esta cuenta
    const { rows: controls } = await pool.query(
      `SELECT chat_id, ai_mode, assigned_agent_id, last_human_interaction, updated_at 
       FROM crm_chat_controls 
       WHERE account_id = $1;`,
      [accountId]
    );

    // 3. Obtener agentes disponibles para asignación
    const { rows: agents } = await pool.query(
      `SELECT id, name, role, status, mission_type 
       FROM ai_agents 
       WHERE account_id = $1 OR account_id = 'OS9czz85LUvBeljk8FEv'
       ORDER BY created_at ASC;`,
      [accountId]
    );

    return NextResponse.json({
      success: true,
      isGlobalAutoReplyEnabled,
      controls,
      availableAgents: agents,
    });
  } catch (error: any) {
    console.error('[Chat Control GET Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountId = body.accountId || 'OS9czz85LUvBeljk8FEv';

    // A. Actualización del Switch Maestro Global
    if (typeof body.isGlobalAutoReplyEnabled === 'boolean') {
      await pool.query(
        `INSERT INTO account_ai_keys (account_id, is_global_auto_reply_enabled, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (account_id) DO UPDATE SET 
           is_global_auto_reply_enabled = EXCLUDED.is_global_auto_reply_enabled,
           updated_at = NOW();`,
        [accountId, body.isGlobalAutoReplyEnabled]
      );

      return NextResponse.json({
        success: true,
        isGlobalAutoReplyEnabled: body.isGlobalAutoReplyEnabled,
        message: body.isGlobalAutoReplyEnabled
          ? '🚀 Automatización de IA activada globalmente.'
          : '🛡️ Modo Seguro activado: ninguna IA responderá por WhatsApp.',
      });
    }

    // B. Actualización de modo por Chat
    const { chatId, aiMode, assignedAgentId, isHumanInteraction } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'chatId es requerido' }, { status: 400 });
    }

    if (isHumanInteraction) {
      // Registrar que un humano escribió para pausar el modo híbrido
      await pool.query(
        `INSERT INTO crm_chat_controls (account_id, chat_id, last_human_interaction, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (account_id, chat_id) DO UPDATE SET 
           last_human_interaction = NOW(),
           updated_at = NOW();`,
        [accountId, String(chatId)]
      );
      return NextResponse.json({ success: true, updated: 'human_interaction' });
    }

    const validModes = ['ai_agent', 'hybrid', 'human'];
    const selectedMode = validModes.includes(aiMode) ? aiMode : 'human';

    const { rows } = await pool.query(
      `INSERT INTO crm_chat_controls (account_id, chat_id, ai_mode, assigned_agent_id, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (account_id, chat_id) DO UPDATE SET 
         ai_mode = EXCLUDED.ai_mode,
         assigned_agent_id = COALESCE(EXCLUDED.assigned_agent_id, crm_chat_controls.assigned_agent_id),
         updated_at = NOW()
       RETURNING *;`,
      [accountId, String(chatId), selectedMode, assignedAgentId || null]
    );

    return NextResponse.json({
      success: true,
      control: rows[0],
    });
  } catch (error: any) {
    console.error('[Chat Control POST Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
