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
  Image as ImageIcon,
  Zap,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search
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

export type AiChatMode = 'ai_agent' | 'hybrid' | 'human';

const AI_MODES = [
  { id: 'ai_agent' as const, label: '🤖 Agente IA', cls: 'bg-emerald-600 text-white font-bold shadow-xs' },
  { id: 'hybrid' as const, label: '⚡ Híbrido', cls: 'bg-amber-500 text-white font-bold shadow-xs' },
  { id: 'human' as const, label: '👤 Humano', cls: 'bg-slate-700 text-white font-bold shadow-xs' },
] as const;

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
  const [searchQuery, setSearchQuery] = useState('')
  // Control de IA y Seguridad
  const [isGlobalAutoReplyEnabled, setIsGlobalAutoReplyEnabled] = useState(false);
  const [chatControlsMap, setChatControlsMap] = useState<Record<string, { aiMode: AiChatMode; assignedAgentId?: string }>>({});
  const [savingGlobalSwitch, setSavingGlobalSwitch] = useState(false);
  const [savingChatControl, setSavingChatControl] = useState(false);
  const [replyChannel, setReplyChannel] = useState<(typeof REPLY_CHANNELS)[number]>('whatsapp')
  const [text, setText] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)

  // Modales
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Adjunto local pendiente
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
    mediaType: 'image' | 'video' | 'document' | 'audio';
    base64: string;
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Ordenar conversaciones para que los últimos mensajes SIEMPRE aparezcan hasta arriba (estilo WhatsApp) y filtrar por búsqueda
  const convos = conversations
    .filter((c) => filter === 'todos' || c.channel === filter)
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const l = leads.find((x) => x.id === c.leadId || x.contactId === c.leadId);
      const name = (c.contactName || l?.name || '').toLowerCase();
      const phone = (c.phone || l?.phone || '').toLowerCase();
      const preview = (c.preview || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || preview.includes(q);
    })
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

  // Obtener clave única del chat activo para controles de IA
  const activeChatKey = active?.phone
    ? active.phone.replace(/\D/g, '')
    : (active?.leadId || active?.contactId || '');
  const currentChatControl = activeChatKey ? chatControlsMap[activeChatKey] : null;
  const currentChatMode: AiChatMode = currentChatControl?.aiMode || 'human';

  // Cargar controles de chats y Switch Maestro desde el servidor
  const fetchChatControls = async () => {
    try {
      const res = await fetch('/api/crm/chat-control');
      if (res.ok) {
        const data = await res.json();
        setIsGlobalAutoReplyEnabled(Boolean(data.isGlobalAutoReplyEnabled));
        if (Array.isArray(data.controls)) {
          const map: Record<string, any> = {};
          data.controls.forEach((c: any) => {
            map[c.chat_id] = {
              aiMode: c.ai_mode,
              assignedAgentId: c.assigned_agent_id,
            };
          });
          setChatControlsMap(map);
        }
      }
    } catch (e) {
      console.warn('Error loading chat controls:', e);
    }
  };

  useEffect(() => {
    fetchChatControls();
  }, []);

  // Alternar el Switch Maestro Global de Seguridad
  const handleToggleGlobalSwitch = async () => {
    setSavingGlobalSwitch(true);
    const newState = !isGlobalAutoReplyEnabled;
    try {
      const res = await fetch('/api/crm/chat-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isGlobalAutoReplyEnabled: newState }),
      });
      if (res.ok) {
        setIsGlobalAutoReplyEnabled(newState);
      }
    } catch (e) {
      console.warn('Error toggling global switch:', e);
    } finally {
      setSavingGlobalSwitch(false);
    }
  };

  // Cambiar el modo de IA para el chat activo (Agente IA / Híbrido / Humano)
  const handleSetChatMode = async (mode: AiChatMode) => {
    if (!activeChatKey) return;
    setSavingChatControl(true);
    // Actualización optimista
    setChatControlsMap(prev => ({
      ...prev,
      [activeChatKey]: {
        ...(prev[activeChatKey] || {}),
        aiMode: mode,
      }
    }));
    try {
      await fetch('/api/crm/chat-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChatKey,
          aiMode: mode,
        }),
      });
    } catch (e) {
      console.warn('Error updating chat mode:', e);
    } finally {
      setSavingChatControl(false);
    }
  };

  // Registrar interacción humana para pausar modo híbrido
  const registerHumanInteraction = () => {
    if (!activeChatKey) return;
    fetch('/api/crm/chat-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: activeChatKey,
        isHumanInteraction: true,
      }),
    }).catch(() => {});
  };

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
    if (isSending || !lead) return
    setIsSending(true)
    try {
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
        registerHumanInteraction()
        if (fileInputRef.current) fileInputRef.current.value = ''
        scrollToBottom()
        return
      }

      if (!text.trim()) return
      sendMessage(lead.id, replyChannel === 'internal' ? 'internal' : replyChannel, text.trim())
      setText('')
      registerHumanInteraction()
      scrollToBottom()
    } finally {
      setIsSending(false)
    }
  }

  // Envío de nota de voz grabada en vivo
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
      registerHumanInteraction()
      scrollToBottom()
    } finally {
      setIsSending(false)
    }
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
    registerHumanInteraction()
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
          const isAudio = att.includes('audio') || att.includes('.mp3') || att.includes('.ogg') || att.includes('.opus') || att.includes('.wav') || m.body.toLowerCase().includes('nota de voz') || m.body.toLowerCase().includes('audio')
          const isVideo = att.includes('.mp4') || att.includes('.mov') || att.includes('.webm') || att.includes('video/') || m.body.toLowerCase().includes('video')
          const isImage = att.includes('image/') || att.match(/\.(png|jpg|jpeg|webp|gif)/i) || m.body.toLowerCase().includes('foto') || m.body.toLowerCase().includes('imagen')

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
    <div className="animate-rise flex flex-col h-full overflow-hidden">
      {/* 🛡️ Switch Maestro Global de Seguridad */}
      <div className={`flex items-center justify-between px-4 py-2 border-b text-xs transition-colors shrink-0 ${
        isGlobalAutoReplyEnabled
          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/90 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isGlobalAutoReplyEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div className="truncate">
            {isGlobalAutoReplyEnabled ? (
              <span>
                <strong className="text-emerald-900">🚀 Automatización de IA Activa:</strong>
                <span className="hidden sm:inline text-emerald-800 text-[11px] ml-1.5">
                  Los chats con 'Agente IA' o 'Híbrido' responderán automáticamente por WhatsApp.
                </span>
              </span>
            ) : (
              <span>
                <strong className="text-amber-950">🛡️ Modo Seguro (Respuestas IA Desactivadas Globalmente):</strong>
                <span className="hidden sm:inline text-amber-900 text-[11px] ml-1.5">
                  Ninguna IA responderá a tu WhatsApp (protección total para números personales).
                </span>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleGlobalSwitch}
          disabled={savingGlobalSwitch}
          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all shadow-xs active:scale-95 shrink-0 flex items-center gap-1.5 ${
            isGlobalAutoReplyEnabled
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {savingGlobalSwitch ? (
            'Guardando...'
          ) : isGlobalAutoReplyEnabled ? (
            'Pausar a Modo Seguro'
          ) : (
            'Activar Respuestas de IA'
          )}
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Lista de conversaciones (con los últimos mensajes hasta arriba) */}
      <div className={`${lead ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-line bg-app md:w-72 lg:w-80`}>
        <div className="px-4 pt-4 pb-2">
          <div className="mb-2.5 flex items-center justify-between">
            <h1 className="font-bold text-sm sm:text-base">Conversaciones</h1>
            <span className="rounded-full bg-wa-bg px-2 py-0.5 text-[10px] font-bold text-wa-text">
              {convos.length} {convos.length === 1 ? 'chat' : 'chats'}
            </span>
          </div>

          {/* Buscador de contactos en vivo */}
          <div className="relative mb-2.5">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contacto, teléfono..."
              className="w-full rounded-xl border border-line bg-soft/60 pl-8 pr-7 py-1.5 text-xs text-ink outline-none transition focus:border-primary focus:bg-app shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink text-xs font-bold px-1 rounded"
                title="Borrar búsqueda"
              >
                ✕
              </button>
            )}
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
          {convos.length === 0 && (
            <div className="py-10 text-center text-xs text-ink-soft px-4 space-y-1">
              <p className="font-bold text-ink">Sin contactos</p>
              {searchQuery ? (
                <p className="text-[11px] text-ink-soft">
                  No se encontraron resultados para &ldquo;{searchQuery}&rdquo;.
                </p>
              ) : (
                <p className="text-[11px] text-ink-soft">
                  No hay chats en este filtro.
                </p>
              )}
            </div>
          )}
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
            {/* Switch IA / Control de Conversación */}
            <div className="flex items-center rounded-lg border border-line bg-app p-0.5 shadow-xs">
              {AI_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSetChatMode(m.id)}
                  disabled={savingChatControl}
                  className={`rounded-md px-2.5 py-1 text-xs transition-all ${
                    currentChatMode === m.id
                      ? m.cls
                      : 'text-ink-soft hover:bg-soft hover:text-ink font-semibold'
                  }`}
                  title={
                    m.id === 'ai_agent'
                      ? 'Agente IA responde de forma 100% autónoma'
                      : m.id === 'hybrid'
                      ? 'Modo Copiloto: la IA responde hasta que tú intervienes escribiendo'
                      : 'Atención 100% manual por un humano; la IA nunca responderá'
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banner de Estado del Chat Activo */}
          {currentChatMode === 'ai_agent' && !isGlobalAutoReplyEnabled && (
            <div className="flex items-center justify-between bg-amber-50/95 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <Bot size={13} className="text-amber-700 shrink-0" />
                <span>
                  <strong>🤖 Agente IA asignado:</strong> En pausa porque el <em>Switch Maestro</em> está en Modo Seguro. La IA no enviará respuestas por WhatsApp.
                </span>
              </div>
            </div>
          )}

          {currentChatMode === 'ai_agent' && isGlobalAutoReplyEnabled && (
            <div className="flex items-center justify-between bg-emerald-50/95 border-b border-emerald-200 px-4 py-1.5 text-xs text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <Bot size={13} className="text-emerald-700 shrink-0" />
                <span>
                  <strong>🤖 Agente IA activo:</strong> Respondiendo automáticamente con su Segundo Cerebro. Si escribes un mensaje, tomas el control.
                </span>
              </div>
            </div>
          )}

          {currentChatMode === 'hybrid' && (
            <div className="flex items-center justify-between bg-amber-50/90 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-amber-600 shrink-0" />
                <span>
                  <strong>⚡ Modo Híbrido (Copiloto):</strong> La IA asiste en las respuestas. Si escribes desde tu teclado, la IA se pausa automáticamente.
                </span>
              </div>
            </div>
          )}

          {currentChatMode === 'human' && (
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-1 text-[11px] text-slate-600 animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <User size={12} className="text-slate-500 shrink-0" />
                <span>
                  <strong>👤 Modo Humano:</strong> Atención 100% manual. La IA nunca responderá a este contacto.
                </span>
              </div>
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
                  setPendingFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
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
              {!isRecordingAudio && (
                <>
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
                </>
              )}

              {/* Grabador de Audio en Vivo (única instancia permanente) */}
              <AudioRecorder
                onSendAudio={handleSendAudio}
                onActiveChange={setIsRecordingAudio}
                disabled={replyChannel !== 'whatsapp'}
              />

              {!isRecordingAudio && (
                <button
                  onClick={send}
                  disabled={isSending || (!text.trim() && !pendingFile)}
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
    </div>
  )
}
