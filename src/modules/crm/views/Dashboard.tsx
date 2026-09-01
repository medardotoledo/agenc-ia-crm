import { Users, DollarSign, Target, Flame, Phone, MessageCircle, Mail as MailIcon, UserPlus } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { Card } from '@/modules/crm/components/ui'
import { STAGE_META, money } from '@/lib/data/mock'
import type { Stage } from '@/types'

/**
 * Dashboard del CRM — métricas REALES calculadas desde los leads cargados
 * de la subcuenta activa. No se muestran datos que aún no tenemos
 * (histórico semanal, ranking de equipo, tareas) para evitar cifras falsas.
 */

function Metric({ Icon, label, value }: { Icon: typeof Users; label: string; value: string }) {
  return (
    <Card className="bg-soft p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
    </Card>
  )
}

const STAGE_ORDER: Stage[] = ['nuevo', 'contactado', 'propuesta', 'cierre', 'perdido']
const SOURCE_COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#e1306c', '#7c3aed', '#0ea5e9', '#64748b']
const ACT_ICON = { call: Phone, whatsapp: MessageCircle, email: MailIcon, note: UserPlus } as const
const ACT_COLOR = { call: 'bg-call-bg text-call-text', whatsapp: 'bg-wa-bg text-wa-text', email: 'bg-mail-bg text-mail-text', note: 'bg-note-bg text-note-text' } as const

export default function Dashboard() {
  const { me, notes } = useApp()
  const stageLabels = useApp((s) => s.stageLabels)
  const { leads } = useLeads()
  const firstName = (me?.name ?? 'Usuario').split(' ')[0]

  // ---- Métricas reales ----
  const total = leads.length
  const pipelineValue = leads.reduce((a, l) => a + (l.value || 0), 0)
  const hot = leads.filter((l) => l.temperature === 'hot').length
  const won = leads.filter((l) => l.stage === 'cierre').length
  const lost = leads.filter((l) => l.stage === 'perdido').length
  const closeRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0

  const stageCounts = STAGE_ORDER.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length }))
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count))

  // Por fuente
  const bySource = new Map<string, number>()
  for (const l of leads) bySource.set(l.source || 'Otro', (bySource.get(l.source || 'Otro') ?? 0) + 1)
  const sources = [...bySource.entries()].map(([label, value], i) => ({ label, value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))
  const sourceTotal = sources.reduce((a, s) => a + s.value, 0) || 1

  return (
    <div className="animate-rise space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {firstName}</h1>
        <p className="text-sm text-ink-soft">Resumen de tu pipeline</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric Icon={Users} label="Total leads" value={String(total)} />
        <Metric Icon={DollarSign} label="Valor del pipeline" value={money(pipelineValue).replace(',000', 'k')} />
        <Metric Icon={Target} label="Tasa de cierre" value={`${closeRate}%`} />
        <Metric Icon={Flame} label="Calientes" value={String(hot)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pipeline por etapa */}
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Estado del pipeline</h2>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-24 text-xs text-ink-soft">{stageLabels[stage] ?? STAGE_META[stage].label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                  <div className={`h-full rounded-full ${STAGE_META[stage].bar}`} style={{ width: `${(count / maxStage) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-bold">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Por fuente */}
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Leads por fuente</h2>
          {sources.length === 0 ? (
            <p className="text-sm text-ink-soft">Aún no hay leads.</p>
          ) : (
            <div className="space-y-2">
              {sources.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                  <span className="text-ink-soft">{s.label}</span>
                  <span className="ml-auto font-semibold">{Math.round((s.value / sourceTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Actividad reciente (notas reales) */}
      <Card className="p-5">
        <h2 className="mb-4 font-bold">Actividad reciente</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin actividad todavía.</p>
        ) : (
          <div className="space-y-4">
            {notes.slice(0, 6).map((n) => {
              const Icon = ACT_ICON[n.type] ?? UserPlus
              const color = ACT_COLOR[n.type] ?? ACT_COLOR.note
              return (
                <div key={n.id} className="flex gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.content}</p>
                    <p className="text-xs text-ink-soft">{n.createdAt} · {n.author}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
