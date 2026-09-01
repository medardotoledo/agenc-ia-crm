'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, MapPin,
  Video, Phone, Clock, Check, CalendarDays, Building2, User,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

// ─── TIPOS ───────────────────────────────────────────────────
type VisitType  = 'inperson' | 'videocall' | 'phone';
type ApptStatus = 'confirmada' | 'pendiente' | 'cancelada';

interface Cita {
  id: string;
  title: string | null;
  starts_at: string;
  ends_at: string | null;
  duration_min: number;
  status: ApptStatus;
  visit_type: VisitType;
  notes: string | null;
  lead_id: string | null;
  agent_id: string | null;
  lead_name?: string | null;
  lead_phone?: string | null;
  property_title?: string | null;
  agent_name?: string | null;
}

interface Prospecto { id: string; name: string; phone: string | null; property_title: string | null; }
interface Agent     { id: string; name: string; }

// ─── CONFIG ──────────────────────────────────────────────────
const VISIT_META: Record<VisitType, { label: string; Icon: typeof MapPin; color: string }> = {
  inperson:  { label: 'Visita presencial', Icon: MapPin,  color: 'text-emerald-600 bg-emerald-50' },
  videocall: { label: 'Videollamada',       Icon: Video,   color: 'text-blue-600 bg-blue-50' },
  phone:     { label: 'Llamada',            Icon: Phone,   color: 'text-violet-600 bg-violet-50' },
};

const STATUS_STYLE: Record<ApptStatus, string> = {
  confirmada: 'bg-emerald-100 text-emerald-700',
  pendiente:  'bg-amber-100 text-amber-700',
  cancelada:  'bg-red-100 text-red-600 line-through opacity-60',
};

const DURATION_OPTS = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1 h 30' },
  { value: 120, label: '2 horas' },
];

// ─── HELPERS ─────────────────────────────────────────────────
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay(); // 0=Sun
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function localDatetimeStr(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── MODAL NUEVA CITA ────────────────────────────────────────
function NewCitaModal({ accountId, prospectos, agents, preDate, preLead, onClose, onCreate }: {
  accountId: string;
  prospectos: Prospecto[];
  agents: Agent[];
  preDate?: Date;
  preLead?: string;
  onClose: () => void;
  onCreate: (c: Cita) => void;
}) {
  const [form, setForm] = useState({
    lead_id:      preLead ?? '',
    agent_id:     '',
    visit_type:   'inperson' as VisitType,
    duration_min: 60,
    notes:        '',
    status:       'confirmada' as ApptStatus,
  });
  const [startsAt, setStartsAt] = useState(
    localDatetimeStr(preDate ?? (() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; })())
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectedLead = prospectos.find((p) => p.id === form.lead_id);
  const title = selectedLead
    ? `Visita: ${selectedLead.name}${selectedLead.property_title ? ` · ${selectedLead.property_title}` : ''}`
    : '';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startsAt) { setErr('La fecha y hora son requeridas.'); return; }
    setSaving(true); setErr('');
    const supabase = createBrowserSupabaseClient();
    const starts = new Date(startsAt).toISOString();
    const ends   = new Date(new Date(startsAt).getTime() + form.duration_min * 60000).toISOString();

    const { data, error } = await supabase.from('appointments').insert({
      account_id:   accountId,
      lead_id:      form.lead_id || null,
      agent_id:     form.agent_id || null,
      title:        title || null,
      starts_at:    starts,
      ends_at:      ends,
      duration_min: Number(form.duration_min),
      visit_type:   form.visit_type,
      status:       form.status,
      notes:        form.notes || null,
    }).select().single();

    if (error) { setErr(error.message); setSaving(false); return; }

    const agent = agents.find((a) => a.id === form.agent_id);
    onCreate({
      ...data,
      lead_name:      selectedLead?.name ?? null,
      lead_phone:     selectedLead?.phone ?? null,
      property_title: selectedLead?.property_title ?? null,
      agent_name:     agent?.name ?? null,
    } as Cita);
    onClose();
  };

  const FIELD = 'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-primary/40';
  const LABEL = 'mb-1 block text-xs font-semibold text-ink-soft';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-app shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays size={16} />
          </div>
          <h2 className="flex-1 font-bold text-ink">Nueva cita</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-soft">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 px-5 py-4 max-h-[70vh] overflow-y-auto">
          {err && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</p>}

          {/* Prospecto */}
          <div>
            <label className={LABEL}>Prospecto</label>
            <select value={form.lead_id} onChange={set('lead_id')} className={FIELD}>
              <option value="">— Sin prospecto —</option>
              {prospectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.property_title ? ` · ${p.property_title}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha/hora + duración */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL}>Fecha y hora *</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Duración</label>
              <select value={form.duration_min} onChange={set('duration_min')} className={FIELD}>
                {DURATION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo de visita */}
          <div>
            <label className={LABEL}>Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(VISIT_META) as [VisitType, typeof VISIT_META[VisitType]][]).map(([k, m]) => {
                const active = form.visit_type === k;
                return (
                  <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, visit_type: k }))}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition-all ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-soft text-ink-soft hover:border-primary/30'
                    }`}>
                    <m.Icon size={16} />
                    <span className="leading-tight text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agente */}
          {agents.length > 0 && (
            <div>
              <label className={LABEL}>Agente asignado</label>
              <select value={form.agent_id} onChange={set('agent_id')} className={FIELD}>
                <option value="">— Sin asignar —</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {/* Estado */}
          <div>
            <label className={LABEL}>Estado</label>
            <select value={form.status} onChange={set('status')} className={FIELD}>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className={LABEL}>Notas</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2}
              placeholder="Instrucciones, dirección, qué ver…"
              className={`${FIELD} resize-none`} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-soft">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !startsAt}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-inverse hover:bg-primary-light disabled:opacity-40">
            {saving ? 'Guardando…' : 'Agendar cita'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── TARJETA DE CITA ─────────────────────────────────────────
function CitaCard({ cita, onStatusChange }: { cita: Cita; onStatusChange: (id: string, s: ApptStatus) => void }) {
  const meta = VISIT_META[cita.visit_type];
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border bg-app p-3 shadow-sm transition-all hover:shadow-md ${
      cita.status === 'cancelada' ? 'opacity-50' : 'border-line'
    }`}>
      {/* Hora + tipo */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-ink-soft" />
          <span className="text-xs font-semibold text-ink">{fmtTime(cita.starts_at)}</span>
          <span className="text-xs text-ink-soft">· {cita.duration_min} min</span>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
          <meta.Icon size={9} />
          {meta.label}
        </span>
      </div>

      {/* Prospecto */}
      {cita.lead_name && (
        <div className="flex items-center gap-1.5 mb-1">
          <User size={11} className="text-ink-soft shrink-0" />
          <p className="text-sm font-semibold text-ink truncate">{cita.lead_name}</p>
        </div>
      )}

      {/* Propiedad */}
      {cita.property_title && (
        <div className="flex items-center gap-1.5 mb-1">
          <Building2 size={11} className="text-ink-soft shrink-0" />
          <p className="text-xs text-ink-soft truncate">{cita.property_title}</p>
        </div>
      )}

      {/* Agente */}
      {cita.agent_name && (
        <p className="text-[11px] text-ink-soft mb-2">Agente: {cita.agent_name}</p>
      )}

      {/* Notas */}
      {cita.notes && (
        <p className="text-[11px] text-ink-soft bg-soft rounded-lg px-2 py-1 mb-2 line-clamp-2">{cita.notes}</p>
      )}

      {/* Status + acciones */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[cita.status]}`}>
          {cita.status}
        </span>
        <div className="flex gap-1">
          {cita.status !== 'confirmada' && (
            <button onClick={() => onStatusChange(cita.id, 'confirmada')}
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <Check size={10} className="inline mr-0.5" />Confirmar
            </button>
          )}
          {cita.status !== 'cancelada' && (
            <button onClick={() => onStatusChange(cita.id, 'cancelada')}
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
              <X size={10} className="inline mr-0.5" />Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export { NewCitaModal };
export function CitasView({ accountId, preLeadId }: { accountId: string; preLeadId?: string | null }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [citas, setCitas] = useState<Cita[]>([]);
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [preDate, setPreDate] = useState<Date | undefined>(undefined);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const [citasRes, leadsRes, propsRes, agentsRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('id,title,starts_at,ends_at,duration_min,status,visit_type,notes,lead_id,agent_id')
        .eq('account_id', accountId)
        .gte('starts_at', weekStart.toISOString())
        .lt('starts_at', weekEnd.toISOString())
        .order('starts_at'),
      supabase.from('leads').select('id,name,phone,property_id').eq('account_id', accountId),
      supabase.from('properties').select('id,title').eq('account_id', accountId),
      supabase.from('agents').select('id,name').eq('account_id', accountId),
    ]);

    const leadsMap = new Map((leadsRes.data ?? []).map((l: any) => [l.id, l]));
    const propsMap = new Map((propsRes.data ?? []).map((p: any) => [p.id, p.title]));
    const agentsMap = new Map((agentsRes.data ?? []).map((a: any) => [a.id, a.name]));

    setCitas((citasRes.data ?? []).map((r: any) => {
      const lead = leadsMap.get(r.lead_id) as any;
      return {
        ...r,
        lead_name:      lead?.name ?? null,
        lead_phone:     lead?.phone ?? null,
        property_title: lead?.property_id ? (propsMap.get(lead.property_id) ?? null) : null,
        agent_name:     r.agent_id ? (agentsMap.get(r.agent_id) ?? null) : null,
      };
    }));

    setProspectos((leadsRes.data ?? []).map((r: any) => ({
      id: r.id, name: r.name, phone: r.phone,
      property_title: r.property_id ? (propsMap.get(r.property_id) ?? null) : null,
    })));

    setAgents(agentsRes.data ?? []);
    setLoading(false);
  }, [accountId, weekStart.toISOString()]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: ApptStatus) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('appointments').update({ status }).eq('id', id);
    setCitas((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  };

  const today = new Date();

  const citasForDay = (day: Date) =>
    citas.filter((c) => isSameDay(new Date(c.starts_at), day));

  const totalSemana  = citas.length;
  const confirmadas  = citas.filter((c) => c.status === 'confirmada').length;
  const pendientes   = citas.filter((c) => c.status === 'pendiente').length;

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado semana */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-line bg-soft/50 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-app hover:bg-soft transition-colors">
            <ChevronLeft size={15} />
          </button>
          <div className="text-sm font-semibold text-ink min-w-[180px] text-center">
            {weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
            {' — '}
            {addDays(weekStart, 6).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-app hover:bg-soft transition-colors">
            <ChevronRight size={15} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-lg border border-line bg-app px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-soft transition-colors">
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-ink-soft">
            <span>{totalSemana} esta semana</span>
            {confirmadas > 0 && <span className="text-emerald-600 font-semibold">{confirmadas} confirmadas</span>}
            {pendientes > 0  && <span className="text-amber-600 font-semibold">{pendientes} pendientes</span>}
          </div>
          <button onClick={() => { setPreDate(undefined); setShowNew(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-inverse hover:bg-primary-light transition-colors">
            <Plus size={13} /> Agendar cita
          </button>
        </div>
      </div>

      {/* Calendario semanal */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-ink-soft">Cargando citas…</div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[700px] h-full grid grid-cols-7 divide-x divide-line">
            {days.map((day) => {
              const dayItems = citasForDay(day);
              const isToday  = isSameDay(day, today);
              const isPast   = day < today && !isToday;

              return (
                <div key={day.toISOString()} className={`flex flex-col min-h-full ${isPast ? 'bg-soft/30' : ''}`}>
                  {/* Cabecera día */}
                  <div
                    className={`border-b border-line px-2 py-2 text-center cursor-pointer hover:bg-soft/60 transition-colors ${
                      isToday ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => { setPreDate(day); setShowNew(true); }}
                    title="Agendar en este día"
                  >
                    <div className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-ink-soft'}`}>
                      {day.toLocaleDateString('es-MX', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold leading-tight ${isToday ? 'text-primary' : isPast ? 'text-ink-soft/50' : 'text-ink'}`}>
                      {day.getDate()}
                    </div>
                    {dayItems.length > 0 && (
                      <div className="mt-1 flex justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>

                  {/* Citas del día */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {dayItems.length === 0 ? (
                      <div
                        className="flex h-16 items-center justify-center rounded-xl border border-dashed border-line cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                        onClick={() => { setPreDate(day); setShowNew(true); }}
                      >
                        <Plus size={14} className="text-ink-soft/30 group-hover:text-primary/50" />
                      </div>
                    ) : (
                      dayItems.map((c) => (
                        <CitaCard key={c.id} cita={c} onStatusChange={changeStatus} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nueva cita */}
      {showNew && (
        <NewCitaModal
          accountId={accountId}
          prospectos={prospectos}
          agents={agents}
          preDate={preDate}
          preLead={preLeadId ?? undefined}
          onClose={() => setShowNew(false)}
          onCreate={(c) => { setCitas((prev) => [...prev, c].sort((a, b) => a.starts_at.localeCompare(b.starts_at))); }}
        />
      )}
    </div>
  );
}
