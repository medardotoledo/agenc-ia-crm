import { useState } from 'react'
import { ChevronLeft, ChevronRight, Globe, Clock, Video, Phone, MessageCircle, X, RefreshCw, Copy, Mail, Bell, MapPin, Check } from 'lucide-react'
import { useApp } from '@/store/useApp'
import { Card } from '@/modules/crm/components/ui'
import { APPOINTMENTS, USER } from '@/lib/data/mock'

const TABS = [
  { id: 'cliente', label: 'Vista del cliente' },
  { id: 'agente', label: 'Vista del agente' },
  { id: 'config', label: 'Configuración del agente' },
] as const

/* ---------- VISTA DEL CLIENTE (página pública de reservación) ---------- */

const DAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO']
const AVAILABLE = [10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26]
const SLOTS = ['9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am', '2:00 pm', '2:30 pm', '3:00 pm', '3:30 pm', '4:00 pm', '4:30 pm']
const TAKEN = new Set(['11:00 am', '3:00 pm'])

function ClientView() {
  const [day, setDay] = useState(12)
  const [slot, setSlot] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  if (confirmed)
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stage-close-bg">
          <Check size={28} className="text-stage-close-text" />
        </div>
        <h2 className="text-lg font-bold">¡Cita confirmada!</h2>
        <span className="mt-2 inline-block rounded-full bg-stage-close-bg px-3 py-1 text-xs font-semibold text-stage-close-text">
          ✉ Correo enviado a cliente@correo.com
        </span>
        <div className="mt-4 rounded-xl bg-soft p-4 text-left text-sm">
          <p><strong>📅 {day} de junio de 2026</strong> a las <strong>{slot}</strong></p>
          <p className="mt-1 text-ink-soft">⏱ 30 minutos · 📹 Google Meet</p>
          <p className="mt-1 text-primary-light">meet.google.com/xxx-demo-link</p>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={() => { setConfirmed(false); setSlot(null) }} className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold hover:bg-soft">
            Agendar otra
          </button>
          <button className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-inverse hover:bg-primary-light">
            Agregar a mi calendario
          </button>
        </div>
      </Card>
    )

  return (
    <div className="grid gap-0 overflow-hidden rounded-xl border border-line bg-app lg:grid-cols-2">
      {/* Izquierda: info + calendario */}
      <div className="border-b border-line p-6 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stage-new-bg text-sm font-bold text-stage-new-text">MT</div>
          <div>
            <p className="font-bold">{USER.fullName}</p>
            <p className="text-xs text-ink-soft">Consultoría AGENC-IA Digital</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-cream p-3.5 text-sm">
          <p className="font-bold">Sesión de diagnóstico gratuita</p>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
            <span className="flex items-center gap-1"><Clock size={12} /> 30 min</span>
            <span className="flex items-center gap-1"><Video size={12} /> Google Meet</span>
            <span className="flex items-center gap-1">$ Gratis</span>
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="rounded-full border border-line p-1.5 hover:bg-soft"><ChevronLeft size={14} /></button>
            <span className="font-bold">Junio 2026</span>
            <button className="rounded-full border border-line p-1.5 hover:bg-soft"><ChevronRight size={14} /></button>
          </div>
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
                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  sel ? 'bg-primary font-bold text-inverse'
                  : avail ? 'bg-stage-new-bg text-stage-new-text hover:bg-primary-light hover:text-inverse'
                  : 'text-ink-soft/40'
                } ${d === 10 && !sel ? 'ring-1 ring-primary-light' : ''}`}
              >
                {d}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-ink-soft">Recibirás confirmación por correo ✉</p>
      </div>

      {/* Derecha: horarios + formulario */}
      <div className="bg-cream p-6">
        <p className="flex items-center gap-1.5 text-sm font-bold"><Clock size={14} className="text-primary-light" /> {day} de junio de 2026</p>
        {!slot ? (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {SLOTS.map((s) => {
              const taken = TAKEN.has(s)
              return (
                <button
                  key={s}
                  disabled={taken}
                  onClick={() => setSlot(s)}
                  className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                    taken ? 'border-line-soft bg-soft text-ink-soft/40 line-through'
                    : 'border-line bg-app hover:border-primary-light hover:text-primary-light'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mt-4">
            <div className="rounded-xl border border-line bg-app p-3.5 text-sm">
              <p className="font-bold">Sesión de diagnóstico — {slot}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{day} jun 2026 · 30 min · Google Meet</p>
            </div>
            <div className="mt-4 space-y-3">
              <input placeholder="Nombre completo" className="w-full rounded-lg border border-line bg-app p-3 text-sm outline-none focus:border-primary-light" />
              <div>
                <input placeholder="Correo electrónico" className="w-full rounded-lg border border-line bg-app p-3 text-sm outline-none focus:border-primary-light" />
                <p className="mt-1 text-[11px] text-ink-soft">Te enviaremos confirmación e invitación de calendario</p>
              </div>
              <input placeholder="WhatsApp (opcional)" className="w-full rounded-lg border border-line bg-app p-3 text-sm outline-none focus:border-primary-light" />
            </div>
            <button onClick={() => setConfirmed(true)} className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-bold text-inverse hover:bg-primary-light">
              Confirmar y recibir invitación
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- VISTA DEL AGENTE (agenda interna) ---------- */

function AgentView() {
  const groups = [
    { label: 'HOY — MIÉRCOLES 10', items: APPOINTMENTS.filter((a) => a.day === 'hoy') },
    { label: 'MAÑANA — JUEVES 11', items: APPOINTMENTS.filter((a) => a.day === 'mañana') },
  ]
  const STATUS = {
    confirmada: 'bg-stage-close-bg text-stage-close-text',
    pendiente: 'bg-stage-proposal-bg text-stage-proposal-text',
    cancelada: 'bg-stage-lost-bg text-stage-lost-text',
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Mis citas — Junio 2026</h2>
          <div className="flex items-center rounded-lg border border-line p-0.5 text-sm">
            {['Hoy', 'Semana', 'Mes'].map((p, i) => (
              <button key={p} className={`rounded-md px-3 py-1 font-semibold ${i === 0 ? 'bg-primary text-inverse' : 'text-ink-soft'}`}>{p}</button>
            ))}
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <p className="mb-2 text-[10px] font-bold tracking-[0.14em] text-ink-soft">{g.label}</p>
            <div className="space-y-2">
              {g.items.map((a) => {
                const cancelled = a.status === 'cancelada'
                return (
                  <div key={a.id} className={`flex items-center gap-3 rounded-xl border border-line p-3 ${cancelled ? 'opacity-50' : ''}`}>
                    <div className="w-14 text-center">
                      <p className={`text-sm font-bold ${cancelled ? 'text-ink-soft' : 'text-primary-light'}`}>{a.time.split(' ')[0]}</p>
                      <p className="text-[10px] text-ink-soft">{a.time.split(' ')[1]}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${cancelled ? 'text-ink-soft line-through' : ''}`}>{a.clientName}</p>
                      <p className="flex items-center gap-1 text-xs text-ink-soft">
                        {a.channelType === 'meet' ? <Video size={11} /> : <Phone size={11} />} {a.channelLabel} · {a.duration} min
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[a.status]}`}>
                      {a.status[0].toUpperCase() + a.status.slice(1)}
                    </span>
                    <div className="flex gap-1">
                      {cancelled ? (
                        <button className="rounded-lg border border-line p-1.5 text-ink-soft hover:bg-soft" title="Reagendar"><RefreshCw size={13} /></button>
                      ) : (
                        <>
                          <button className="rounded-lg border border-line p-1.5 text-ink-soft hover:bg-soft" title="Unirse"><Video size={13} /></button>
                          <button className="rounded-lg border border-line p-1.5 text-wa-text hover:bg-wa-bg" title="WhatsApp"><MessageCircle size={13} /></button>
                          <button className="rounded-lg border border-line p-1.5 text-danger hover:bg-stage-lost-bg" title="Cancelar"><X size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Resumen del mes</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total citas', value: '24', cls: '' },
              { label: 'Confirmadas', value: '18', cls: 'text-stage-close-text' },
              { label: 'Canceladas', value: '4', cls: 'text-danger' },
              { label: 'Tasa cierre', value: '75%', cls: 'text-primary-light' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-line p-3.5">
                <p className="text-xs text-ink-soft">{s.label}</p>
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Mi disponibilidad esta semana</h2>
          <div className="space-y-2.5 text-sm">
            {[
              { d: 'Lun–Vie', h: '9:00 am – 6:00 pm', badge: 'Activo', cls: 'bg-stage-close-bg text-stage-close-text' },
              { d: 'Sábado', h: '10:00 am – 2:00 pm', badge: 'Limitado', cls: 'bg-stage-proposal-bg text-stage-proposal-text' },
              { d: 'Domingo', h: 'No disponible', badge: 'Cerrado', cls: 'bg-stage-lost-bg text-stage-lost-text' },
            ].map((r) => (
              <div key={r.d} className="flex items-center justify-between">
                <span className="w-20 font-semibold">{r.d}</span>
                <span className="text-ink-soft">{r.h}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.cls}`}>{r.badge}</span>
              </div>
            ))}
          </div>
        </Card>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-inverse hover:bg-primary-light">
          <Copy size={14} /> Copiar link de reservación
        </button>
      </div>
    </div>
  )
}

/* ---------- CONFIGURACIÓN DEL AGENTE ---------- */

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-line'}`}
      role="switch" aria-checked={on}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-app shadow transition-all ${on ? 'left-5.5' : 'left-0.5'}`} />
    </button>
  )
}

function ConfigView() {
  const [location, setLocation] = useState('meet')
  const [toggles, setToggles] = useState({ confirm: true, r24: true, r1: false, wa: true })
  const LOCATIONS = [
    { id: 'meet', label: 'Google Meet', desc: 'Link automático por reunión', Icon: Video, color: 'text-stage-close-text' },
    { id: 'zoom', label: 'Zoom', desc: 'Pega tu link de Zoom', Icon: Video, color: 'text-primary-light' },
    { id: 'teams', label: 'Microsoft Teams', desc: 'Pega tu link de Teams', Icon: Video, color: 'text-note-text' },
    { id: 'phone', label: 'Llamada telefónica', desc: 'El agente llama al cliente', Icon: Phone, color: 'text-accent' },
    { id: 'inperson', label: 'Presencial', desc: 'Agrega la dirección', Icon: MapPin, color: 'text-danger' },
  ]
  const MAILS = [
    { id: 'confirm', label: 'Enviar al cliente', Icon: Mail },
    { id: 'r24', label: 'Recordatorio 24h antes', Icon: Bell },
    { id: 'r1', label: 'Recordatorio 1h antes', Icon: Bell },
    { id: 'wa', label: 'Recordatorio por WhatsApp', Icon: MessageCircle },
  ] as const

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-bold">Tipo de evento</h2>
        <label className="text-xs font-semibold text-ink-soft">Nombre de la sesión</label>
        <input defaultValue="Sesión de diagnóstico gratuita" className="mt-1 mb-3 w-full rounded-lg border border-line p-2.5 text-sm outline-none focus:border-primary-light" />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-soft">Duración</label>
            <input defaultValue="30 minutos" className="mt-1 w-full rounded-lg border border-line p-2.5 text-sm outline-none focus:border-primary-light" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft">Precio</label>
            <input defaultValue="Gratis" className="mt-1 w-full rounded-lg border border-line p-2.5 text-sm outline-none focus:border-primary-light" />
          </div>
        </div>
        <h3 className="mb-2 text-sm font-bold">Ubicación / Canal</h3>
        <div className="space-y-2">
          {LOCATIONS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLocation(l.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                location === l.id ? 'border-primary-light bg-stage-new-bg/40 ring-1 ring-primary-light/30' : 'border-line hover:bg-soft'
              }`}
            >
              <l.Icon size={16} className={l.color} />
              <div>
                <p className="text-sm font-semibold">{l.label}</p>
                <p className="text-xs text-ink-soft">{l.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Correo de confirmación</h2>
          <div className="space-y-3">
            {MAILS.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <m.Icon size={15} className="text-ink-soft" />
                <span className="flex-1 text-sm">{m.label}</span>
                <Toggle on={toggles[m.id]} onChange={() => setToggles((t) => ({ ...t, [m.id]: !t[m.id] }))} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <p className="px-5 pt-4 pb-2 font-bold">Previsualización del correo</p>
          <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-line">
            <div className="bg-primary px-4 py-3 text-sm font-bold text-inverse">Cita confirmada — AGENC-IA Digital</div>
            <div className="space-y-3 p-4 text-sm">
              <p>Hola <strong>[Nombre]</strong>, tu cita quedó agendada.</p>
              <div className="space-y-1 rounded-lg bg-cream p-3 text-xs">
                <p>📅 <strong>[Fecha]</strong> a las <strong>[Hora]</strong></p>
                <p className="text-ink-soft">⏱ 30 minutos</p>
                <p className="text-primary-light">📹 [Link de Google Meet]</p>
              </div>
              <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-inverse">Agregar a mi calendario</button>
            </div>
          </div>
        </Card>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-inverse hover:bg-primary-light">
          <Copy size={14} /> Copiar link público de reservación
        </button>
      </div>
    </div>
  )
}

/* ---------- CONTENEDOR ---------- */

export default function CalendarView() {
  const { calendarTab, setCalendarTab } = useApp()
  return (
    <div className="animate-rise p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setCalendarTab(t.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              calendarTab === t.id ? 'border-ink bg-app shadow-sm' : 'border-line bg-soft text-ink-soft hover:bg-app'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-2 hidden text-xs text-ink-soft md:inline">
          {calendarTab === 'cliente' ? 'Haz click en un día disponible (azul)' : calendarTab === 'config' ? 'Selecciona un día azul para reservar' : ''}
        </span>
      </div>
      {calendarTab === 'cliente' && <ClientView />}
      {calendarTab === 'agente' && <AgentView />}
      {calendarTab === 'config' && <ConfigView />}
    </div>
  )
}
