import { NextRequest, NextResponse } from 'next/server';
import { runAuditAndEscalationCheck } from '@/lib/pipeline-agent';

/**
 * GET o POST /api/agent/audit-cron
 * Endpoint periódico para auditar el cumplimiento del equipo de ventas.
 * - Revisa tareas que hayan vencido su fecha límite (due_at).
 * - Envía recordatorio por correo al vendedor tras N horas de vencimiento.
 * - Escala la alerta por correo al dueño/administrador si persiste desatendida.
 * - Registra cada evento en la bitácora inmutable `agent_audit_log`.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId') || undefined;

    const results = await runAuditAndEscalationCheck(accountId);
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('[API /api/agent/audit-cron] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al ejecutar auditoría' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let accountId: string | undefined;
    try {
      const body = await req.json();
      accountId = body?.accountId;
    } catch {
      // Body opcional
    }

    const results = await runAuditAndEscalationCheck(accountId);
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('[API /api/agent/audit-cron] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al ejecutar auditoría' },
      { status: 500 }
    );
  }
}
