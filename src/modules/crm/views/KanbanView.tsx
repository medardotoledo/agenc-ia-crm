import { useState } from 'react'
import { Plus, CalendarDays, Zap, Clock } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { Avatar, ChannelDot } from '@/modules/crm/components/ui'
import { STAGE_META, TEMP_META, money, dueLabel } from '@/lib/data/mock'
import type { Lead, Stage } from '@/types'

const URGENCY_DOT: Record<string, string> = {
  hot: 'bg-accent', warm: 'bg-success', cold: 'bg-ink-soft/40', lost: 'bg-danger',
}

function LeadCard({ lead, onDragStart }: { lead: Lead; onDragStart: (e: React.DragEvent) => void }) {
  const { openLead } = useApp()
  const due = dueLabel(lead.dueDate)
  const dueToday = due.text === 'Hoy'
  const ready = lead.stage === 'cierre'
  const lost = lead.stage === 'perdido'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => openLead(lead.id)}
      className={`cursor-pointer rounded-xl border bg-app p-3 shadow-xs transition-shadow hover:shadow-md ${
        dueToday ? 'border-primary-light ring-1 ring-primary-light/30' : ready ? 'border-success/50' : 'border-line'
      } ${lost ? 'opacity-60' : ''}`}
    >
      {ready && (
        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wide text-success uppercase">
          <Zap size={11} /> Listo para cerrar
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <Avatar name={lead.name} size="sm" />
          {lead.channels[0] && (
            <span className="absolute -right-1 -bottom-1"><ChannelDot channel={lead.channels[0]} size={14} /></span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm leading-tight font-semibold">{lead.name}</p>
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[lead.temperature]}`} />
          </div>
          <p className="truncate text-xs text-ink-soft">{lead.company}</p>
        </div>
      </div>
      {dueToday && (
        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-warning">
          <Clock size={12} /> Vence hoy
        </div>
      )}
      <p className={`mt-1.5 font-bold ${lost ? 'text-ink-soft line-through' : 'text-primary-light'}`}>{money(lead.value)}</p>
      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((t) => (
            <span key={t.id} style={{ background: t.color }} className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-ink">
              {t.name}
            </span>
          ))}
        </div>
      )}
      {lead.unread > 0 && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-stage-new-bg px-2 py-0.5 text-[10px] font-bold text-stage-new-text">
          ðŸ’¬ {lead.unread} nuevo{lead.unread > 1 ? 's' : ''}
        </span>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2 text-xs text-ink-soft">
        <span className="flex items-center gap-1"><CalendarDays size={11} /> {due.text === 'Hoy' || due.text === 'MaÃ±ana' ? due.text : due.text}</span>
        <span>{(TEMP_META[lead.temperature]?.icon || '❓')}</span>
      </div>
    </div>
  )
}

export default function KanbanView() {
  const { stageLabels } = useApp()
  const STAGES = Object.keys(stageLabels)
  const { leads, updateLead } = useLeads()
  const openNewLead = useApp((s) => s.openNewLead)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)

  const drop = (stage: Stage) => {
    if (dragId) {
      updateLead(dragId, { stage })
    }
    setDragId(null); setOverStage(null)
  }

  return (
    <div className="animate-rise flex h-full gap-4 overflow-x-auto p-4 lg:p-6">
      {STAGES.map((stage) => {
        const items = leads.filter((l) => l.stage === stage)
        const label = stageLabels[stage] || stage
        return (
          <div
            key={stage}
            onDragOver={(e) => { e.preventDefault(); setOverStage(stage) }}
            onDragLeave={() => setOverStage(null)}
            onDrop={() => drop(stage)}
            className={`flex w-64 shrink-0 flex-col rounded-xl transition-colors ${overStage === stage ? 'bg-stage-new-bg/40' : ''}`}
          >
            <div className="h-1.5 rounded-full bg-primary" />
            <div className="flex items-center justify-between px-1 py-3">
              <span className="text-xs font-bold tracking-[0.12em] text-ink-soft uppercase">{label}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-line-soft text-[11px] font-bold text-ink-soft">{items.length}</span>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto pb-2">
              {items.map((l) => (
                <LeadCard key={l.id} lead={l} onDragStart={() => setDragId(l.id)} />
              ))}
              <button
                onClick={() => openNewLead(stage)}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary-light hover:text-primary-light"
              >
                <Plus size={12} />
                <span>Nuevo prospecto</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

