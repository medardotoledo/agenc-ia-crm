import { useState } from 'react'
import { Phone, User, Kanban, UserPlus, Check, Paperclip, LayoutTemplate, Sparkles, Send, Bot } from 'lucide-react'
import { useApp, useLeads } from '@/store/useApp'
import { Avatar, ChannelDot, CHANNEL_LABEL } from '@/modules/crm/components/ui'
import type { Channel } from '@/types'

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
  const { activeConversationId, setActiveConversation, messages, sendMessage, openLead, conversations } = useApp()
  const { leads } = useLeads()
  const [filter, setFilter] = useState<Channel | 'todos'>('todos')
  const [aiMode, setAiMode] = useState<'bot' | 'hybrid' | 'agent'>('agent')
  const [replyChannel, setReplyChannel] = useState<(typeof REPLY_CHANNELS)[number]>('whatsapp')
  const [text, setText] = useState('')

  const convos = conversations.filter((c) => filter === 'todos' || c.channel === filter)
  const active = conversations.find((c) => c.leadId === activeConversationId) ?? convos[0]
  const lead = leads.find((l) => l.id === active?.leadId)
  const thread = messages.filter((m) => m.leadId === active?.leadId)

  const send = () => {
    if (!text.trim() || !lead) return
    sendMessage(lead.id, replyChannel === 'internal' ? 'internal' : replyChannel, text.trim())
    setText('')
    setAiMode('agent') // human takeover automático al escribir
  }

  const placeholder =
    replyChannel === 'internal' ? 'Nota interna — solo la ve tu equipo…'
    : replyChannel === 'email' ? 'Escribe un correo…'
    : 'Escribe un mensaje por WhatsApp…'

  return (
    <div className="animate-rise flex h-full overflow-hidden">
      {/* Lista de conversaciones */}
      <div className={`${lead ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-line bg-app md:w-72 lg:w-80`}>
        <div className="px-4 pt-4 pb-2">
          <h1 className="mb-3 font-bold">Conversaciones</h1>
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
            const l = leads.find((x) => x.id === c.leadId)
            if (!l) return null
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
                  <Avatar name={l.name} />
                  <span className="absolute -right-0.5 -bottom-0.5"><ChannelDot channel={c.channel} size={14} /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
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
            <Avatar name={lead.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{lead.name}</p>
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <span className="flex items-center gap-1 rounded-full bg-wa-bg px-2 py-0.5 font-semibold text-wa-text">
                  <ChannelDot channel={active.channel} size={12} /> {CHANNEL_LABEL[active.channel]}
                </span>
                <span className="hidden truncate sm:inline">{lead.company}</span>
              </div>
            </div>
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

          {/* Mensajes */}
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
                    {m.channel === 'internal' && <span className="mb-1 block text-[10px] font-bold uppercase">Nota interna</span>}
                    {m.body}
                  </div>
                  <div className={`mt-1 text-[10px] text-ink-soft ${m.direction === 'out' ? 'text-right' : ''}`}>
                    {m.time}{m.author ? ` — ${m.author}` : ''}
                  </div>
                </div>
                {m.direction === 'out' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-inverse">MT</div>
                )}
              </div>
            ))}
          </div>

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
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <button className="rounded-lg p-2 text-ink-soft hover:bg-soft" title="Adjuntar"><Paperclip size={16} /></button>
                <button className="rounded-lg p-2 text-ink-soft hover:bg-soft" title="Plantillas"><LayoutTemplate size={16} /></button>
                <button className="rounded-lg p-2 text-accent hover:bg-soft" title="Asistente IA"><Sparkles size={16} /></button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={placeholder}
                rows={2}
                className={`flex-1 resize-none rounded-lg border p-3 text-sm outline-none focus:border-primary-light ${
                  replyChannel === 'internal' ? 'border-dashed border-ink-soft/40 bg-line-soft/50' : 'border-line bg-soft/50'
                }`}
              />
              <button onClick={send} className="rounded-lg bg-primary p-2.5 text-inverse hover:bg-primary-light" aria-label="Enviar">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
