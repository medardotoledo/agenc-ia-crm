import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/agent/audit-stats?accountId=...
 * Entrega las métricas consolidadas para el Dashboard del Dueño:
 * 1. Rendimiento del Sistema IA (Citas generadas, etapas avanzadas, tareas agendadas)
 * 2. Salud Operativa del Equipo Humano (Semáforo por vendedor, omisiones, dinero en limbo)
 * 3. Feed de auditoría inmutable en tiempo real
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    // 1. Obtener registro de auditoría del agente
    const { data: auditLogs, error: logErr } = await supabase
      .from('agent_audit_log')
      .select('*, users:assigned_user(id, name, email), contacts(id, name, phone_e164)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logErr) throw logErr;

    // 2. Obtener tareas y estatus de cumplimiento
    const { data: allTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, audit_status, due_at, completed_at, assigned_to, users:assigned_to(id, name, email)')
      .eq('account_id', accountId);

    if (taskErr) throw taskErr;

    // 3. Obtener oportunidades para calcular montos y cierres
    const { data: allOpps, error: oppErr } = await supabase
      .from('opportunities')
      .select('id, value, status, stage_id, owner_id, users:owner_id(id, name)')
      .eq('account_id', accountId);

    if (oppErr) throw oppErr;

    // Procesar métricas del Sistema IA
    const aiStats = {
      stagesMovedByAi: (auditLogs || []).filter((l) => l.event_type === 'stage_moved').length,
      tasksGeneratedByAi: (allTasks || []).filter((t: any) => t.audit_status).length,
      appointmentsBookedByAi: (auditLogs || []).filter((l) => l.event_type === 'appointment_created').length,
      dealsWonRecorded: (allOpps || []).filter((o) => o.status === 'won').length,
      totalWonValue: (allOpps || [])
        .filter((o) => o.status === 'won')
        .reduce((sum, o) => sum + Number(o.value || 0), 0),
    };

    // Procesar cumplimiento por Vendedor
    const repCompliance: Record<string, {
      userId: string;
      name: string;
      email: string;
      totalTasks: number;
      completed: number;
      missed: number;
      escalated: number;
      complianceRate: number;
      pendingDealValue: number;
    }> = {};

    for (const t of (allTasks || [])) {
      const uId = t.assigned_to || 'unassigned';
      const uName = (t as any).users?.name || 'Sin Asignar';
      const uEmail = (t as any).users?.email || '';

      if (!repCompliance[uId]) {
        repCompliance[uId] = {
          userId: uId,
          name: uName,
          email: uEmail,
          totalTasks: 0,
          completed: 0,
          missed: 0,
          escalated: 0,
          complianceRate: 100,
          pendingDealValue: 0,
        };
      }

      repCompliance[uId].totalTasks++;
      if (t.completed_at || t.audit_status === 'completed') {
        repCompliance[uId].completed++;
      } else if (t.audit_status === 'escalated') {
        repCompliance[uId].escalated++;
      } else if (t.audit_status === 'missed') {
        repCompliance[uId].missed++;
      }
    }

    // Calcular montos en riesgo (open) por vendedor
    for (const o of (allOpps || [])) {
      if (o.status === 'open' && o.owner_id && repCompliance[o.owner_id]) {
        repCompliance[o.owner_id].pendingDealValue += Number(o.value || 0);
      }
    }

    // Calcular tasa de cumplimiento %
    const repsList = Object.values(repCompliance).map((r) => {
      const closedOrMissed = r.completed + r.missed + r.escalated;
      const rate = closedOrMissed > 0 ? Math.round((r.completed / closedOrMissed) * 100) : 100;
      return {
        ...r,
        complianceRate: rate,
        health: rate >= 80 ? 'green' : rate >= 50 ? 'yellow' : 'red',
      };
    });

    return NextResponse.json({
      aiPerformance: aiStats,
      teamCompliance: repsList,
      recentAuditFeed: (auditLogs || []).slice(0, 25),
    });
  } catch (error: any) {
    console.error('[API /api/agent/audit-stats] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener estadísticas de auditoría' },
      { status: 500 }
    );
  }
}
