'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  MessageCircle, Phone, ExternalLink, Inbox, X, Search,
  Table2, LayoutGrid, Sheet, CalendarDays, ChevronLeft,
  ChevronDown, Clock, Building2, Mail, Check, Plus, Tag,
  Settings2,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useActiveAccount } from '@/core/account/activeAccount';
import { CitasView, NewCitaModal } from '@/modules/property-management/components/CitasView';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TIPOS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost';
type DateRange  = 'all' | 'today' | 'week' | 'month';
type ViewId     = 'tabla' | 'kanban' | 'excel' | 'citas';

interface TagRow { id: string; name: string; color: string; }

interface Prospecto {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  property_id: string | null;
  property_title: string | null;
  property_slug: string | null;
  tagIds: string[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONFIG ESTÃTICA
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VIEWS: { id: ViewId; label: string; Icon: LucideIcon }[] = [
  { id: 'tabla',  label: 'Tabla',  Icon: Table2 },
  { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
  { id: 'excel',  label: 'Excel',  Icon: Sheet },
  { id: 'citas',  label: 'Citas',  Icon: CalendarDays },
];

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'all',   label: 'Todas' },
  { id: 'today', label: 'Hoy' },
  { id: 'week',  label: 'Semana' },
  { id: 'month', label: 'Mes' },
];

const STATUS_STYLE: Record<LeadStatus, { badge: string; dot: string; col: string }> = {
  new:       { badge: 'bg-primary/10 text-primary',         dot: 'bg-primary',     col: 'border-primary/40' },
  contacted: { badge: 'bg-blue-100 text-blue-700',           dot: 'bg-blue-500',   col: 'border-blue-300' },
  qualified: { badge: 'bg-emerald-100 text-emerald-700',     dot: 'bg-emerald-500', col: 'border-emerald-300' },
  lost:      { badge: 'bg-red-100 text-red-600',             dot: 'bg-red-500',    col: 'border-red-300' },
};

const DEFAULT_LABELS: Record<LeadStatus, string> = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado', lost: 'Perdido',
};

const ALL_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'lost'];

const TAG_PALETTE = ['#DBEAFE','#D1FAE5','#FEF3C7','#FCE7F3','#EDE9FE','#FFEDD5','#E0F2FE','#F1F5F9'];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function inRange(d: string, r: DateRange) {
  if (r === 'all') return true;
  const date = new Date(d), now = new Date();
  if (r === 'today') return date.toDateString() === now.toDateString();
  if (r === 'week')  return date >= new Date(now.getTime() - 7 * 86400000);
  if (r === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  return true;
}

function waLink(phone: string, name: string, prop?: string | null) {
  const n = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(`Hola ${name}, te contactamos${prop ? ` por la propiedad: ${prop}` : ''}.`);
  return `https://wa.me/${n}?text=${msg}`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TAG CHIPS (mini display)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TagChips({ tagIds, tags, max = 2 }: { tagIds: string[]; tags: TagRow[]; max?: number }) {
  const visible = tagIds.slice(0, max);
  const extra = tagIds.length - max;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((id) => {
        const t = tags.find((x) => x.id === id);
        if (!t) return null;
        return (
          <span key={id} style={{ background: t.color }}
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-ink">
            {t.name}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="rounded-full bg-line px-1.5 py-0.5 text-[10px] text-ink-soft">+{extra}</span>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VISTA: TABLA
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TablaView({ rows, tags, selectedId, onSelect, onStatus, updating, stageLabels }: {
  rows: Prospecto[]; tags: TagRow[]; selectedId: string | null;
  onSelect: (id: string) => void; onStatus: (id: string, s: LeadStatus) => void;
  updating: string | null; stageLabels: Record<LeadStatus, string>;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-line bg-soft sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft">Prospecto</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft hidden md:table-cell">Propiedad</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft hidden xl:table-cell">Etiquetas</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft">Estado</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft hidden sm:table-cell">Hace</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-ink-soft">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((p) => {
          const style = STATUS_STYLE[p.status];
          const active = p.id === selectedId;
          return (
            <tr key={p.id} onClick={() => onSelect(p.id)}
              className={`cursor-pointer transition-colors hover:bg-soft ${active ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-ink leading-tight">{p.name}</div>
                    <div className="text-xs text-ink-soft">{p.phone ?? p.email ?? 'â€”'}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="line-clamp-1 max-w-[160px] text-xs text-ink-soft">{p.property_title ?? 'â€”'}</span>
              </td>
              <td className="px-4 py-3 hidden xl:table-cell">
                <TagChips tagIds={p.tagIds} tags={tags} max={2} />
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="relative inline-block">
                  <select value={p.status} disabled={updating === p.id}
                    onChange={(e) => onStatus(p.id, e.target.value as LeadStatus)}
                    className={`appearance-none cursor-pointer rounded-full py-1 pl-3 pr-6 text-xs font-semibold outline-none ${style.badge}`}>
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{stageLabels[s]}</option>
                    ))}
                  </select>
                  <ChevronDown size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50" />
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-ink-soft">{timeAgo(p.created_at)}</span>
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  {p.phone && (
                    <a href={waLink(p.phone, p.name, p.property_title)} target="_blank" rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors">
                      <MessageCircle size={13} />
                    </a>
                  )}
                  {p.phone && (
                    <a href={`tel:${p.phone}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Phone size={13} />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VISTA: KANBAN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KanbanView({ rows, tags, selectedId, onSelect, onStatus, updating, stageLabels }: {
  rows: Prospecto[]; tags: TagRow[]; selectedId: string | null;
  onSelect: (id: string) => void; onStatus: (id: string, s: LeadStatus) => void;
  updating: string | null; stageLabels: Record<LeadStatus, string>;
}) {
  return (
    <div className="flex gap-3 p-4 overflow-x-auto h-full">
      {ALL_STATUSES.map((status) => {
        const style = STATUS_STYLE[status];
        const col = rows.filter((p) => p.status === status);
        return (
          <div key={status} className="flex w-60 shrink-0 flex-col">
            <div className={`mb-2 flex items-center justify-between rounded-lg border-t-2 px-3 py-2 bg-soft ${style.col}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className="text-xs font-semibold text-ink">{stageLabels[status]}</span>
              </div>
              <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-bold text-ink-soft">{col.length}</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {col.map((p) => (
                <div key={p.id} onClick={() => onSelect(p.id)}
                  className={`cursor-pointer rounded-xl border bg-app p-3 transition-all hover:shadow-md hover:border-primary/30 ${
                    selectedId === p.id ? 'border-primary ring-1 ring-primary/20' : 'border-line'
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-ink-soft">{timeAgo(p.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-ink leading-tight mb-1">{p.name}</p>
                  {p.property_title && <p className="text-[11px] text-ink-soft line-clamp-1 mb-1">{p.property_title}</p>}
                  {p.phone && <p className="text-[11px] text-ink-soft">{p.phone}</p>}
                  {p.tagIds.length > 0 && (
                    <div className="mt-2">
                      <TagChips tagIds={p.tagIds} tags={tags} max={2} />
                    </div>
                  )}
                  <div className="mt-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {p.phone && (
                      <a href={waLink(p.phone, p.name, p.property_title)} target="_blank" rel="noopener noreferrer"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20">
                        <MessageCircle size={11} />
                      </a>
                    )}
                    {p.phone && (
                      <a href={`tel:${p.phone}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20">
                        <Phone size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {col.length === 0 && (
                <div className="rounded-xl border border-dashed border-line py-8 text-center">
                  <p className="text-xs text-ink-soft">Sin prospectos</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VISTA: EXCEL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ExcelView({ rows, tags, selectedId, onSelect, onStatus, updating, stageLabels }: {
  rows: Prospecto[]; tags: TagRow[]; selectedId: string | null;
  onSelect: (id: string) => void; onStatus: (id: string, s: LeadStatus) => void;
  updating: string | null; stageLabels: Record<LeadStatus, string>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-soft">
            {['Nombre','TelÃ©fono','Email','Propiedad','Etiquetas','Estado','Origen','Fecha'].map((h) => (
              <th key={h} className="border-b border-r border-line px-3 py-2 text-left font-semibold text-ink-soft whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const style = STATUS_STYLE[p.status];
            const active = p.id === selectedId;
            return (
              <tr key={p.id} onClick={() => onSelect(p.id)}
                className={`cursor-pointer transition-colors ${
                  active ? 'bg-primary/5' : i % 2 === 0 ? 'bg-app' : 'bg-soft/50'
                } hover:bg-primary/5`}>
                <td className="border-b border-r border-line px-3 py-1.5 font-medium text-ink whitespace-nowrap">{p.name}</td>
                <td className="border-b border-r border-line px-3 py-1.5 text-ink-soft whitespace-nowrap">{p.phone ?? 'â€”'}</td>
                <td className="border-b border-r border-line px-3 py-1.5 text-ink-soft whitespace-nowrap">{p.email ?? 'â€”'}</td>
                <td className="border-b border-r border-line px-3 py-1.5 text-ink-soft max-w-[180px]">
                  <span className="line-clamp-1">{p.property_title ?? 'â€”'}</span>
                </td>
                <td className="border-b border-r border-line px-3 py-1.5">
                  <TagChips tagIds={p.tagIds} tags={tags} max={3} />
                </td>
                <td className="border-b border-r border-line px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <select value={p.status} disabled={updating === p.id}
                    onChange={(e) => onStatus(p.id, e.target.value as LeadStatus)}
                    className={`appearance-none cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-semibold outline-none ${style.badge}`}>
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}
                  </select>
                </td>
                <td className="border-b border-r border-line px-3 py-1.5 text-ink-soft capitalize whitespace-nowrap">{p.source.replace('_', ' ')}</td>
                <td className="border-b border-r border-line px-3 py-1.5 text-ink-soft whitespace-nowrap">{timeAgo(p.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// CitasView viene de @/modules/property-management/components/CitasView

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PANEL LATERAL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProspectoPanel({ p, tags, onClose, onStatus, onTagToggle, onSchedule, updating, stageLabels }: {
  p: Prospecto; tags: TagRow[];
  onClose: () => void; onStatus: (id: string, s: LeadStatus) => void;
  onTagToggle: (leadId: string, tagId: string, add: boolean) => void;
  onSchedule: (leadId: string) => void;
  updating: string | null; stageLabels: Record<LeadStatus, string>;
}) {
  const style = STATUS_STYLE[p.status];
  const [tagOpen, setTagOpen] = useState(false);
  const available = tags.filter((t) => !p.tagIds.includes(t.id));

  return (
    <div className="relative flex h-full w-[420px] flex-col bg-app">
      <button onClick={onClose}
        className="absolute -left-4 top-6 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-inverse shadow-lg hover:bg-primary-light transition-colors"
        title="Cerrar panel">
        <ChevronLeft size={15} />
      </button>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {p.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-ink">{p.name}</h3>
            <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {stageLabels[p.status]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {p.phone && (
            <a href={waLink(p.phone, p.name, p.property_title)} target="_blank" rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors">
              <MessageCircle size={15} />
            </a>
          )}
          {p.phone && (
            <a href={`tel:${p.phone}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Phone size={15} />
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Datos */}
        <div className="px-5 py-4 space-y-2 border-b border-line">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 mb-3">Datos de contacto</p>
          {p.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={13} className="text-ink-soft shrink-0" />
              <a href={`tel:${p.phone}`} className="text-primary hover:underline">{p.phone}</a>
            </div>
          )}
          {p.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={13} className="text-ink-soft shrink-0" />
              <a href={`mailto:${p.email}`} className="text-primary hover:underline">{p.email}</a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Clock size={13} className="shrink-0" />
            <span>{timeAgo(p.created_at)}</span>
          </div>
        </div>

        {/* Propiedad */}
        {p.property_title && (
          <div className="px-5 py-4 border-b border-line">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 mb-3">Propiedad de interÃ©s</p>
            <a href={`/p/${p.property_slug || p.property_id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-line bg-soft p-3 hover:border-primary/30 transition-colors">
              <Building2 size={16} className="shrink-0 text-primary" />
              <span className="flex-1 text-sm font-medium text-ink line-clamp-2">{p.property_title}</span>
              <ExternalLink size={12} className="shrink-0 text-ink-soft" />
            </a>
          </div>
        )}

        {/* Etiquetas */}
        <div className="px-5 py-4 border-b border-line">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 mb-3">Etiquetas</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {p.tagIds.map((tid) => {
              const t = tags.find((x) => x.id === tid);
              if (!t) return null;
              return (
                <span key={tid} style={{ background: t.color }}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink">
                  {t.name}
                  <button onClick={() => onTagToggle(p.id, tid, false)}
                    className="opacity-60 hover:opacity-100 ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              );
            })}
            <button onClick={() => setTagOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-ink-soft hover:border-primary/40 hover:text-primary transition-colors">
              <Plus size={11} /> etiqueta
            </button>
          </div>
          {tagOpen && (
            <div className="mt-2 rounded-xl border border-line bg-soft p-2">
              {available.length === 0 ? (
                <p className="text-xs text-ink-soft px-1">Todas las etiquetas ya estÃ¡n asignadas</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {available.map((t) => (
                    <button key={t.id} style={{ background: t.color }}
                      onClick={() => { onTagToggle(p.id, t.id, true); setTagOpen(false); }}
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink hover:opacity-80 transition-opacity">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mensaje */}
        {p.message && (
          <div className="px-5 py-4 border-b border-line">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 mb-3">Mensaje</p>
            <p className="rounded-xl bg-soft p-3 text-sm text-ink leading-relaxed border border-line">{p.message}</p>
          </div>
        )}

        {/* Cambiar estado */}
        <div className="px-5 py-4 border-b border-line">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 mb-3">Cambiar etapa</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_STATUSES.map((s) => {
              const m = STATUS_STYLE[s];
              const active = p.status === s;
              return (
                <button key={s} onClick={() => onStatus(p.id, s)}
                  disabled={updating === p.id || active}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all disabled:cursor-default ${
                    active ? `${m.badge} border-current` : 'border-line bg-soft text-ink-soft hover:border-primary/30 hover:text-ink disabled:opacity-50'
                  }`}>
                  {active && <Check size={11} />}
                  <span className={`h-1.5 w-1.5 rounded-full ${m.dot} shrink-0`} />
                  {stageLabels[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Acciones */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 mb-3">Acciones rÃ¡pidas</p>
          <div className="space-y-2">
            {p.phone && (
              <a href={waLink(p.phone, p.name, p.property_title)} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#25D366] hover:bg-[#25D366]/20 transition-colors">
                <MessageCircle size={16} /> Escribir por WhatsApp
              </a>
            )}
            {p.phone && (
              <a href={`tel:${p.phone}`}
                className="flex w-full items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors">
                <Phone size={16} /> Llamar ahora
              </a>
            )}
            {p.email && (
              <a href={`mailto:${p.email}?subject=InformaciÃ³n sobre ${p.property_title ?? 'la propiedad'}`}
                className="flex w-full items-center gap-3 rounded-xl bg-soft px-4 py-3 text-sm font-semibold text-ink hover:bg-line transition-colors border border-line">
                <Mail size={16} /> Enviar email
              </a>
            )}
            <button onClick={() => onSchedule(p.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors border border-primary/20">
              <CalendarDays size={16} /> Agendar visita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODAL: NUEVO PROSPECTO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NewProspectoModal({ accountId, tags, stageLabels, onClose, onCreate }: {
  accountId: string; tags: TagRow[]; stageLabels: Record<LeadStatus, string>;
  onClose: () => void; onCreate: (p: Prospecto) => void;
}) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', message: '',
    status: 'new' as LeadStatus, source: 'manual',
  });
  const [propertyId, setPropertyId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.from('properties').select('id,title').eq('account_id', accountId).eq('is_published', true)
      .order('title').then(({ data }) => setProperties(data ?? []));
  }, [accountId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('El nombre es requerido.'); return; }
    setSaving(true); setErr('');
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('leads')
      .insert({
        account_id:  accountId,
        property_id: propertyId || null,
        name:        form.name.trim(),
        email:       form.email || null,
        phone:       form.phone || null,
        message:     form.message || null,
        status:      form.status,
        source:      form.source,
      })
      .select('id,name,email,phone,message,source,status,created_at,updated_at,property_id')
      .single();

    if (error) { setErr(error.message); setSaving(false); return; }

    if (data && selectedTagIds.length > 0) {
      await supabase.from('lead_tags').insert(
        selectedTagIds.map((tid) => ({ account_id: accountId, lead_id: data.id, tag_id: tid }))
      );
    }

    if (data) {
      const prop = properties.find((p) => p.id === propertyId);
      onCreate({
        ...data,
        property_title: prop?.title ?? null,
        property_slug:  null,
        tagIds: selectedTagIds,
      });
    }
    onClose();
  };

  const FIELD = 'w-full rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-primary/40';
  const LABEL = 'mb-1 block text-xs font-semibold text-ink-soft';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-app shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus size={16} />
          </div>
          <h2 className="flex-1 font-bold text-ink">Nuevo Prospecto</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-soft">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 px-5 py-4 max-h-[70vh] overflow-y-auto">
          {err && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</p>}

          <div>
            <label className={LABEL}>Nombre *</label>
            <input autoFocus value={form.name} onChange={set('name')} placeholder="Nombre del prospecto" className={FIELD} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>TelÃ©fono / WhatsApp</label>
              <input value={form.phone} onChange={set('phone')} placeholder="+52â€¦" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input value={form.email} onChange={set('email')} type="email" placeholder="correo@â€¦" className={FIELD} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Propiedad de interÃ©s</label>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={FIELD}>
              <option value="">â€” Sin propiedad â€”</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>{prop.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Mensaje / Notas</label>
            <textarea value={form.message} onChange={set('message')} rows={3}
              placeholder="Mensaje o notas del prospectoâ€¦"
              className={`${FIELD} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Etapa inicial</label>
              <select value={form.status} onChange={set('status')} className={FIELD}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fuente</label>
              <select value={form.source} onChange={set('source')} className={FIELD}>
                <option value="manual">Manual</option>
                <option value="contact_form">Formulario web</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="referido">Referido</option>
                <option value="api">API</option>
              </select>
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <label className={LABEL}>Etiquetas</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const sel = selectedTagIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                      style={{ background: sel ? t.color : undefined }}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all ${
                        sel ? 'border-transparent text-ink' : 'border-line text-ink-soft hover:border-primary/30'
                      }`}>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-soft">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !form.name.trim()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-inverse hover:bg-primary-light disabled:opacity-40">
            {saving ? 'Guardandoâ€¦' : 'Crear prospecto'}
          </button>
        </div>
      </form>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODAL: GESTIONAR ETIQUETAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TagManagerModal({ accountId, tags, onClose, onUpdate }: {
  accountId: string; tags: TagRow[];
  onClose: () => void; onUpdate: (tags: TagRow[]) => void;
}) {
  const [local, setLocal] = useState<TagRow[]>(tags);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase.from('tags')
      .insert({ account_id: accountId, name, color: newColor }).select().single();
    if (data) {
      const updated = [...local, data as TagRow];
      setLocal(updated); onUpdate(updated);
    }
    setNewName(''); setSaving(false);
  };

  const del = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('tags').delete().eq('id', id);
    const updated = local.filter((t) => t.id !== id);
    setLocal(updated); onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-app shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <Tag size={18} className="text-primary" />
          <h2 className="flex-1 font-bold text-ink">Gestionar etiquetas</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-soft hover:bg-soft"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-2">
          {local.length === 0 && <p className="text-sm text-ink-soft">Sin etiquetas aÃºn.</p>}
          {local.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-xl border border-line bg-soft px-3 py-2">
              <span className="h-4 w-4 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="flex-1 text-sm font-medium text-ink">{t.name}</span>
              <button onClick={() => del(t.id)}
                className="rounded-md p-1 text-ink-soft hover:text-red-500 transition-colors">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-5 py-4">
          <p className="mb-2 text-xs font-semibold text-ink-soft">Nueva etiqueta</p>
          <div className="flex items-center gap-2 mb-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Nombre de la etiquetaâ€¦"
              className="flex-1 rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-primary/40" />
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            {TAG_PALETTE.map((c) => (
              <button key={c} onClick={() => setNewColor(c)}
                style={{ background: c }}
                className={`h-6 w-6 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'hover:scale-105'}`} />
            ))}
          </div>
          <button onClick={add} disabled={saving || !newName.trim()}
            className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-inverse hover:bg-primary-light disabled:opacity-40">
            {saving ? 'Guardandoâ€¦' : 'Crear etiqueta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PÃGINA PRINCIPAL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ProspectosPage() {
  const { account } = useActiveAccount();
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [stageLabels, setStageLabels] = useState<Record<LeadStatus, string>>({ ...DEFAULT_LABELS });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewId>('tabla');
  const [showNew, setShowNew] = useState(false);
  const [showTagMgr, setShowTagMgr] = useState(false);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [citaForLead, setCitaForLead] = useState<string | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<LeadStatus[]>([]);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState<DateRange>('all');

  const selected = prospectos.find((p) => p.id === selectedId) ?? null;
  const panelOpen = selected !== null;

  const load = useCallback(async () => {
    if (!account?.id) return;
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    // 1. Fetch de Supabase para catálogos locales
    const [tagsRes, ltRes, settingsRes, agentsRes, propsRes] = await Promise.all([
      supabase.from('tags').select('id,name,color').eq('account_id', account.id),
      supabase.from('lead_tags').select('lead_id,tag_id').eq('account_id', account.id),
      supabase.from('account_settings').select('lead_stage_labels').eq('account_id', account.id).maybeSingle(),
      supabase.from('agents').select('id,name').eq('account_id', account.id),
      supabase.from('properties').select('id,title,slug').eq('account_id', account.id),
    ]);
    setAgents(agentsRes.data ?? []);

    // Stage labels personalizados
    if (settingsRes.data?.lead_stage_labels) {
      setStageLabels({ ...DEFAULT_LABELS, ...(settingsRes.data.lead_stage_labels as Record<LeadStatus, string>) });
    }

    // Tags catÃ¡logo
    setTags(tagsRes.data ?? []);

    // Map property_id â†’ { title, slug }
    const propsMap = new Map((propsRes.data ?? []).map((p: any) => [p.id, p]));

    // Map lead_id â†’ tag_ids
    const ltMap: Record<string, string[]> = {};
    for (const row of (ltRes.data ?? [])) {
      if (!ltMap[row.lead_id]) ltMap[row.lead_id] = [];
      ltMap[row.lead_id].push(row.tag_id);
    }

    // 2. Fetch de GoHighLevel Contacts
    let ghlContacts: any[] = [];
    try {
      const res = await fetch(`/api/ghl/contacts?locationId=${account.id}`);
      if (res.ok) {
        const data = await res.json();
        ghlContacts = data.prospectos || [];
      }
    } catch (err) {
      console.error('Error fetching GHL contacts:', err);
    }

    // Convertir GHL Tags (strings) a Virtual Tags en el CRM
    const ghlUniqueTags = Array.from(new Set(ghlContacts.flatMap((c: any) => c.tagIds)));
    const virtualTags = ghlUniqueTags.map((name: any, i) => ({
      id: String(name),
      name: String(name),
      color: TAG_PALETTE[i % TAG_PALETTE.length]
    }));
    
    // Unir Tags de Supabase con Tags Virtuales de GHL
    setTags((prev) => [...prev, ...virtualTags]);

    // Asignar los contactos de GHL al estado
    setProspectos(ghlContacts.map((r: any) => {
      const prop = propsMap.get(r.property_id) as any;
      return {
        ...r,
        property_title: prop?.title ?? null,
        property_slug:  prop?.slug  ?? null,
        tagIds: ltMap[r.id] ?? [],
      };
    }));
    setLoading(false);
  }, [account?.id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    setUpdating(id);
    const supabase = createBrowserSupabaseClient();
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setProspectos((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    setUpdating(null);
  };

  const toggleTag = async (leadId: string, tagId: string, add: boolean) => {
    const supabase = createBrowserSupabaseClient();
    if (add) {
      await supabase.from('lead_tags').insert({ account_id: account!.id, lead_id: leadId, tag_id: tagId });
      setProspectos((prev) => prev.map((p) => p.id === leadId ? { ...p, tagIds: [...p.tagIds, tagId] } : p));
    } else {
      await supabase.from('lead_tags').delete().eq('lead_id', leadId).eq('tag_id', tagId);
      setProspectos((prev) => prev.map((p) => p.id === leadId ? { ...p, tagIds: p.tagIds.filter((t) => t !== tagId) } : p));
    }
  };

  const filtered = useMemo(() => prospectos.filter((p) => {
    if (filterStatuses.length > 0 && !filterStatuses.includes(p.status)) return false;
    if (!inRange(p.created_at, filterDate)) return false;
    if (filterTagIds.length > 0 && !filterTagIds.some((tid) => p.tagIds.includes(tid))) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) &&
          !(p.email ?? '').toLowerCase().includes(q) &&
          !(p.phone ?? '').includes(q) &&
          !(p.property_title ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [prospectos, filterStatuses, filterDate, filterTagIds, search]);

  const toggleStatus = (s: LeadStatus) =>
    setFilterStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleFilterTag = (id: string) =>
    setFilterTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const counts = ALL_STATUSES.reduce((a, s) => ({ ...a, [s]: prospectos.filter((p) => p.status === s).length }), {} as Record<LeadStatus, number>);
  const hasFilters = filterStatuses.length > 0 || filterDate !== 'all' || search || filterTagIds.length > 0;

  const viewProps = { rows: filtered, tags, selectedId, onSelect: setSelectedId, onStatus: updateStatus, updating, stageLabels };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

      {/* HEADER */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-ink">Prospectos</h1>
          <p className="mt-0.5 text-xs text-ink-soft">{filtered.length} de {prospectos.length} Â· del sitio web</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center rounded-lg border border-line bg-app p-0.5">
            {VIEWS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveView(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeView === id ? 'bg-primary text-inverse shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}>
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {/* Nuevo Prospecto */}
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-inverse hover:bg-primary-light transition-colors">
            <Plus size={14} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="mb-3 flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscarâ€¦"
            className="h-7 w-36 rounded-lg border border-line bg-app pl-7 pr-2 text-xs outline-none focus:border-primary/40" />
        </div>

        {/* Status chips */}
        {ALL_STATUSES.map((s) => {
          const st = STATUS_STYLE[s];
          const on = filterStatuses.includes(s);
          return (
            <button key={s} onClick={() => toggleStatus(s)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                on ? `${st.badge} border-transparent` : 'border-line bg-app text-ink-soft hover:border-primary/20'
              }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              {stageLabels[s]}
              <span className="opacity-60">({counts[s]})</span>
            </button>
          );
        })}

        {/* Tag chips */}
        {tags.map((t) => {
          const on = filterTagIds.includes(t.id);
          return (
            <button key={t.id} onClick={() => toggleFilterTag(t.id)}
              style={on ? { background: t.color } : undefined}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                on ? 'border-transparent text-ink' : 'border-line bg-app text-ink-soft hover:border-primary/20'
              }`}>
              <Tag size={9} />
              {t.name}
            </button>
          );
        })}

        {/* Fecha */}
        <div className="flex items-center rounded-lg border border-line bg-app p-0.5">
          {DATE_RANGES.map(({ id, label }) => (
            <button key={id} onClick={() => setFilterDate(id)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                filterDate === id ? 'bg-primary/10 text-primary' : 'text-ink-soft hover:text-ink'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Gestionar etiquetas */}
        <button onClick={() => setShowTagMgr(true)}
          className="flex items-center gap-1 rounded-full border border-line bg-app px-2.5 py-1 text-xs text-ink-soft hover:text-ink transition-colors"
          title="Gestionar etiquetas">
          <Settings2 size={11} /> Etiquetas
        </button>

        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatuses([]); setFilterDate('all'); setFilterTagIds([]); }}
            className="flex items-center gap-1 rounded-full border border-line bg-app px-2.5 py-1 text-xs text-ink-soft hover:text-ink">
            <X size={10} /> Limpiar
          </button>
        )}
      </div>

      {/* SPLIT LAYOUT */}
      <div className="relative flex flex-1 overflow-hidden rounded-2xl border border-line">

        {/* Lista */}
        <div className="flex-1 overflow-auto" style={{ minWidth: 0 }}>
          {loading ? (
            <div className="space-y-0">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-line" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 animate-pulse rounded bg-line" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Inbox size={40} className="mb-3 text-ink-soft/20" />
              <p className="font-semibold text-ink">Sin prospectos</p>
              <p className="mt-1 text-xs text-ink-soft">
                {hasFilters ? 'Prueba ajustando los filtros' : 'Cuando alguien llene el formulario de una propiedad, aparecerÃ¡ aquÃ­.'}
              </p>
              {!hasFilters && (
                <button onClick={() => setShowNew(true)}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-inverse hover:bg-primary-light">
                  <Plus size={14} /> Agregar manualmente
                </button>
              )}
            </div>
          ) : activeView === 'kanban' ? (
            <KanbanView {...viewProps} />
          ) : activeView === 'excel' ? (
            <ExcelView {...viewProps} />
          ) : activeView === 'citas' ? (
            <CitasView accountId={account!.id} preLeadId={selectedId} />
          ) : (
            <TablaView {...viewProps} />
          )}
        </div>

        {/* Panel lateral â€” animaciÃ³n elÃ¡stica */}
        <div style={{
          width: panelOpen ? '420px' : '0px',
          flexShrink: 0, overflow: 'hidden',
          borderLeft: panelOpen ? '1px solid var(--color-line, #e5e7eb)' : 'none',
          transition: 'width 0.45s cubic-bezier(0.34,1.30,0.64,1)',
        }}>
          {selected && (
            <ProspectoPanel
              p={selected} tags={tags}
              onClose={() => setSelectedId(null)}
              onStatus={updateStatus}
              onTagToggle={toggleTag}
              onSchedule={(id) => { setCitaForLead(id); setShowCitaModal(true); }}
              updating={updating}
              stageLabels={stageLabels}
            />
          )}
        </div>
      </div>

      {/* MODALES */}
      {showNew && account && (
        <NewProspectoModal
          accountId={account.id} tags={tags} stageLabels={stageLabels}
          onClose={() => setShowNew(false)}
          onCreate={(p) => setProspectos((prev) => [p, ...prev])}
        />
      )}
      {showTagMgr && account && (
        <TagManagerModal
          accountId={account.id} tags={tags}
          onClose={() => setShowTagMgr(false)}
          onUpdate={setTags}
        />
      )}
      {showCitaModal && account && (
        <NewCitaModal
          accountId={account.id}
          prospectos={prospectos.map((p) => ({ id: p.id, name: p.name, phone: p.phone, property_title: p.property_title }))}
          agents={agents}
          preLead={citaForLead ?? undefined}
          onClose={() => { setShowCitaModal(false); setCitaForLead(null); }}
          onCreate={() => { setShowCitaModal(false); setCitaForLead(null); }}
        />
      )}
    </div>
  );
}

