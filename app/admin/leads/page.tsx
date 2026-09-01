'use client';

/**
 * Módulo CRM · Workspace de Leads (pipeline)
 * Reutiliza las vistas del CRM (Kanban/Tabla/Excel) + panel de detalle + alta,
 * scopeadas a la SUBCUENTA ACTIVA. La carga de datos la hace el store
 * (useApp.loadAccountData) contra el espejo en Supabase.
 */

import { useEffect } from 'react';
import { Table2, Kanban as KanbanIcon, FileSpreadsheet, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useApp } from '@/store/useApp';
import { useCrmData } from '@/modules/crm/useCrmData';
import type { ViewMode } from '@/types';
import KanbanView from '@/modules/crm/views/KanbanView';
import TableView from '@/modules/crm/views/TableView';
import ExcelView from '@/modules/crm/views/ExcelView';
import CalendarView from '@/modules/crm/views/CalendarView';
import LeadPanel from '@/modules/crm/components/LeadPanel';
import NewLeadModal from '@/modules/crm/components/NewLeadModal';

const VIEWS: { id: ViewMode; label: string; Icon: typeof Table2 }[] = [
  { id: 'tabla', label: 'Tabla', Icon: Table2 },
  { id: 'kanban', label: 'Kanban', Icon: KanbanIcon },
  { id: 'excel', label: 'Excel', Icon: FileSpreadsheet },
  { id: 'calendario', label: 'Citas / Calendario', Icon: CalendarIcon },
];

export default function LeadsPage() {
  const { account, loading } = useCrmData();
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const setSection = useApp((s) => s.setSection);
  const openNewLead = useApp((s) => s.openNewLead);
  const cloud = useApp((s) => s.cloud);

  useEffect(() => {
    setSection('leads');
  }, [setSection]);

  if (loading) return <div className="p-8 text-ink-soft">Cargando...</div>;
  if (!account) return null;

  return (
    <div className="space-y-5">
      {/* Toolbar del módulo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Prospectos</h1>
          {!cloud && <span className="rounded-md bg-soft px-2 py-1 text-xs text-ink-soft">sin pipeline configurado</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-lg border border-line bg-app p-0.5 sm:flex">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  view === id ? 'bg-primary text-inverse' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNewLead()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-inverse hover:bg-primary-light"
          >
            <Plus size={15} /> <span className="hidden sm:inline">Nuevo lead</span>
          </button>
        </div>
      </div>

      {/* Vista activa */}
      {view === 'kanban' ? (
        <KanbanView />
      ) : view === 'excel' ? (
        <ExcelView />
      ) : view === 'calendario' ? (
        <CalendarView />
      ) : (
        <TableView />
      )}

      {/* Panel de detalle + modal de alta (se muestran según estado del store) */}
      <LeadPanel />
      <NewLeadModal />
    </div>
  );
}
