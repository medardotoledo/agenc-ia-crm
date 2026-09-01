import { Users, Kanban, BarChart3, CalendarDays, MessageSquare, ClipboardList, Settings, X, LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { useApp } from '@/store/useApp'
import { USER } from '@/lib/data/mock'
import type { Section } from '@/types'

const NAV: { group: string; items: { id: Section; label: string; Icon: typeof Users }[] }[] = [
  {
    group: 'PRINCIPAL',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
      { id: 'leads', label: 'Leads', Icon: Users },
      { id: 'calendario', label: 'Calendario', Icon: CalendarDays },
      { id: 'reportes', label: 'Reportes', Icon: Kanban },
    ],
  },
  {
    group: 'GESTIÓN',
    items: [
      { id: 'conversaciones', label: 'Conversaciones', Icon: MessageSquare },
      { id: 'actividades', label: 'Actividades', Icon: ClipboardList },
    ],
  },
  {
    group: 'CONFIG',
    items: [{ id: 'ajustes', label: 'Ajustes', Icon: Settings }],
  },
]

export default function Sidebar() {
  const { section, setSection, sidebarOpen, toggleSidebar, conversations, me } = useApp()
  const unread = conversations.reduce((a, c) => a + c.unread, 0)

  return (
    <>
      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-dark/60 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-inverse transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-8">
          <div>
            <div className="text-lg font-bold tracking-tight">Lead-Suite</div>
            <div className="text-[10px] font-bold tracking-[0.14em] text-accent">BY MARCADOTECN-IA</div>
          </div>
          <button className="text-inverse/50 lg:hidden" onClick={toggleSidebar} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-2 pb-2 text-[10px] font-bold tracking-[0.18em] text-inverse/35">{g.group}</div>
              <div className="space-y-0.5">
                {g.items.map(({ id, label, Icon }) => {
                  const active = section === id
                  return (
                    <button
                      key={id}
                      onClick={() => setSection(id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-inverse shadow-[inset_2px_0_0_var(--color-accent)]'
                          : 'text-inverse/60 hover:bg-inverse/5 hover:text-inverse'
                      }`}
                    >
                      <Icon size={16} strokeWidth={2.2} />
                      <span className="flex-1 text-left">{label}</span>
                      {id === 'conversaciones' && unread > 0 && (
                        <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-inverse">
                          {unread}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="m-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-accent">{me?.name ?? USER.team}</div>
            <div className="text-[11px] text-inverse/50">{me ? me.role.replace('_', ' ') : `${USER.members} miembros activos`}</div>
          </div>
          {me && (
            <button
              onClick={() => signOut().then(() => location.reload())}
              title="Cerrar sesión"
              className="shrink-0 rounded-lg p-1.5 text-inverse/40 hover:bg-inverse/10 hover:text-inverse"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
