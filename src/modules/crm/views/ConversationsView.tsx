import { useState, useEffect, useRef } from 'react'
import {
  Phone,
  User,
  Kanban,
  UserPlus,
  Check,
  Paperclip,
  LayoutTemplate,
  Sparkles,
  Send,
  Bot,
  RefreshCw,
  Folder,
  FileText,
  X,
  Play,
  Film,
  Image as ImageIcon
} from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { Avatar, ChannelDot, CHANNEL_LABEL } from '@/modules/crm/components/ui'
import type { Channel, Message } from '@/types'
import { AudioRecorder } from '@/modules/crm/components/AudioRecorder'
import { TemplatesModal } from '@/modules/crm/components/TemplatesModal'
import { MediaLibraryModal } from '@/modules/crm/components/MediaLibraryModal'

const FILTERS: { id: Channel | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'whatsapp', label: 'WA' },
  { id: 'facebook', label: 'FB' },
  { id: 'instagram', label: 'IG' },
  { id: 'email', label: 'Email' },
]

const AI_MODES = [
  { id: 'bot', label: 'Bot', cls: 'bg-wa-bg text-wa-text' },
  { id: 'hybrid', label: 'Híbrido', cls: 'bg-temp-hot-bg text-temp-hot-text' },
  { id: 'agent', label: 'Agente', cls: 'bg-stage-new-bg text-stage-new-text' },
] as const

const REPLY_CHANNELS = ['whatsapp', 'email', 'internal'] as const

export default function ConversationsView() {
  const {
    activeConversationId,
    setActiveConversation,
    messages,
    sendMessage,
    sendMediaMessage,
    loadLeadMessages,
    openLead,
    conversations,
    ctx,
  } = useApp()
  const { leads } = useLeads()
  const [filter, setFilter] = useState<Channel | 'todos'>('todos')
  const [aiMode, setAiMode] = useState<'bot' | 'hybrid' | 'agent'>('agent')
  const [replyChannel, setReplyChannel] = useState<(typeof REPLY_CHANNELS)[number]>('whatsapp')
  const [text, setText] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)

  // Modales
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)

  // Adjunto local pendiente
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
    mediaType: 'image' | 'video' | 'document' | 'audio';
    base64: string;
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Ordenar conversaciones para que los últimos mensajes SIEMPRE aparezcan hasta arriba (estilo WhatsApp)
  const convos = conversations
    .filter((c) => filter === 'todos' || c.channel === filter)
    .sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0))

  const active = conversations.find((c) => c.leadId === activeConversationId) ?? convos[0]
  const matchedLead = leads.find((l) => l.id === active?.leadId || l.contactId === active?.leadId)
  const lead = matchedLead || (active ? {
    id: active.leadId,
    contactId: active.contactId || active.leadId,
    name: active.contactName || 'Contacto WhatsApp',
    company: '',
    phone: active.phone || '',
    email: '',
    stage: 'nuevo',
    temperature: 'warm' as const,
    value: 0,
    score: 0,
    ownerId: '',
    dueDate: '',
    channels: ['whatsapp' as const],
    unread: 0,
    source: 'WhatsApp',
  } : null)
  const thread = messages.filter((m) => m.leadId === active?.leadId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (active?.leadId) {
      setLoadingChat(true)
      loadLeadMessages(active.leadId, active.contactId || matchedLead?.contactId, active.conversationId)
        .finally(() => {
          setLoadingChat(false)
          scrollToBottom()
        })

      const timer = setInterval(() => {
        loadLeadMessages(active.leadId, active.contactId || matchedLead?.contactId, active.conversationId)
      }, 3500)

      return () => clearInterval(timer)
    }
  }, [active?.leadId, active?.contactId, active?.conversationId, matchedLead?.contactId, loadLeadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [thread.length])

  // Selección de archivo local
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

  const send = async () => {
    if (!lead) return

    // Si hay un archivo adjunto local pendiente
    if (pendingFile) {
      await sendMediaMessage(lead.id, {
        media: pendingFile.base64,
        mediaType: pendingFile.mediaType,
        fileName: pendingFile.file.name,
        caption: text.trim() || undefined,
      })
      setPendingFile(null)
      setText('')
      setAiMode('agent')
      if (fileInputRef.current) fileInputRef.current.value = ''
      scrollToBottom()
      return
    }

    if (!text.trim()) return
    sendMessage(lead.id, replyChannel === 'internal' ? 'internal' : replyChannel, text.trim())
    setText('')
    setAiMode('agent')
    scrollToBottom()
  }

  // Envío de nota de voz grabada en vivo
  const handleSendAudio = async (audioBase64: string) => {
    if (!lead) return
    await sendMediaMessage(lead.id, {
      media: audioBase64,
      mediaType: 'audio',
      fileName: `audio_${Date.now()}.ogg`,
      isVoiceNote: true,
    })
    setAiMode('agent')
    scrollToBottom()
  }

  // Envío desde la biblioteca multimedia de GoHighLevel
  const handleSendFromLibrary = async (media: { url: string; fileType: string; name: string; caption?: string }) => {
    if (!lead) return
    await sendMediaMessage(lead.id, {
      media: media.url,
      mediaType: (media.fileType as any) || 'image',
      fileName: media.name,
      caption: media.caption,
    })
    setAiMode('agent')
    scrollToBottom()
  }

  const placeholder =
    replyChannel === 'internal' ? 'Nota interna — solo la ve tu equipo…'
    : replyChannel === 'email' ? 'Escribe un correo…'
    : 'Escribe un mensaje por WhatsApp…'

  // Renderizado multimedia del mensaje
  const renderMessageContent = (m: Message) => {
    const isOut = m.direction === 'out'
    const attachments = m.attachments || []

    return (
      <div className="space-y-2">
        {m.channel === 'internal' && <span className="mb-1 block text-[10px] font-bold uppercase">Nota interna</span>}

        {/* Archivos adjuntos / multimedia */}
        {attachments.map((att, idx) => {
          const isAudio = att.includes('audio') || att.includes('.mp3') || att.includes('.ogg') || att.includes('.opus') || att.includes('.wav') || m.body.includes('Nota de voz')
          const isVideo = att.includes('.mp4') || att.includes('.mov') || att.includes('.webm') || att.includes('video/')
          const isImage = att.includes('image/') || att.match(/\.(png|jpg|jpeg|webp|gif)/i)

          if (isAudio) {
            return (
              <div key={idx} className="my-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">🎤 Nota de voz</span>
                </div>
                <audio controls src={att} className="w-full max-w-xs h-9 rounded" preload="metadata" />
              </div>
            )
          }

          if (isVideo) {
            return (
              <div key={idx} className="my-1.5 overflow-hidden rounded-xl bg-black/20">
                <video controls src={att} className="max-h-64 w-full rounded-xl object-contain" />
              </div>
            )
          }

          if (isImage) {
            return (
              <div key={idx} className="my-1.5 overflow-hidden rounded-xl">
                <a href={att} target="_blank" rel="noopener noreferrer">
                  <img
                    src={att}
                    alt="Archivo adjunto"
                    className="max-h-64 rounded-xl object-cover hover:opacity-90 transition"
                    loading="lazy"
                  />
                </a>
              </div>
            )
          }

          return (
            <div key={idx} className="my-1.5">
              <a
                href={att}
                target="_blank"
                rel="noopener noreferrer"
                download
                className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold transition ${
                  isOut ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-soft hover:bg-line text-ink'
                }`}
              >
                <FileText size={18} className="shrink-0 text-red-500" />
                <span className="truncate">Ver o descargar documento</span>
              </a>
            </div>
          )
        })}

        {/* Texto del mensaje */}
        {m.body && (
          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
        )}
      </div>
    )
  }

  return (
    <div className="animate-rise flex h-full overflow-hidden">
      {/* Lista de conversaciones (con los últimos mensajes hasta arriba) */}
      <div className={`${lead ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-line bg-app md:w-72 lg:w-80`}>
        <div className="px-4 pt-4 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="font-bold">Conversaciones</h1>
            <span className="rounded-full bg-wa-bg px-2 py-0.5 text-[10px] font-bold text-wa-text">
              {convos.length} chats
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  filter === f.id ? 'border-primary bg-primary text-inverse' : 'border-line text-ink-soft hover:bg-soft'
                }`}
              >
                {f.id !== 'todos' && <ChannelDot channel={f.id as Channel} size={12} />} {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convos.map((c) => {
            const l = leads.find((x) => x.id === c.leadId || x.contactId === c.leadId)
            const name = c.contactName || l?.name || 'Contacto WhatsApp'
            const isActive = active?.leadId === c.leadId
            return (
              <button
                key={c.leadId}
                onClick={() => setActiveConversation(c.leadId)}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                  isActive ? 'border-primary-light bg-stage-new-bg/40' : 'border-transparent hover:bg-soft'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar name={name} />
                  <span className="absolute -right-0.5 -bottom-0.5"><ChannelDot channel={c.channel} size={14} /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <span className="shrink-0 text-[10px] text-ink-soft">{c.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs text-ink-soft">{c.preview}</p>
                    {c.unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-light" />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat activo */}
      {lead && (
        <div className="flex min-w-0 flex-1 flex-col bg-soft/40">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-line bg-app px-4 py-3">
            <Avatar name={active?.contactName || lead.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{active?.contactName || lead.name}</p>
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <span className="flex items-center gap-1 rounded-full bg-wa-bg px-2 py-0.5 font-semibold text-wa-text">
                  <ChannelDot channel={active.channel} size={12} /> {CHANNEL_LABEL[active.channel]}
                </span>
                <span className="hidden truncate sm:inline">{active?.phone || lead.phone || lead.company}</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (active) {
                  setLoadingChat(true)
                  loadLeadMessages(active.leadId, active.contactId || matchedLead?.contactId, active.conversationId)
                    .finally(() => {
                      setLoadingChat(false)
                      scrollToBottom()
                    })
                }
              }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-soft rounded-lg px-2.5 py-1.5 transition"
              title="Actualizar mensajes"
            >
              <RefreshCw size={13} className={loadingChat ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <div className="hidden items-center gap-1 lg:flex">
              {[{ Icon: User, t: 'Ver perfil' }, { Icon: Phone, t: 'Llamar' }, { Icon: Kanban, t: 'Mover etapa' }, { Icon: UserPlus, t: 'Asignar' }, { Icon: Check, t: 'Resolver' }].map(({ Icon, t }) => (
                <button key={t} onClick={() => t === 'Ver perfil' && openLead(lead.id)} title={t} className="rounded-lg border border-line p-2 text-ink-soft hover:bg-soft">
                  <Icon size={14} />
                </button>
              ))}
            </div>
            {/* Switch IA */}
            <div className="flex items-center rounded-lg border border-line p-0.5">
              {AI_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAiMode(m.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${aiMode === m.id ? m.cls : 'text-ink-soft'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {aiMode === 'bot' && (
            <div className="flex items-center gap-2 bg-wa-bg px-4 py-1.5 text-xs font-semibold text-wa-text">
              <Bot size={13} /> Bot respondiendo — si escribes, tomas el control automáticamente
            </div>
          )}

          {/* Mensajes del chat */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 lg:px-8">
            <div className="mb-2 text-center">
              <span className="rounded-full bg-line-soft px-3 py-1 text-[11px] font-semibold text-ink-soft">Hoy</span>
            </div>
            {thread.map((m) => (
              <div key={m.id} className={`flex items-end gap-2 ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                {m.direction === 'in' && <Avatar name={lead.name} size="sm" />}
                <div className={`max-w-[75%] lg:max-w-[60%]`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.channel === 'internal'
                      ? 'border border-dashed border-ink-soft/40 bg-line-soft text-ink-soft'
                      : m.direction === 'out' ? 'rounded-br-sm bg-primary text-inverse' : 'rounded-bl-sm border border-line bg-app'
                  }`}>
                    {renderMessageContent(m)}
                  </div>
                  <div className={`mt-1 text-[10px] text-ink-soft ${m.direction === 'out' ? 'text-right' : ''}`}>
                    {m.time}{m.author ? ` — ${m.author}` : ''}
                  </div>
                </div>
                {m.direction === 'out' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-inverse">Yo</div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Preview de archivo pendiente */}
          {pendingFile && (
            <div className="flex items-center justify-between border-t border-line bg-soft px-4 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {pendingFile.mediaType === 'image' ? (
                  <ImageIcon size={16} className="text-primary shrink-0" />
                ) : pendingFile.mediaType === 'video' ? (
                  <Film size={16} className="text-primary shrink-0" />
                ) : (
                  <FileText size={16} className="text-red-500 shrink-0" />
                )}
                <span className="truncate font-semibold text-ink">{pendingFile.file.name}</span>
                <span className="text-ink-soft">({(pendingFile.file.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button
                onClick={() => {
                  setPendingFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="rounded-lg p-1 text-ink-soft hover:bg-line hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Compositor */}
          <div className="border-t border-line bg-app px-4 py-3">
            <div className="mb-2 flex gap-1.5">
              {REPLY_CHANNELS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setReplyChannel(ch)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    replyChannel === ch ? 'border-primary bg-primary text-inverse' : 'border-line text-ink-soft hover:bg-soft'
                  }`}
                >
                  {ch === 'whatsapp' ? '💬 WhatsApp' : ch === 'email' ? '✉ Email' : '🗒 Nota interna'}
                </button>
              ))}
            </div>

            {/* Input de archivos oculto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*,application/pdf,audio/*"
              className="hidden"
            />

            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                {/* Botón Adjuntar Archivo Local */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-2 text-ink-soft hover:bg-soft hover:text-ink transition"
                  title="Adjuntar imagen, video o documento local"
                >
                  <Paperclip size={18} />
                </button>

                {/* Botón Biblioteca Multimedia de GoHighLevel */}
                <button
                  onClick={() => setMediaLibraryOpen(true)}
                  className="rounded-lg p-2 text-ink-soft hover:bg-soft hover:text-primary transition"
                  title="Biblioteca de Archivos y Videos GHL"
                >
                  <Folder size={18} />
                </button>

                {/* Botón Plantillas de Respuesta GoHighLevel */}
                <button
                  onClick={() => setTemplatesOpen(true)}
                  className="rounded-lg p-2 text-ink-soft hover:bg-soft hover:text-primary transition"
                  title="Plantillas y Respuestas Rápidas"
                >
                  <LayoutTemplate size={18} />
                </button>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={placeholder}
                rows={2}
                className={`flex-1 resize-none rounded-lg border p-3 text-sm outline-none focus:border-primary-light ${
                  replyChannel === 'internal' ? 'border-dashed border-ink-soft/40 bg-line-soft/50' : 'border-line bg-soft/50'
                }`}
              />

              {/* Botón de Grabar Audio en Vivo */}
              <AudioRecorder
                onSendAudio={handleSendAudio}
                disabled={replyChannel !== 'whatsapp'}
              />

              {/* Botón Enviar Texto o Archivo */}
              <button
                onClick={send}
                className="rounded-lg bg-primary p-2.5 text-inverse hover:bg-primary-light transition shadow-sm"
                aria-label="Enviar"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Modal de Plantillas GHL */}
          <TemplatesModal
            isOpen={templatesOpen}
            onClose={() => setTemplatesOpen(false)}
            onSelectTemplate={(tplText) => setText(tplText)}
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
        </div>
      )}
    </div>
  )
}
