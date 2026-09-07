import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; simId: string }> }
) {
  try {
    const { id, simId } = await params;
    const body = await req.json();
    const { status = 'approved', feedbackNotes = '', dialogue: updatedDialogue = null } = body;

    let updateSql = `
      UPDATE ai_agent_simulations
      SET status = $1, 
          feedback_notes = $2,
          dialogue = COALESCE($3, dialogue)
      WHERE id = $4 AND agent_id = $5
      RETURNING *;
    `;

    const { rows } = await pool.query(updateSql, [
      status,
      feedbackNotes,
      updatedDialogue ? JSON.stringify(updatedDialogue) : null,
      simId,
      id,
    ]);

    if (!rows.length) {
      return NextResponse.json({ error: 'Simulación no encontrada' }, { status: 404 });
    }

    const sim = rows[0];

    // Inyectar en el cerebro del agente (04-matriz-de-objeciones) para que aprenda el nuevo manejo de objeción
    if (status === 'approved') {
      const dialogueArr = Array.isArray(sim.dialogue) ? sim.dialogue : [];
      if (dialogueArr.length > 0) {
        const snippet = `\n\n#### ⭐ Respuesta Modelo Calibrada por Supervisor: ${sim.scenario_name || 'Objeción de Combate'}\n` +
          dialogueArr.map((m: any) => `* **${m.sender === 'buyer' ? 'Prospecto' : 'Agente (Respuesta Modelo Calibrada)'}:** ${m.text}`).join('\n') + '\n';

        await pool.query(`
          UPDATE ai_agent_brains
          SET markdown_content = markdown_content || $1, updated_at = NOW()
          WHERE agent_id = $2 AND file_slug = '04-matriz-de-objeciones';
        `, [snippet, id]);
      }
    }

    // Activar agente si no estaba activo
    await pool.query("UPDATE ai_agents SET status = 'active', updated_at = NOW() WHERE id = $1 AND status != 'active';", [id]);

    return NextResponse.json({ simulation: rows[0], success: true });
  } catch (err: any) {
    console.error('[Simulation Review PUT] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
