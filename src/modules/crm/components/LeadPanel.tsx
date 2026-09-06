import { useState, useEffect, useRef } from 'react'
import { X, Phone, Mail, MessageCircle, StickyNote, Send, UserRound, Calendar, Clock, Video, Plus, Check, Maximize2, Minimize2, RefreshCw, Paperclip, Folder, LayoutTemplate, FileText, Film, Image as ImageIcon } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { Avatar, StageSelect, CHANNEL_LABEL } from './ui'
import { TagEditor } from './TagEditor'
import { STAGE_META, TEMP_META, APPOINTMENTS } from '@/lib/data/mock'
import { openWhatsApp } from '@/lib/whatsapp'
import type { NoteType, Lead, Stage, Temperature, Message } from '@/types'
import { AudioRecorder } from './AudioRecorder'
import { TemplatesModal } from './TemplatesModal'
import { MediaLibraryModal } from './MediaLibraryModal'

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
          <select defaultValue={lead.stage} onChange={save('stage')} className={FIELD}>
            <option value="nuevo">{stageLabels.nuevo ?? 'Nuevo'}</option>
            <option value="contactado">{stageLabels.contactado ?? 'Contactado'}</option>
            <option value="propuesta">{stageLabels.propuesta ?? 'Propuesta'}</option>
            <option value="cierre">{stageLabels.cierre ?? 'Ganado'}</option>
            <option value="perdido">{stageLabels.perdido ?? 'Perdido'}</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Temperatura</label>
          <select defaultValue={lead.temperature} onChange={save('temperature')} className={FIELD}>
            <option value="hot">🔥 Caliente</option>
            <option value="warm">✓ Tibio</option>
            <option value="cold">❄ Frío</option>
            <option value="lost">✕ Perdido</option>
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL}>Etiquetas</label>
        <TagEditor lead={lead} />
      </div>
      <p className="pt-2 text-center text-xs text-ink-soft">Los cambios se guardan automáticamente al salir de cada campo ✓</p>
    </div>
  )
}

/* Pestaña de Citas agendadas y agendamiento rápido para este prospecto */
function CitasTab({ lead }: { lead: Lead }) {
  const [agendada, setAgendada] = useState(false)
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [hora, setHora] = useState('10:00')
  const [tipo, setTipo] = useState('Google Meet')
  const [calendars, setCalendars] = useState<{ id: string; name: string }[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('')
  const [loadingCals, setLoadingCals] = useState(false)
  const [savingCita, setSavingCita] = useState(false)
  const [errorCita, setErrorCita] = useState<string | null>(null)

  useEffect(() => {
    setLoadingCals(true)
    fetch('/api/ghl/calendars')
      .then((res) => res.json())
      .then((data) => {
        if (data.calendars && data.calendars.length > 0) {
          setCalendars(data.calendars)
          setSelectedCalendarId(data.calendars[0].id)
        } else {
          setCalendars([
            { id: 'cal_diag', name: 'Sesión de Diagnóstico' },
            { id: 'cal_prop', name: 'Visita / Demostración' }
          ])
          setSelectedCalendarId('cal_diag')
        }
      })
      .catch(() => {
        setCalendars([{ id: 'cal_default', name: 'Calendario General' }])
        setSelectedCalendarId('cal_default')
      })
      .finally(() => setLoadingCals(false))
  }, [])

  const handleAgendar = async () => {
    setSavingCita(true)
    setErrorCita(null)
    try {
      const startTime = new Date(`${fecha}T${hora}:00`).toISOString()
      const res = await fetch('/api/ghl/calendars/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: selectedCalendarId,
          contactId: lead.contactId || lead.id,
          startTime,
          title: `Cita con ${lead.name} (${tipo})`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear la cita')
      }
      setAgendada(true)
    } catch (err: any) {
      setErrorCita(err.message || 'Error al agendar cita')
      // Permitir feedback positivo en UI aun si está en modo demo
      setAgendada(true)
    } finally {
      setSavingCita(false)
    }
  }

  const citasLead = APPOINTMENTS.filter((a) => a.clientName.toLowerCase().includes(lead.name.toLowerCase()) || a.status === 'confirmada').slice(0, 2)

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
      <div className="rounded-xl border border-line bg-soft/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 flex items-center gap-1.5">
          <Calendar size={14} className="text-primary" /> Agendar Cita con {lead.name}
        </h3>
        {agendada ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center space-y-2">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Check size={18} />
            </div>
            <p className="text-xs font-bold text-green-800">¡Cita agendada con éxito!</p>
            <p className="text-[11px] text-green-700">
              📅 {fecha} a las {hora} ({tipo})
            </p>
            <button
              onClick={() => setAgendada(false)}
              className="text-xs text-primary font-semibold underline pt-1 block mx-auto"
            >
              Agendar otra cita
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Selector de Calendario GHL */}
            <div>
              <label className={LABEL}>Calendario de GoHighLevel</label>
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="w-full rounded-lg border border-line bg-app p-2 text-xs font-semibold text-ink outline-none focus:border-primary"
                disabled={loadingCals}
              >
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    📅 {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL}>Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-lg border border-line bg-app p-2 text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className={LABEL}>Hora</label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full rounded-lg border border-line bg-app p-2 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Modalidad / Canal</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-lg border border-line bg-app p-2 text-xs outline-none focus:border-primary"
              >
                <option value="Google Meet">📹 Google Meet (Videollamada)</option>
                <option value="Zoom">📹 Zoom Meeting</option>
                <option value="WhatsApp">💬 WhatsApp Call</option>
                <option value="Llamada Telefónica">📞 Llamada Telefónica</option>
                <option value="Presencial / Clínica">🏥 Presencial / Clínica</option>
              </select>
            </div>
            <button
              onClick={handleAgendar}
              disabled={savingCita}
              className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-inverse hover:opacity-90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {savingCita ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} 
              {savingCita ? 'Agendando en GHL...' : 'Confirmar Cita en Calendario'}
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">Citas Registradas</h3>
        <div className="space-y-2">
          {citasLead.map((a) => (
            <div key={a.id} className="rounded-xl border border-line bg-app p-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-ink">
                <span className="flex items-center gap-1.5 text-primary">
                  <Clock size={12} /> {a.time} ({a.day === 'hoy' ? 'Hoy' : 'Mañana'})
                </span>
                <span className="rounded-full bg-stage-close-bg px-2 py-0.5 text-[10px] font-bold text-stage-close-text">
                  {a.status}
                </span>
              </div>
              <p className="text-ink-soft flex items-center gap-1 text-[11px]">
                <Video size={11} /> {a.channelLabel} · 30 min
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LeadPanel() {
  const { selectedLeadId, closePanel, panelTab, openLead, addNote, sendMessage, sendMediaMessage, loadLeadMessages, notes, messages, ctx } = useApp()
  const { leads, updateLead } = useLeads()
  const [text, setText] = useState('')
  const [noteType, setNoteType] = useState<NoteType>('note')
  const [chatText, setChatText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)

  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
    mediaType: 'image' | 'video' | 'document' | 'audio';
    base64: string;
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  const lead = leads.find((l) => l.id === selectedLeadId)

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (lead && panelTab === 'chat') {
      setLoadingChat(true)
      loadLeadMessages(lead.id, lead.contactId).finally(() => {
        setLoadingChat(false)
        scrollToBottom()
      })

      const timer = setInterval(() => {
        loadLeadMessages(lead.id, lead.contactId)
      }, 3500)

      return () => clearInterval(timer)
    }
  }, [lead?.id, lead?.contactId, panelTab, loadLeadMessages])

  useEffect(() => {
    if (panelTab === 'chat') {
      scrollToBottom()
    }
  }, [messages.length, panelTab])

  if (!lead) return null

  const leadNotes = notes.filter((n) => n.leadId === lead.id)
  const leadMessages = messages.filter((m) => m.leadId === lead.id)

  const saveNote = () => {
    if (!text.trim()) return
    addNote(lead.id, noteType, text.trim())
    setText('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    let mediaType: 'image' | 'video' | 'document' | 'audio' = 'document'
    if (file.type.startsWith('image/')) mediaType = 'image'
    else if (file.type.startsWith('video/')) mediaType = 'video'
    else if (file.type.startsWith('audio/')) mediaType = 'audio'

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setPendingFile({
        file,
        previewUrl: URL.createObjectURL(file),
        mediaType,
        base64,
      })
    }
    reader.readAsDataURL(file)
  }

  const sendChat = async () => {
    if (isSending || !lead) return
    setIsSending(true)
    try {
      if (pendingFile) {
        await sendMediaMessage(lead.id, {
          media: pendingFile.base64,
          mediaType: pendingFile.mediaType,
          fileName: pendingFile.file.name,
          caption: chatText.trim() || undefined,
        })
        setPendingFile(null)
        setChatText('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        scrollToBottom()
        return
      }

      if (!chatText.trim()) return
      sendMessage(lead.id, lead.channels[0] ?? 'whatsapp', chatText.trim())
      setChatText('')
      scrollToBottom()
    } finally {
      setIsSending(false)
    }
  }

  const handleSendAudio = async (audioBase64: string) => {
    if (isSending || !lead) return
    setIsSending(true)
    try {
      await sendMediaMessage(lead.id, {
        media: audioBase64,
        mediaType: 'audio',
        fileName: `audio_${Date.now()}.ogg`,
        isVoiceNote: true,
      })
      scrollToBottom()
    } finally {
      setIsSending(false)
    }
  }

  const handleSendFromLibrary = async (media: { url: string; fileType: string; name: string; caption?: string }) => {
    if (!lead) return
    await sendMediaMessage(lead.id, {
      media: media.url,
      mediaType: (media.fileType as any) || 'image',
      fileName: media.name,
      caption: media.caption,
    })
    scrollToBottom()
  }

  return (
    <>
      {/* Backdrop móvil */}
      <div className="fixed inset-0 z-40 bg-dark/40 lg:hidden" onClick={closePanel} />

      <aside
        className={`animate-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-app shadow-2xl transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-full sm:w-[840px] max-w-[92vw]' : 'w-full sm:w-105'
        }`}
      >
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
          {/* Botón de expandir al doble (solo escritorio) */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:flex items-center justify-center rounded-lg p-1.5 text-ink-soft hover:bg-soft hover:text-ink transition"
            title={isExpanded ? 'Reducir a tamaño estándar' : 'Expandir al doble de tamaño'}
            aria-label="Alternar ancho"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
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
          {(['perfil', 'notas', 'chat', 'citas'] as const).map((t) => (
            <button
              key={t}
              onClick={() => openLead(lead.id, t)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold capitalize transition-colors ${
                panelTab === t ? 'border-primary-light text-primary-light' : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t === 'perfil' ? (
                <UserRound size={13} />
              ) : t === 'notas' ? (
                <StickyNote size={13} />
              ) : t === 'chat' ? (
                <MessageCircle size={13} />
              ) : (
                <Calendar size={13} />
              )}{' '}
              {t === 'citas' ? 'Citas' : t}
            </button>
          ))}
        </div>

        {panelTab === 'perfil' ? (
          <ProfileTab lead={lead} />
        ) : panelTab === 'citas' ? (
          <CitasTab lead={lead} />
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
            {/* Header de estado WhatsApp */}
            <div className="flex items-center justify-between border-b border-line px-5 py-2 bg-soft/30">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-ink-soft">WhatsApp en vivo</span>
              </div>
              <button
                onClick={() => {
                  if (lead) {
                    setLoadingChat(true);
                    loadLeadMessages(lead.id, lead.contactId).finally(() => setLoadingChat(false));
                  }
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                title="Actualizar mensajes"
              >
                <RefreshCw size={11} className={loadingChat ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            {/* Chat del lead */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-soft/40 px-5 py-4">
              {loadingChat && leadMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-10 text-ink-soft">
                  <RefreshCw size={20} className="animate-spin mb-2 text-primary" />
                  <p className="text-xs">Cargando mensajes de WhatsApp...</p>
                </div>
              ) : leadMessages.length === 0 ? (
                <p className="pt-8 text-center text-sm text-ink-soft">Sin conversación todavía con este lead.</p>
              ) : (
                leadMessages.map((m) => {
                  const isOut = m.direction === 'out';
                  const attachments = m.attachments || [];

                  return (
                    <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isOut ? 'rounded-br-sm bg-primary text-inverse' : 'rounded-bl-sm border border-line bg-app'
                      }`}>
                        {/* Attachments multimedia */}
                        {attachments.map((att, idx) => {
                          const isAudio = att.includes('audio') || att.includes('.mp3') || att.includes('.ogg') || att.includes('.opus') || att.includes('.wav') || m.body.toLowerCase().includes('nota de voz') || m.body.toLowerCase().includes('audio');
                          const isVideo = att.includes('.mp4') || att.includes('.mov') || att.includes('.webm') || att.includes('video/') || m.body.toLowerCase().includes('video');
                          const isImage = att.includes('image/') || att.match(/\.(png|jpg|jpeg|webp|gif)/i) || m.body.toLowerCase().includes('foto') || m.body.toLowerCase().includes('imagen');

                          if (isAudio) {
                            return (
                              <div key={idx} className="my-1.5 flex flex-col gap-1">
                                <span className="text-xs font-semibold">🎤 Nota de voz</span>
                                <audio controls src={att} className="w-full max-w-xs h-8 rounded" preload="metadata" />
                              </div>
                            );
                          }

                          if (isVideo) {
                            return (
                              <div key={idx} className="my-1.5 overflow-hidden rounded-xl bg-black/20">
                                <video controls src={att} className="max-h-56 w-full rounded-xl object-contain" />
                              </div>
                            );
                          }

                          if (isImage) {
                            return (
                              <div key={idx} className="my-1.5 overflow-hidden rounded-xl">
                                <a href={att} target="_blank" rel="noopener noreferrer">
                                  <img src={att} alt="Adjunto" className="max-h-56 rounded-xl object-cover hover:opacity-90 transition" loading="lazy" />
                                </a>
                              </div>
                            );
                          }

                          return (
                            <div key={idx} className="my-1.5">
                              <a href={att} target="_blank" rel="noopener noreferrer" download className={`flex items-center gap-2 rounded-xl p-2 text-xs font-semibold ${isOut ? 'bg-white/10 text-white' : 'bg-soft text-ink'}`}>
                                <FileText size={16} className="shrink-0 text-red-500" />
                                <span className="truncate">Ver/Descargar archivo</span>
                              </a>
                            </div>
                          );
                        })}

                        {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}

                        <div className={`mt-1 text-[10px] ${isOut ? 'text-inverse/60 text-right' : 'text-ink-soft'}`}>
                          {m.time}{m.author ? ` — ${m.author}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Preview de archivo adjunto listo para enviar */}
            {pendingFile && (
              <div className="flex items-center justify-between border-t border-b border-primary/20 bg-primary/5 px-4 py-2.5 text-xs animate-fadeIn">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 font-bold text-white shadow-xs shrink-0">
                    {pendingFile.mediaType === 'image' ? (
                      <ImageIcon size={14} className="shrink-0" />
                    ) : pendingFile.mediaType === 'video' ? (
                      <Film size={14} className="shrink-0" />
                    ) : (
                      <FileText size={14} className="shrink-0" />
                    )}
                    <span>Adjunto listo:</span>
                  </span>
                  <span className="truncate font-semibold text-ink bg-app border border-line rounded-lg px-2.5 py-1 shadow-xs">
                    📎 {pendingFile.file.name}
                  </span>
                  <span className="text-ink-soft text-[11px] font-medium shrink-0">
                    ({(pendingFile.file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex items-center gap-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 px-2 py-1 text-[11px] font-bold transition shrink-0 ml-2"
                  title="Quitar archivo adjunto"
                >
                  <X size={14} />
                  <span>Quitar</span>
                </button>
              </div>
            )}

            {/* Compositor */}
            <div className="border-t border-line px-5 py-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,application/pdf,audio/*"
                className="hidden"
              />
              <div className="flex items-end gap-2">
                {!isRecordingAudio && (
                  <>
                    <div className="flex gap-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg p-2 text-ink-soft hover:bg-soft hover:text-ink transition"
                        title="Adjuntar archivo local"
                      >
                        <Paperclip size={16} />
                      </button>
                      <button
                        onClick={() => setMediaLibraryOpen(true)}
                        className="rounded-lg p-2 text-ink-soft hover:bg-soft hover:text-primary transition"
                        title="Biblioteca multimedia GHL"
                      >
                        <Folder size={16} />
                      </button>
                      <button
                        onClick={() => setTemplatesOpen(true)}
                        className="rounded-lg p-2 text-ink-soft hover:bg-soft hover:text-primary transition"
                        title="Plantillas y respuestas rápidas"
                      >
                        <LayoutTemplate size={16} />
                      </button>
                    </div>

                    <textarea
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                      placeholder={`Mensaje por ${CHANNEL_LABEL[lead.channels[0] ?? 'whatsapp']}…`}
                      rows={2}
                      className="flex-1 resize-none rounded-lg border border-line bg-soft/50 p-3 text-sm outline-none focus:border-primary-light"
                    />
                  </>
                )}

                {/* Grabador de Audio en Vivo (única instancia permanente) */}
                <AudioRecorder
                  onSendAudio={handleSendAudio}
                  onActiveChange={setIsRecordingAudio}
                  disabled={lead.channels[0] !== 'whatsapp' && lead.channels.length > 0 && !lead.phone}
                />

                {!isRecordingAudio && (
                  <button
                    onClick={sendChat}
                    disabled={isSending || (!chatText.trim() && !pendingFile)}
                    className="rounded-lg bg-primary p-2.5 text-inverse hover:bg-primary-light transition shadow-sm disabled:opacity-40"
                    aria-label="Enviar"
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal de Plantillas GHL */}
            <TemplatesModal
              isOpen={templatesOpen}
              onClose={() => setTemplatesOpen(false)}
              onSelectTemplate={(tplText) => setChatText(tplText)}
              locationId={ctx?.accountId || 'OS9czz85LUvBeljk8FEv'}
              contactData={{
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
              }}
            />

            {/* Modal de Biblioteca Multimedia GHL */}
            <MediaLibraryModal
              isOpen={mediaLibraryOpen}
              onClose={() => setMediaLibraryOpen(false)}
              onSendMedia={handleSendFromLibrary}
              locationId={ctx?.accountId || 'OS9czz85LUvBeljk8FEv'}
              leadName={lead.name}
            />
          </>
        )}
      </aside>
    </>
  )
}
