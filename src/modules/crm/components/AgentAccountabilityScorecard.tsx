'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Bot, 
  TrendingUp, 
  RefreshCw, 
  UserCheck, 
  AlertCircle,
  DollarSign,
  CalendarCheck
} from 'lucide-react';
import { Card } from '@/modules/crm/components/ui';

interface AgentAccountabilityScorecardProps {
  accountId: string;
}

export function AgentAccountabilityScorecard({ accountId }: AgentAccountabilityScorecardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    aiPerformance: {
      stagesMovedByAi: number;
      tasksGeneratedByAi: number;
      appointmentsBookedByAi: number;
      dealsWonRecorded: number;
      totalWonValue: number;
    };
    teamCompliance: Array<{
      userId: string;
      name: string;
      email: string;
      totalTasks: number;
      completed: number;
      missed: number;
      escalated: number;
      complianceRate: number;
      pendingDealValue: number;
      health: 'green' | 'yellow' | 'red';
    }>;
    recentAuditFeed: Array<{
      id: string;
      event_type: string;
      created_at: string;
      detail: any;
      users?: { name: string; email: string };
      contacts?: { name: string; phone_e164: string };
    }>;
  } | null>(null);

  const fetchStats = async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/agent/audit-stats?accountId=${accountId}`);
      if (!res.ok) throw new Error('Error al cargar métricas de auditoría');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('[AgentAccountabilityScorecard] Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [accountId]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'stage_moved':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">🔄 Etapa Movida</span>;
      case 'task_created':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">📋 Tarea Creada</span>;
      case 'task_reminder_sent':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">⏰ Recordatorio</span>;
      case 'task_missed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">⚠️ Desatendida</span>;
      case 'task_escalated':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">🚨 Escalada a Dueño</span>;
      case 'appointment_created':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">📅 Cita Agendada</span>;
      case 'deal_won':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">🎉 Venta Cerrada</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con botón de recarga */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-xl text-white shadow-sm border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="text-emerald-400" size={24} />
            <h2 className="text-xl font-bold tracking-tight">Auditoría del Agente & Semáforo de Vendedores</h2>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Métricas de blindaje: Demuestra el trabajo autónomo de la IA y fiscaliza el cumplimiento del equipo humano.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar Datos
        </button>
      </div>

      {/* Grid de 2 Columnas: Efectividad IA vs Cumplimiento Humano */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tarjeta 1: Rendimiento del Sistema IA */}
        <Card className="p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Efectividad del Sistema (IA)</h3>
                <p className="text-xs text-slate-500">Acciones completadas sin intervención humana</p>
              </div>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
              100% Operativo
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase">
                <CalendarCheck size={14} className="text-indigo-600" /> Citas Agendadas
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {data?.aiPerformance?.appointmentsBookedByAi ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Directas al calendario</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase">
                <TrendingUp size={14} className="text-blue-600" /> Etapas Avanzadas
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {data?.aiPerformance?.stagesMovedByAi ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Transiciones en Kanban</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase">
                <Clock size={14} className="text-purple-600" /> Tareas Asignadas
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {data?.aiPerformance?.tasksGeneratedByAi ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Con fecha y hora límite</div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 uppercase">
                <DollarSign size={14} className="text-emerald-600" /> Cierres Auditados
              </div>
              <div className="text-2xl font-bold text-emerald-900 mt-2">
                ${(data?.aiPerformance?.totalWonValue ?? 0).toLocaleString('es-MX')}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                {data?.aiPerformance?.dealsWonRecorded ?? 0} tratos registrados
              </div>
            </div>
          </div>
        </Card>

        {/* Tarjeta 2: Semáforo del Equipo Humano */}
        <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Salud Operativa del Equipo</h3>
                  <p className="text-xs text-slate-500">Monitoreo de omisiones y respuesta de asesores</p>
                </div>
              </div>
            </div>

            {/* Tabla de Vendedores */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="pb-2">Asesor</th>
                    <th className="pb-2 text-center">Cumplimiento</th>
                    <th className="pb-2 text-center">Omisiones</th>
                    <th className="pb-2 text-right">Dinero en Limbo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!data?.teamCompliance || data.teamCompliance.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                        No hay tareas de seguimiento registradas aún.
                      </td>
                    </tr>
                  ) : (
                    data.teamCompliance.map((rep) => (
                      <tr key={rep.userId} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{rep.name}</div>
                          <div className="text-[11px] text-slate-400">{rep.email || 'Sin correo'}</div>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                            rep.health === 'green' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : rep.health === 'yellow' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {rep.complianceRate}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {rep.escalated > 0 ? (
                            <span className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1">
                              <AlertCircle size={12} /> {rep.escalated} alertas
                            </span>
                          ) : rep.missed > 0 ? (
                            <span className="text-xs font-medium text-amber-600">
                              {rep.missed} pendientes
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">Al día</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-medium text-slate-700 text-xs">
                          ${rep.pendingDealValue.toLocaleString('es-MX')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>🟢 80% o más: Al día</span>
            <span>🟡 50% - 79%: Advertencia</span>
            <span>🔴 Menos de 50%: Crítico (Escalado)</span>
          </div>
        </Card>
      </div>

      {/* Feed en Vivo de Auditoría */}
      <Card className="p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Bitácora de Auditoría en Tiempo Real</h3>
            <p className="text-xs text-slate-500">Registro inmutable de todas las acciones ejecutadas por el Pipeline Agent</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">agent_audit_log</span>
        </div>

        <div className="mt-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {(!data?.recentAuditFeed || data.recentAuditFeed.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No hay acciones registradas en la bitácora todavía.
            </div>
          ) : (
            data.recentAuditFeed.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  {getEventBadge(log.event_type)}
                  <div>
                    <span className="font-medium text-slate-800">
                      {log.contacts?.name ? `Prospecto: ${log.contacts.name}` : 'Acción del Sistema'}
                    </span>
                    {log.users?.name && (
                      <span className="text-slate-400 ml-2">→ Asesor: {log.users.name}</span>
                    )}
                    {log.detail?.reason && (
                      <div className="text-slate-500 text-[11px] mt-0.5 italic">
                        "{log.detail.reason}"
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('es-MX', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
