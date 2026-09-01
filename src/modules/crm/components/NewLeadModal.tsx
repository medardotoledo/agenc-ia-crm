import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { STAGE_META, TEMP_META } from '@/lib/data/mock'
import type { Stage, Temperature } from '@/types'

const FIELD = 'w-full rounded-lg border border-line bg-app p-2.5 text-sm outline-none focus:border-primary-light'
const LABEL = 'mb-1 block text-xs font-semibold text-ink-soft'

export default function NewLeadModal() {
  const { newLeadOpen, newLeadStage, closeNewLead, openLead } = useApp()
  const stageLabels = useApp((s) => s.stageLabels)
  const { addLead } = useLeads()
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', value: '', stage: '' as string, temperature: 'warm' })

  if (!newLeadOpen) return null
  const stage = (form.stage || newLeadStage || 'nuevo') as Stage

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = () => {
    if (!form.name.trim()) return
    addLead({
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      value: Number(form.value) || 0,
      stage,
      temperature: form.temperature as Temperature,
    })
    setForm({ name: '', company: '', phone: '', email: '', value: '', stage: '', temperature: 'warm' })
    closeNewLead()
    // abrir el panel del lead recién creado (es el último de la lista)
    setTimeout(() => {
      const leads = useLeads.getState().leads
      openLead(leads[leads.length - 1].id, 'perfil')
    }, 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 p-4" onClick={closeNewLead}>
      <div className="animate-rise w-full max-w-md rounded-2xl bg-app shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stage-new-bg text-stage-new-text">
            <UserPlus size={16} />
          </span>
          <h2 className="flex-1 font-bold">Nuevo lead</h2>
          <button onClick={closeNewLead} className="rounded-lg p-1.5 text-ink-soft hover:bg-soft" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input autoFocus value={form.name} onChange={set('name')} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Nombre del prospecto" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Empresa</label>
            <input value={form.company} onChange={set('company')} placeholder="Nombre de la empresa" className={FIELD} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Teléfono / WhatsApp</label>
              <input value={form.phone} onChange={set('phone')} placeholder="+52…" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input value={form.email} onChange={set('email')} placeholder="correo@…" className={FIELD} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Valor ($)</label>
              <input value={form.value} onChange={set('value')} placeholder="0" inputMode="numeric" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Etapa</label>
              <select value={stage} onChange={set('stage')} className={FIELD}>
                {Object.entries(STAGE_META).map(([k, m]) => (
                  <option key={k} value={k}>{stageLabels[k] ?? m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Temperatura</label>
              <select value={form.temperature} onChange={set('temperature')} className={FIELD}>
                {Object.entries(TEMP_META).filter(([k]) => k !== 'lost').map(([k, m]) => (
                  <option key={k} value={k}>{m.icon} {m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={closeNewLead} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-soft">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!form.name.trim()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-inverse hover:bg-primary-light disabled:opacity-40"
          >
            Crear lead
          </button>
        </div>
      </div>
    </div>
  )
}
