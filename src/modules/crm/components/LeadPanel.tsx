import { useState } from 'react'
import { X, Phone, Mail, MessageCircle, StickyNote, Send, UserRound } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { Avatar, StageSelect, CHANNEL_LABEL } from './ui'
import { TagEditor } from './TagEditor'
import { STAGE_META, TEMP_META } from '@/lib/data/mock'
import { openWhatsApp } from '@/lib/whatsapp'
import type { NoteType, Lead, Stage, Temperature } from '@/types'

const NOTE_TYPES: { id: NoteType; label: string; bg: string; text: string }[] = [
  { id: 'note', label: 'Nota', bg: 'bg-note-bg', text: 'text-note-text' },
  { id: 'call', label: 'Llamada', bg: 'bg-call-bg', text: 'text-call-text' },
  { id: 'whatsapp', label: 'WhatsApp', bg: 'bg-wa-bg', text: 'text-wa-text' },
  { id: 'email', label: 'Email', bg: 'bg-mail-bg', text: 'text-mail-text' },
]

const PLACEHOLDER: Record<NoteType, string> = {
  note: 'Escribe una nota rápida…',
  call: '¿Cómo estuvo la llamada? Resultado, acuerdos…',
  whatsapp: 'Resumen de la conversación por WhatsApp…',
  email: 'Resumen del correo enviado o recibido…',
}

const FIELD = 'w-full rounded-lg border border-line bg-app p-2.5 text-sm outline-none focus:border-primary-light'
const LABEL = 'mb-1 block text-xs font-semibold text-ink-soft'

/* Editor de datos del lead — guarda al salir del campo (igual que la vista Excel) */
function ProfileTab({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads()
  const stageLabels = useApp((s) => s.stageLabels)
  const save = (k: keyof Lead) => (e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value
    const v = k === 'value' ? Number(String(raw).replace(/[^0-9.]/g, '')) || 0 : raw
    if (v !== lead[k]) updateLead(lead.id, { [k]: v })
  }
  return (
    <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4" key={lead.id}>
      <div>
        <label className={LABEL}>Nombre</label>
        <input defaultValue={lead.name} onBlur={save('name')} className={FIELD} />
      </div>
      <div>
        <label className={LABEL}>Empresa</label>
        <input defaultValue={lead.company} onBlur={save('company')} className={FIELD} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Teléfono / WhatsApp</label>
          <input defaultValue={lead.phone} onBlur={save('phone')} placeholder="+52…" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input defaultValue={lead.email} onBlur={save('email')} className={FIELD} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Valor ($)</label>
          <input defaultValue={lead.value} onBlur={save('value')} inputMode="numeric" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Etapa</label>
          <select value={lead.stage} onChange={(e) => updateLead(lead.id, { stage: e.target.value as Stage })} className={FIELD}>
            {Object.entries(STAGE_META).map(([k, m]) => <option key={k} value={k}>{stageLabels[k] ?? m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Temperatura</label>
          <select value={lead.temperature} onChange={(e) => updateLead(lead.id, { temperature: e.target.value as Temperature })} className={FIELD}>
            {Object.entries(TEMP_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL}>Etiquetas</label>
        <TagEditor lead={lead} />
      </div>
      <p className="pt-1 text-[11px] text-ink-soft">Los cambios se guardan automáticamente al salir de cada campo ✓</p>
    </div>
  )
}

export default function LeadPanel() {
  const { selectedLeadId, closePanel, panelTab, openLead, notes, messages, addNote, sendMessage } = useApp()
  const { leads, updateLead } = useLeads()
  const [noteType, setNoteType] = useState<NoteType>('note')
  const [text, setText] = useState('')
  const [chatText, setChatText] = useState('')

  const lead = leads.find((l) => l.id === selectedLeadId)
  if (!lead) return null

  const leadNotes = notes.filter((n) => n.leadId === lead.id)
  const leadMessages = messages.filter((m) => m.leadId === lead.id)

  const saveNote = () => {
    if (!text.trim()) return
    addNote(lead.id, noteType, text.trim())
    setText('')
  }

  const sendChat = () => {
    if (!chatText.trim()) return
    sendMessage(lead.id, lead.channels[0] ?? 'whatsapp', chatText.trim())
    setChatText('')
  }

  return (
    <>
      {/* Backdrop móvil */}
      <div className="fixed inset-0 z-40 bg-dark/40 lg:hidden" onClick={closePanel} />

      <aside className="animate-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-app shadow-2xl sm:w-105">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Avatar name={lead.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold">{lead.name}</h2>
            <p className="truncate text-sm text-ink-soft">{lead.company}</p>
          </div>
          <StageSelect
            value={lead.stage}
            onChange={(s) => updateLead(lead.id, s === 'perdido' ? { stage: s, temperature: 'lost' } : { stage: s })}
          />
          <button onClick={closePanel} className="rounded-lg p-1.5 text-ink-soft hover:bg-soft" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Hub de comunicación */}
        <div className="flex gap-2 border-b border-line px-5 py-3">
          <a href={`tel:${lead.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-call-bg py-2 text-xs font-bold text-call-text hover:opacity-80">
            <Phone size={13} /> Llamar
          </a>
          <button onClick={() => openWhatsApp(lead.phone)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-wa-bg py-2 text-xs font-bold text-wa-text hover:opacity-80">
            <MessageCircle size={13} /> WhatsApp
          </button>
          <a href={`mailto:${lead.email}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-mail-bg py-2 text-xs font-bold text-mail-text hover:opacity-80">
            <Mail size={13} /> Email
          </a>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line px-5">
          {(['perfil', 'notas', 'chat'] as const).map((t) => (
            <button
              key={t}
              onClick={() => openLead(lead.id, t)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                panelTab === t ? 'border-primary-light text-primary-light' : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t === 'perfil' ? <UserRound size={14} /> : t === 'notas' ? <StickyNote size={14} /> : <MessageCircle size={14} />} {t}
            </button>
          ))}
        </div>

        {panelTab === 'perfil' ? (
          <ProfileTab lead={lead} />
        ) : panelTab === 'notas' ? (
          <>
            {/* Historial de notas */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {leadNotes.length === 0 && (
                <p className="pt-8 text-center text-sm text-ink-soft">Sin notas todavía. Escribe la primera abajo. 👇</p>
              )}
              {leadNotes.map((n) => {
                const t = NOTE_TYPES.find((x) => x.id === n.type)!
                return (
                  <div key={n.id} className="rounded-xl border border-line-soft bg-soft/60 p-3">
                    <span className={`${t.bg} ${t.text} rounded-full px-2 py-0.5 text-[10px] font-bold`}>{t.label}</span>
                    <p className="mt-2 text-sm leading-relaxed">{n.content}</p>
                    <div className="mt-2 flex justify-between text-[11px] text-ink-soft">
                      <span className="font-semibold text-primary-light">{n.author}</span>
                      <span>{n.createdAt}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Compositor */}
            <div className="border-t border-line px-5 py-3">
              <div className="mb-2 flex gap-1.5">
                {NOTE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setNoteType(t.id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      noteType === t.id ? `${t.bg} ${t.text} border-transparent` : 'border-line text-ink-soft hover:bg-soft'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER[noteType]}
                rows={3}
                className="w-full resize-none rounded-lg border border-line bg-soft/50 p-3 text-sm outline-none focus:border-primary-light"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-ink-soft">Tipo: {NOTE_TYPES.find((t) => t.id === noteType)!.label}</span>
                <button
                  onClick={saveNote}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light"
                >
                  <Send size={13} /> Guardar
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Chat del lead */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-soft/40 px-5 py-4">
              {leadMessages.length === 0 && (
                <p className="pt-8 text-center text-sm text-ink-soft">Sin conversación todavía con este lead.</p>
              )}
              {leadMessages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.direction === 'out' ? 'rounded-br-sm bg-primary text-inverse' : 'rounded-bl-sm border border-line bg-app'
                  }`}>
                    {m.body}
                    <div className={`mt-1 text-[10px] ${m.direction === 'out' ? 'text-inverse/60' : 'text-ink-soft'}`}>
                      {m.time}{m.author ? ` — ${m.author}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder={`Mensaje por ${CHANNEL_LABEL[lead.channels[0] ?? 'whatsapp']}…`}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-line bg-soft/50 p-3 text-sm outline-none focus:border-primary-light"
                />
                <button onClick={sendChat} className="rounded-lg bg-primary p-2.5 text-inverse hover:bg-primary-light" aria-label="Enviar">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
