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
    const { status = 'approved', feedbackNotes = '', adjustedResponse = '' } = body;

    // Si el usuario ajustó la respuesta, actualizar el último mensaje del agente en el diálogo
    let updateSql = `
      UPDATE ai_agent_simulations
      SET status = $1, feedback_notes = $2
      WHERE id = $3 AND agent_id = $4
      RETURNING *;
    `;

    const { rows } = await pool.query(updateSql, [status, feedbackNotes, simId, id]);
    if (!rows.length) {
      return NextResponse.json({ error: 'Simulación no encontrada' }, { status: 404 });
    }

    // Si al menos 1 simulación está aprobada, activar el agente
    await pool.query("UPDATE ai_agents SET status = 'active', updated_at = NOW() WHERE id = $1 AND status != 'active';", [id]);

    return NextResponse.json({ simulation: rows[0], success: true });
  } catch (err: any) {
    console.error('[Simulation Review PUT] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
