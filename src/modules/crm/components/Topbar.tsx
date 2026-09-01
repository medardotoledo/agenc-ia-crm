import { Menu, Sparkles, Bell, Table2, Kanban as KanbanIcon, FileSpreadsheet, Plus } from 'lucide-react'
import { useApp } from '@/store/useApp'
import { STATS, USER } from '@/lib/data/mock'
import type { ViewMode } from '@/types'

const VIEWS: { id: ViewMode; label: string; Icon: typeof Table2 }[] = [
  { id: 'tabla', label: 'Tabla', Icon: Table2 },
  { id: 'kanban', label: 'Kanban', Icon: KanbanIcon },
  { id: 'excel', label: 'Excel', Icon: FileSpreadsheet },
]

export default function Topbar() {
  const { section, view, setView, toggleSidebar, openNewLead, me } = useApp()
  const isLeads = section === 'leads'
  const initials = (me?.name ?? USER.fullName).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-app px-4 py-3 lg:px-6">
      <button className="text-ink-soft lg:hidden" onClick={toggleSidebar} aria-label="Abrir menú">
        <Menu size={20} />
      </button>

      {isLeads && (
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight">Leads</h1>
          <span className="hidden rounded-lg bg-soft px-2 py-1 text-center text-[11px] leading-tight font-semibold text-ink-soft sm:block">
            {STATS.total}<br />total
          </span>
          <span className="hidden rounded-lg bg-temp-hot-bg px-2 py-1 text-center text-[11px] leading-tight font-semibold text-temp-hot-text sm:block">
            🔥 {STATS.hot}<br />calientes
          </span>
          <span className="hidden rounded-lg bg-stage-new-bg px-2 py-1 text-center text-[11px] leading-tight font-semibold text-stage-new-text md:block">
            ✦ +{STATS.newToday}<br />nuevos hoy
          </span>
        </div>
      )}

      {/* Barra de comandos IA — siempre visible al centro */}
      <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1 lg:px-4">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-soft px-3 py-2 text-sm text-ink-soft transition-colors focus-within:border-primary-light">
          <Sparkles size={15} className="text-accent" />
          <input
            className="w-full bg-transparent outline-none placeholder:text-ink-soft/70"
            placeholder="Pregúntale algo a tu CRM… ej: leads calientes sin seguimiento esta semana"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 lg:ml-0">
        {isLeads && (
          <>
            <div className="hidden items-center rounded-lg border border-line bg-app p-0.5 md:flex">
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
          </>
        )}
        <button className="relative rounded-lg p-2 text-ink-soft hover:bg-soft" aria-label="Notificaciones">
          <Bell size={18} />
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-inverse">3</span>
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-inverse" title={me?.name}>
          {initials}
        </div>
      </div>
    </header>
  )
}
