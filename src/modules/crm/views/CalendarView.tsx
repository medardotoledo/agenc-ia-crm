'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  Clock, 
  Video, 
  Phone, 
  MessageCircle, 
  X, 
  RefreshCw, 
  Copy, 
  Mail, 
  Bell, 
  MapPin, 
  Check, 
  CalendarDays,
  CalendarCheck2,
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react'
import { useApp } from '@/store/useApp'
import { Card } from '@/modules/crm/components/ui'
import { APPOINTMENTS, USER } from '@/lib/data/mock'

export interface GHLCalendar {
  id: string
  name: string
  description?: string
  calendarType?: string
  groupId?: string
}

const TABS = [
  { id: 'agente', label: 'Mis Citas y Agenda' },
  { id: 'cliente', label: 'Página de Reservación' },
  { id: 'config', label: 'Configuración' },
] as const

/* Colores para distinguir cada calendario visualmente */
const CALENDAR_COLORS = [
  { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-500', ring: 'ring-blue-200' },
  { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-500', ring: 'ring-purple-200' },
  { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-500', ring: 'ring-amber-200' },
  { border: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-500', ring: 'ring-rose-200' },
]

/* ---------- VISTA DEL AGENTE (AGENDA Y CITAS) ---------- */

function AgentView({ 
  selectedCalendarId, 
  calendars 
}: { 
  selectedCalendarId: string
  calendars: GHLCalendar[] 
}) {
  const [filterPeriod, setFilterPeriod] = useState<'Hoy' | 'Semana' | 'Mes'>('Semana')
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Consultar citas reales desde GHL
  useEffect(() => {
    setLoading(true)
    const url = `/api/ghl/calendars/events${selectedCalendarId !== 'all' ? `?calendarId=${selectedCalendarId}` : ''}`
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.events && Array.isArray(data.events)) {
          setEvents(data.events)
        } else {
          setEvents([])
        }
      })
      .catch((err) => {
        console.warn('Error al cargar eventos de GHL:', err)
        setEvents([])
      })
      .finally(() => setLoading(false))
  }, [selectedCalendarId])

  // Si no hay eventos en vivo en GHL, usar appointments de demostración mapeados
  const displayItems = events.length > 0 
    ? events.map(e => ({
        id: e.id,
        time: new Date(e.startTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(e.startTime).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        clientName: e.title || e.contact?.name || 'Prospecto GHL',
        channelType: e.meetingLocationType === 'zoom' ? 'zoom' : 'meet',
        channelLabel: e.meetingLocationType === 'zoom' ? 'Zoom' : 'Google Meet',
        duration: Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000) || 30,
        status: e.appointmentStatus || 'confirmada',
        calendarName: calendars.find(c => c.id === e.calendarId)?.name || 'General',
        day: new Date(e.startTime).toDateString() === new Date().toDateString() ? 'hoy' : 'mañana'
      }))
    : APPOINTMENTS.map(a => ({
        ...a,
        date: a.day === 'hoy' ? 'Hoy' : 'Mañana',
        calendarName: calendars.find(c => c.id === selectedCalendarId)?.name || 'Consulta Diagnóstico'
      }))

  const groups = [
    { label: 'HOY — CITAS PROGRAMADAS', items: displayItems.filter((a) => a.day === 'hoy') },
    { label: 'PRÓXIMAS CITAS (MAÑANA Y SEMANA)', items: displayItems.filter((a) => a.day !== 'hoy') },
  ]

  const STATUS: Record<string, string> = {
    confirmada: 'bg-stage-close-bg text-stage-close-text',
    confirmed: 'bg-stage-close-bg text-stage-close-text',
    showed: 'bg-stage-close-bg text-stage-close-text',
    pendiente: 'bg-stage-proposal-bg text-stage-proposal-text',
    new: 'bg-stage-proposal-bg text-stage-proposal-text',
    cancelada: 'bg-stage-lost-bg text-stage-lost-text',
    cancelled: 'bg-stage-lost-bg text-stage-lost-text',
    noshow: 'bg-stage-lost-bg text-stage-lost-text',
  }

  const activeCalendarObj = calendars.find(c => c.id === selectedCalendarId)

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Panel Izquierdo: Lista de Citas (Ocupa 2 columnas) */}
      <Card className="p-5 lg:col-span-2 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="font-bold text-base text-ink flex items-center gap-2">
              <CalendarCheck2 size={18} className="text-primary-light" />
              Agenda de Citas
            </h2>
            <p className="text-xs text-ink-soft">
              {activeCalendarObj 
                ? `Mostrando citas exclusivas del calendario: ${activeCalendarObj.name}` 
                : 'Mostrando todas las citas consolidadas de la subcuenta'}
            </p>
          </div>
          <div className="flex items-center rounded-lg border border-line bg-soft/60 p-0.5 text-xs font-semibold">
            {(['Hoy', 'Semana', 'Mes'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  filterPeriod === p ? 'bg-primary text-inverse shadow-xs' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-ink-soft flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin" /> Cargando citas desde GoHighLevel...
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mb-6 last:mb-0">
              <p className="mb-2.5 text-[11px] font-bold tracking-wider text-ink-soft uppercase">{g.label}</p>
              {g.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-soft">
                  No hay citas registradas en este periodo.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {g.items.map((a: any) => {
                    const isCancelled = a.status === 'cancelada' || a.status === 'cancelled'
                    return (
                      <div
                        key={a.id}
                        className={`group flex items-center gap-3.5 rounded-xl border border-line bg-app p-3.5 shadow-xs transition-all hover:border-primary-light/50 hover:shadow-sm ${
                          isCancelled ? 'opacity-55' : ''
                        }`}
                      >
                        {/* Horario */}
                        <div className="w-16 shrink-0 rounded-lg bg-soft p-2 text-center">
                          <p className={`text-xs font-bold ${isCancelled ? 'text-ink-soft' : 'text-primary-light'}`}>
                            {a.time}
                          </p>
                          <p className="text-[10px] font-medium text-ink-soft">{a.date}</p>
                        </div>

                        {/* Info de contacto y calendario */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold text-ink ${isCancelled ? 'line-through' : ''}`}>
                              {a.clientName}
                            </p>
                            {/* Chip del calendario específico */}
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-light">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                              {a.calendarName}
                            </span>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                            {a.channelType === 'zoom' ? <Video size={12} /> : <Phone size={12} />}
                            {a.channelLabel} · {a.duration} min
                          </p>
                        </div>

                        {/* Estado */}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            STATUS[a.status] || 'bg-soft text-ink-soft'
                          }`}
                        >
                          {a.status}
                        </span>

                        {/* Acciones */}
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded-lg border border-line p-2 text-ink-soft hover:bg-soft hover:text-ink"
                            title="Ver en GoHighLevel"
                          >
                            <Video size={13} />
                          </button>
                          <button
                            className="rounded-lg border border-line p-2 text-wa-text hover:bg-wa-bg"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      {/* Panel Derecho: Métricas y Disponibilidad */}
      <div className="space-y-4">
        <Card className="p-5 shadow-xs">
          <h2 className="mb-3 font-bold text-sm text-ink flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            Rendimiento de Citas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total citas', value: displayItems.length.toString(), cls: 'text-ink' },
              { label: 'Confirmadas', value: displayItems.filter(i => i.status.includes('confirm')).length.toString(), cls: 'text-stage-close-text' },
              { label: 'Canceladas', value: displayItems.filter(i => i.status.includes('cancel')).length.toString(), cls: 'text-danger' },
              { label: 'Asistencia', value: '88%', cls: 'text-primary-light' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-soft/40 p-3">
                <p className="text-[11px] font-medium text-ink-soft">{s.label}</p>
                <p className={`mt-0.5 text-xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-xs">
          <h2 className="mb-3 font-bold text-sm text-ink">Horarios de Atención</h2>
          <div className="space-y-2.5 text-xs">
            {[
              { d: 'Lun–Vie', h: '9:00 am – 6:00 pm', badge: 'Activo', cls: 'bg-stage-close-bg text-stage-close-text' },
              { d: 'Sábado', h: '10:00 am – 2:00 pm', badge: 'Guardia', cls: 'bg-stage-proposal-bg text-stage-proposal-text' },
              { d: 'Domingo', h: 'Sin citas', badge: 'Cerrado', cls: 'bg-stage-lost-bg text-stage-lost-text' },
            ].map((r) => (
              <div key={r.d} className="flex items-center justify-between py-1 border-b border-line-soft last:border-0">
                <span className="font-semibold text-ink">{r.d}</span>
                <span className="text-ink-soft">{r.h}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.cls}`}>{r.badge}</span>
              </div>
            ))}
          </div>
        </Card>

        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.origin + '/reservar')
            alert('Enlace copiado al portapapeles')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-inverse hover:bg-primary-light transition shadow-xs"
        >
          <Copy size={13} /> Copiar Link de Reservación
        </button>
      </div>
    </div>
  )
}

/* ---------- VISTA DEL CLIENTE ---------- */

const DAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO']
const AVAILABLE = [10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26]
const SLOTS = ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am', '2:00 pm', '2:30 pm', '3:00 pm', '3:30 pm', '4:00 pm', '4:30 pm']

function ClientView({ calendarName }: { calendarName: string }) {
  const [day, setDay] = useState(12)
  const [slot, setSlot] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  if (confirmed)
    return (
      <Card className="mx-auto max-w-md p-8 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stage-close-bg">
          <Check size={28} className="text-stage-close-text" />
        </div>
        <h2 className="text-lg font-bold">¡Cita confirmada!</h2>
        <span className="mt-2 inline-block rounded-full bg-stage-close-bg px-3 py-1 text-xs font-semibold text-stage-close-text">
          ✉ Confirmación enviada por Email y WhatsApp
        </span>
        <div className="mt-4 rounded-xl bg-soft p-4 text-left text-sm">
          <p><strong>📅 {day} de este mes</strong> a las <strong>{slot}</strong></p>
          <p className="mt-1 text-ink-soft">⏱ 30 minutos · {calendarName}</p>
          <p className="mt-1 text-primary-light font-medium">Link de videollamada generado automáticamente</p>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={() => { setConfirmed(false); setSlot(null) }} className="flex-1 rounded-lg border border-line py-2.5 text-xs font-semibold hover:bg-soft">
            Agendar otra
          </button>
        </div>
      </Card>
    )

  return (
    <div className="grid gap-0 overflow-hidden rounded-xl border border-line bg-app lg:grid-cols-2 shadow-xs">
      <div className="border-b border-line p-6 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-inverse">
            GHL
          </div>
          <div>
            <p className="font-bold text-sm">{calendarName}</p>
            <p className="text-xs text-ink-soft">Sincronizado con GoHighLevel</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-soft p-3.5 text-xs">
          <p className="font-bold text-ink">Horarios Disponibles</p>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-ink-soft">
            <span className="flex items-center gap-1"><Clock size={12} /> 30-45 min</span>
            <span className="flex items-center gap-1"><Video size={12} /> Google Meet / Zoom</span>
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="font-bold text-sm">Fechas Disponibles</span>
          <span className="flex items-center gap-1 text-xs text-ink-soft"><Globe size={12} /> CDMX (GMT-6)</span>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {DAYS.map((d) => <div key={d} className="py-1 text-[10px] font-bold text-ink-soft">{d}</div>)}
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
            const avail = AVAILABLE.includes(d)
            const sel = day === d
            return (
              <button
                key={d}
                disabled={!avail}
                onClick={() => { setDay(d); setSlot(null) }}
                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  sel ? 'bg-primary font-bold text-inverse'
                  : avail ? 'bg-stage-new-bg text-stage-new-text hover:bg-primary-light hover:text-inverse'
                  : 'text-ink-soft/40'
                }`}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-bold text-sm text-ink mb-3">Horas disponibles para el día {day}</h3>
        {!slot ? (
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className="rounded-lg border border-line py-2 text-xs font-semibold hover:border-primary hover:bg-primary/5 transition"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-soft/50 p-3 text-xs">
              <p className="font-bold text-primary-light">Seleccionado: {slot} (Día {day})</p>
            </div>
            <input placeholder="Nombre completo" className="w-full rounded-lg border border-line bg-app p-2.5 text-xs outline-none focus:border-primary" />
            <input placeholder="Correo electrónico" className="w-full rounded-lg border border-line bg-app p-2.5 text-xs outline-none focus:border-primary" />
            <input placeholder="WhatsApp" className="w-full rounded-lg border border-line bg-app p-2.5 text-xs outline-none focus:border-primary" />
            <button onClick={() => setConfirmed(true)} className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-inverse hover:bg-primary-light transition">
              Confirmar Cita
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- VISTA PRINCIPAL CON SELECTOR HERO DESTACADO ---------- */

export default function CalendarView() {
  const { calendarTab, setCalendarTab } = useApp()
  const [calendars, setCalendars] = useState<GHLCalendar[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('all')
  const [isScopeError, setIsScopeError] = useState(false)
  const [loadingCalendars, setLoadingCalendars] = useState(false)

  // Cargar calendarios reales de GHL
  useEffect(() => {
    setLoadingCalendars(true)
    fetch('/api/ghl/calendars')
      .then((res) => res.json())
      .then((data) => {
        if (data.isScopeError) {
          setIsScopeError(true)
        } else if (data.calendars && data.calendars.length > 0) {
          setCalendars(data.calendars)
          setIsScopeError(false)
        } else {
          // Calendarios demo si no hay creados
          setCalendars([
            { id: 'cal_diag', name: 'Sesión de Diagnóstico Gratuita', description: 'Videollamada 1 a 1' },
            { id: 'cal_prop', name: 'Visita Inmobiliaria / Presencial', description: 'Recorridos de propiedades' },
            { id: 'cal_cierre', name: 'Reunión de Cierre y Contrato', description: 'Firmas y propuestas formales' },
          ])
        }
      })
      .catch(() => {
        setCalendars([
          { id: 'cal_diag', name: 'Sesión de Diagnóstico Gratuita' },
          { id: 'cal_prop', name: 'Visita Inmobiliaria / Presencial' },
        ])
      })
      .finally(() => setLoadingCalendars(false))
  }, [])

  const activeCalendar = calendars.find((c) => c.id === selectedCalendarId)
  const activeIndex = calendars.findIndex((c) => c.id === selectedCalendarId)
  const activeColor = activeIndex >= 0 ? CALENDAR_COLORS[activeIndex % CALENDAR_COLORS.length] : null

  return (
    <div className="animate-rise space-y-5 p-4 lg:p-6">
      {/* ─────────────────────────────────────────────────────────────
          SELECTOR HERO ULTRA-DESTACADO (Resuelve la confusión de GHL)
         ───────────────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 shadow-sm ${
        activeColor ? `${activeColor.border} ${activeColor.bg}` : 'border-indigo-500/80 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white'
      } p-4 sm:p-5`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Lado izquierdo: Identificador visual potente */}
          <div className="flex items-center gap-3.5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors ${
              activeColor ? `${activeColor.badge} text-white` : 'bg-indigo-600 text-white'
            }`}>
              <CalendarDays size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-indigo-900/70 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  CALENDARIO ACTIVO EN PANTALLA
                </span>
                {selectedCalendarId !== 'all' && (
                  <button
                    onClick={() => setSelectedCalendarId('all')}
                    className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-line px-2 py-0.5 text-[10px] font-bold text-ink-soft hover:bg-white hover:text-ink shadow-2xs transition"
                    title="Volver a ver todos los calendarios"
                  >
                    <X size={11} /> Ver todos
                  </button>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-ink mt-0.5">
                {selectedCalendarId === 'all' ? (
                  <span className="text-indigo-950 flex items-center gap-2">
                    Todos los Calendarios <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-900">Vista Global</span>
                  </span>
                ) : (
                  <span className={activeColor?.text}>{activeCalendar?.name}</span>
                )}
              </h1>
            </div>
          </div>

          {/* Lado derecho: Selector desplegable enriquecido */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-72">
              <label htmlFor="calendar-select" className="sr-only">Seleccionar Calendario</label>
              <select
                id="calendar-select"
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="w-full appearance-none cursor-pointer rounded-xl border-2 border-indigo-400/60 bg-white px-3.5 py-2.5 pr-10 text-xs font-bold text-ink shadow-sm outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300"
              >
                <option value="all">🌐 Ver Todos los Calendarios</option>
                {calendars.map((cal, idx) => (
                  <option key={cal.id} value={cal.id}>
                    📅 {cal.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-indigo-600 font-bold">
                <Layers size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Píldoras de acceso rápido a cada calendario debajo */}
        {calendars.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-black/5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-ink-soft uppercase mr-1">Filtro Rápido:</span>
            <button
              onClick={() => setSelectedCalendarId('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                selectedCalendarId === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/80 border border-line text-ink-soft hover:bg-white hover:text-ink'
              }`}
            >
              Todos ({calendars.length})
            </button>
            {calendars.map((cal, idx) => {
              const col = CALENDAR_COLORS[idx % CALENDAR_COLORS.length]
              const isSelected = selectedCalendarId === cal.id
              return (
                <button
                  key={cal.id}
                  onClick={() => setSelectedCalendarId(cal.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1.5 ${
                    isSelected
                      ? `${col.badge} text-white font-bold shadow-xs`
                      : 'bg-white/80 border border-line text-ink-soft hover:bg-white hover:text-ink'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : col.badge}`} />
                  {cal.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Notificación si falta el Scope de GHL */}
        {isScopeError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <p>
              <strong>Atención:</strong> Para jalar tus citas reales de GoHighLevel, activa los permisos de <strong>Calendars</strong> en tu Private Integration de GHL.
            </p>
          </div>
        )}
      </div>

      {/* Navegación por pestañas */}
      <div className="flex items-center gap-2 border-b border-line pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setCalendarTab(t.id)}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              calendarTab === t.id
                ? 'bg-primary text-inverse shadow-xs'
                : 'text-ink-soft hover:bg-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido según pestaña */}
      {calendarTab === 'agente' && (
        <AgentView 
          selectedCalendarId={selectedCalendarId} 
          calendars={calendars} 
        />
      )}
      {calendarTab === 'cliente' && (
        <ClientView 
          calendarName={activeCalendar?.name || 'Consulta General'} 
        />
      )}
      {calendarTab === 'config' && (
        <div className="p-6 text-center text-xs text-ink-soft rounded-xl border border-line bg-app">
          Los enlaces públicos y recordatorios se configuran directamente desde tus calendarios vinculados de GoHighLevel.
        </div>
      )}
    </div>
  )
}
