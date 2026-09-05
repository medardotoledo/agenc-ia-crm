import { useState } from 'react'
import { Search, Phone, StickyNote, MessageCircle, ChevronDown, ArrowUpDown } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { Avatar, StagePill, TempBadge, ScoreBar } from '@/modules/crm/components/ui'
import { money, dueLabel } from '@/lib/data/mock'
import { openWhatsApp } from '@/lib/whatsapp'
import type { Lead } from '@/types'

type SortKey = 'name' | 'value' | 'score'

export default function TableView() {
  const { leads } = useLeads()
  const { openLead, notes } = useApp()
  const [q, setQ] = useState('')
  const [stageFilter, setStageFilter] = useState('todas')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'score', dir: -1 })

  const lastNote = (l: Lead) => notes.find((n) => n.leadId === l.id)
  const noteCount = (l: Lead) => notes.filter((n) => n.leadId === l.id).length

  const filtered = leads
    .filter((l) => (stageFilter === 'todas' ? true : l.stage === stageFilter))
    .filter((l) => (q ? (l.name + (l.company || '') + (l.email || '') + (l.phone || '')).toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => {
      const va = a[sort.key], vb = b[sort.key]
      return (typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * sort.dir
    })

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }))

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  return (
    <div className="animate-rise p-4 lg:p-6">
      {/* Toolbar de filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-app px-3 py-2">
          <Search size={14} className="text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscarâ€¦"
            className="w-28 bg-transparent text-sm outline-none sm:w-40"
          />
        </div>
        <div className="relative">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="appearance-none rounded-lg border border-line bg-app py-2 pr-8 pl-3 text-sm font-medium"
          >
            <option value="todas">Todas las etapas</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="propuesta">Propuesta</option>
            <option value="cierre">Cierre</option>
            <option value="perdido">Perdido</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-soft" />
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-sm font-medium text-ink-soft">
          Todos los responsables <ChevronDown size={14} />
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-sm font-medium text-ink-soft">
          Esta semana <ChevronDown size={14} />
        </button>
        {selected.size > 0 && (
          <span className="ml-auto rounded-lg bg-stage-new-bg px-3 py-2 text-sm font-semibold text-stage-new-text">
            {selected.size} seleccionados
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-line bg-app">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line bg-soft text-left text-[11px] font-bold tracking-wider text-ink-soft uppercase">
              <th className="w-10 px-4 py-3" />
              <th className="cursor-pointer px-2 py-3" onClick={() => toggleSort('name')}>
                <span className="flex items-center gap-1">Lead <ArrowUpDown size={11} /></span>
              </th>
              <th className="px-2 py-3">Etapa</th>
              <th className="px-2 py-3">Temperatura</th>
              <th className="cursor-pointer px-2 py-3" onClick={() => toggleSort('value')}>
                <span className="flex items-center gap-1">Valor <ArrowUpDown size={11} /></span>
              </th>
              <th className="cursor-pointer px-2 py-3" onClick={() => toggleSort('score')}>
                <span className="flex items-center gap-1">Score <ArrowUpDown size={11} /></span>
              </th>
              <th className="px-2 py-3">Ãšltima nota</th>
              <th className="px-2 py-3">Vence</th>
              <th className="w-28 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const lost = l.stage === 'perdido'
              const due = dueLabel(l.dueDate)
              const note = lastNote(l)
              return (
                <tr
                  key={l.id}
                  onClick={() => openLead(l.id)}
                  className={`group cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-soft ${lost ? 'opacity-55' : ''}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="accent-(--color-primary)" />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={l.name} />
                      <div className="min-w-0">
                        <div className="font-semibold">{l.name}</div>
                        <div className="truncate text-xs text-ink-soft">{l.company}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3"><StagePill stage={l.stage} /></td>
                  <td className="px-2 py-3"><TempBadge temp={l.temperature} /></td>
                  <td className={`px-2 py-3 font-bold ${lost ? 'text-ink-soft line-through' : 'text-primary-light'}`}>{money(l.value)}</td>
                  <td className="px-2 py-3"><ScoreBar score={l.score} lost={lost} /></td>
                  <td className="max-w-44 px-2 py-3">
                    {note ? (
                      <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-note-bg text-[10px] font-bold text-note-text">{noteCount(l)}</span>
                        <span className="truncate">{note.content}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-ink-soft/50">â€”</span>
                    )}
                  </td>
                  <td className={`px-2 py-3 text-xs ${due.cls}`}>{due.text}</td>
                  <td className="px-2 py-3">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <a href={`tel:${l.phone}`} className="rounded-md p-1.5 text-call-text hover:bg-call-bg" title="Llamar"><Phone size={14} /></a>
                      <button onClick={() => openLead(l.id)} className="rounded-md p-1.5 text-note-text hover:bg-note-bg" title="Nota"><StickyNote size={14} /></button>
                      <button onClick={() => openWhatsApp(l.phone)} className="rounded-md p-1.5 text-wa-text hover:bg-wa-bg" title="WhatsApp"><MessageCircle size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

