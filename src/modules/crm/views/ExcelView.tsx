import { useRef, useState } from 'react'
import { Plus, Columns3, Filter, Search, FileSpreadsheet } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { STAGE_META, TEMP_META } from '@/lib/data/mock'
import type { Lead } from '@/types'

type Col = { key: keyof Lead | 'notas'; label: string; width: string }

const COLS: Col[] = [
  { key: 'name', label: 'Nombre', width: 'min-w-40' },
  { key: 'company', label: 'Empresa', width: 'min-w-40' },
  { key: 'phone', label: 'TelÃ©fono', width: 'min-w-32' },
  { key: 'stage', label: 'Etapa', width: 'min-w-32' },
  { key: 'value', label: 'Valor $', width: 'min-w-28' },
  { key: 'temperature', label: 'Temperatura', width: 'min-w-32' },
  { key: 'notas', label: 'Notas', width: 'min-w-48' },
  { key: 'dueDate', label: 'Seguimiento', width: 'min-w-32' },
]

export default function ExcelView() {
  const { leads, updateLead, addLead } = useLeads()
  const { openLead, notes } = useApp()
  const stageLabels = useApp((s) => s.stageLabels)
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null)
  const [draft, setDraft] = useState('')
  const newRowName = useRef<HTMLInputElement>(null)

  const startEdit = (lead: Lead, key: string) => {
    if (key === 'notas') { openLead(lead.id); return }
    setEditing({ id: lead.id, key })
    setDraft(String(lead[key as keyof Lead] ?? ''))
  }

  const commit = () => {
    if (!editing) return
    const { id, key } = editing
    const patch: Partial<Lead> =
      key === 'value' ? { value: Number(draft.replace(/[^0-9.]/g, '')) || 0 } : { [key]: draft }
    updateLead(id, patch)
    setEditing(null)
  }

  const lastNote = (id: string) => notes.find((n) => n.leadId === id)?.content

  const cellBase = 'border-r border-b border-line px-3 py-2 text-sm last:border-r-0'

  return (
    <div className="animate-rise p-4 lg:p-6">
      {/* Toolbar Excel */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { addLead({}); }}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-sm font-semibold hover:bg-soft"
        >
          <Plus size={14} /> Fila
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-sm font-semibold hover:bg-soft">
          <Columns3 size={14} /> Columna
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-sm font-semibold hover:bg-soft">
          <Filter size={14} /> Filtro
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-2 text-sm font-semibold hover:bg-soft">
          <Search size={14} /> Buscar
        </button>
        <button className="ml-auto flex items-center gap-1.5 rounded-lg bg-success px-3 py-2 text-sm font-bold text-inverse hover:opacity-90">
          <FileSpreadsheet size={14} /> Exportar a Excel (.xlsx)
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-line bg-app">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="bg-soft text-left text-[11px] font-bold tracking-wider text-ink-soft uppercase">
              <th className={`${cellBase} w-10 text-center`}>#</th>
              {COLS.map((c) => (
                <th key={c.key} className={`${cellBase} ${c.width}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l, i) => (
              <tr key={l.id} className="transition-colors hover:bg-soft/60">
                <td className={`${cellBase} bg-soft text-center text-xs font-semibold text-ink-soft`}>{i + 1}</td>
                {COLS.map((c) => {
                  const isEditing = editing?.id === l.id && editing.key === c.key

                  if (isEditing && (c.key === 'stage' || c.key === 'temperature')) {
                    const opts = c.key === 'stage' ? (Object.keys(stageLabels).length > 0 ? Object.keys(stageLabels) : Object.keys(STAGE_META)) : Object.keys(TEMP_META)
                    const labels = c.key === 'stage' ? STAGE_META : TEMP_META
                    return (
                      <td key={c.key} className={`${cellBase} bg-stage-new-bg/30 p-0`}>
                        <select
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commit}
                          onKeyDown={(e) => e.key === 'Enter' && commit()}
                          className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                        >
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {c.key === 'stage'
                                ? (stageLabels[o] ?? (labels as Record<string, { label: string }>)[o]?.label ?? o)
                                : (labels as Record<string, { label: string }>)[o].label}
                            </option>
                          ))}
                        </select>
                      </td>
                    )
                  }

                  if (isEditing) {
                    return (
                      <td key={c.key} className={`${cellBase} bg-stage-new-bg/30 p-0`}>
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commit}
                          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(null) }}
                          className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                        />
                      </td>
                    )
                  }

                  let content: React.ReactNode = String(l[c.key as keyof Lead] ?? '')
                  if (c.key === 'stage') {
                    const m = STAGE_META[l.stage] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', label: 'Etapa' }
                    content = <span className={`${m.bg} ${m.text} rounded-full px-2 py-0.5 text-xs font-semibold`}>{stageLabels[l.stage] ?? m.label}</span>
                  }
                  if (c.key === 'temperature') {
                    const m = TEMP_META[l.temperature] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: '❓', label: 'Desconocido' }
                    content = <span className={`${m.bg} ${m.text} rounded-full px-2 py-0.5 text-xs font-semibold`}>{m.icon} {m.label}</span>
                  }
                  if (c.key === 'value') content = <span className="font-semibold">${l.value.toLocaleString()}</span>
                  if (c.key === 'dueDate') content = new Date(l.dueDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
                  if (c.key === 'notas') {
                    const n = lastNote(l.id)
                    content = n
                      ? <span className="text-xs text-ink-soft italic">{n.length > 38 ? n.slice(0, 38) + 'â€¦' : n}</span>
                      : <span className="text-xs text-ink-soft/40 italic">Click para agregar nota</span>
                  }

                  return (
                    <td
                      key={c.key}
                      onClick={() => startEdit(l, c.key)}
                      className={`${cellBase} cursor-cell whitespace-nowrap transition-colors hover:bg-stage-new-bg/20`}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Fila vacÃ­a de alta rÃ¡pida */}
            <tr className="bg-soft/40">
              <td className={`${cellBase} bg-soft text-center text-xs font-semibold text-ink-soft`}>{leads.length + 1}</td>
              <td className={`${cellBase} p-0`} colSpan={COLS.length}>
                <input
                  ref={newRowName}
                  placeholder="Nuevo leadâ€¦ escribe el nombre y presiona Enter"
                  onKeyDown={(e) => {
                    const v = (e.target as HTMLInputElement).value.trim()
                    if (e.key === 'Enter' && v) {
                      addLead({ name: v })
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink-soft/50"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-soft/60">Click en cualquier celda para editar en lÃ­nea Â· Enter guarda Â· Esc cancela Â· La celda de notas abre el panel lateral</p>
    </div>
  )
}



