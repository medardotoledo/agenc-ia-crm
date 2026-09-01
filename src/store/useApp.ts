import { create } from 'zustand';
import type { Section, ViewMode, NoteType, Note, Message, Conversation, Lead, Stage } from '@/types';
import * as db from '@/lib/db';

type CalendarTab = 'cliente' | 'agente' | 'config';

/* ============ Contexto multi-tenant ============ */
// Subcuenta + usuario activos. Lo setea loadAccountData() y lo usan las
// escrituras (notas/mensajes/leads) para scopear correctamente.
interface CrmCtx {
  accountId: string;
  userId: string;        // users.id (Núcleo)
  userName: string;
  pipelineId: string | null;
}

/* ============ UI + datos de actividad ============ */

export type PanelTab = 'perfil' | 'notas' | 'chat';

interface AppState {
  section: Section;
  view: ViewMode;
  selectedLeadId: string | null;
  panelTab: PanelTab;
  period: 'hoy' | 'semana' | 'mes' | 'año';
  calendarTab: CalendarTab;
  activeConversationId: string;
  sidebarOpen: boolean;
  cloud: boolean;
  me: { id: string; name: string; role: string } | null;
  ctx: CrmCtx | null;
  /** Nombres personalizados de las 5 etapas (por clave de posición). */
  stageLabels: Record<string, string>;
  newLeadOpen: boolean;
  newLeadStage: Stage | null;
  notes: Note[];
  messages: Message[];
  conversations: Conversation[];
  setSection: (s: Section) => void;
  setView: (v: ViewMode) => void;
  openLead: (id: string, tab?: PanelTab) => void;
  closePanel: () => void;
  openNewLead: (stage?: Stage) => void;
  closeNewLead: () => void;
  setPeriod: (p: AppState['period']) => void;
  setCalendarTab: (t: CalendarTab) => void;
  setActiveConversation: (leadId: string) => void;
  toggleSidebar: () => void;
  addNote: (leadId: string, type: NoteType, content: string) => void;
  sendMessage: (leadId: string, channel: Message['channel'], body: string) => void;
  /** Carga (o recarga) todos los datos del CRM para la subcuenta activa.
   *  Si el usuario es `agent` con `onlyAssigned`, solo ve sus propios leads. */
  loadAccountData: (
    accountId: string,
    userId: string,
    userName: string,
    role: string,
    onlyAssigned?: boolean,
  ) => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  section: 'leads',
  view: 'tabla',
  selectedLeadId: null,
  panelTab: 'notas',
  period: 'mes',
  calendarTab: 'cliente',
  activeConversationId: '',
  sidebarOpen: false,
  cloud: false,
  me: null,
  ctx: null,
  stageLabels: {},
  newLeadOpen: false,
  newLeadStage: null,
  notes: [],
  messages: [],
  conversations: [],
  setSection: (section) => set({ section, sidebarOpen: false }),
  setView: (view) => set({ view }),
  openLead: (id, tab = 'notas') => set({ selectedLeadId: id, panelTab: tab }),
  closePanel: () => set({ selectedLeadId: null }),
  openNewLead: (stage) => set({ newLeadOpen: true, newLeadStage: stage ?? null }),
  closeNewLead: () => set({ newLeadOpen: false, newLeadStage: null }),
  setPeriod: (period) => set({ period }),
  setCalendarTab: (calendarTab) => set({ calendarTab }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addNote: (leadId, type, content) => {
    const ctx = get().ctx;
    set((s) => ({
      notes: [
        { id: 'n' + Date.now(), leadId, type, content, author: ctx?.userName ?? 'Yo', createdAt: 'Ahora' },
        ...s.notes,
      ],
    }));
    const lead = useLeads.getState().leads.find((l) => l.id === leadId);
    if (lead && ctx) db.persistNote(ctx.accountId, ctx.userId, lead, type, content).catch((e) => console.warn('persistNote:', e.message));
  },
  sendMessage: (leadId, channel, body) => {
    const ctx = get().ctx;
    set((s) => ({
      messages: [
        ...s.messages,
        { id: 'm' + Date.now(), leadId, channel, direction: 'out', body, author: ctx?.userName ?? 'Yo', time: 'Ahora' },
      ],
      conversations: s.conversations.map((c) =>
        c.leadId === leadId && channel !== 'internal' ? { ...c, preview: body.slice(0, 40), time: 'Ahora' } : c
      ),
    }));
    const lead = useLeads.getState().leads.find((l) => l.id === leadId);
    if (lead && ctx) db.persistMessage(ctx.accountId, ctx.userId, lead, channel, body).catch((e) => console.warn('persistMessage:', e.message));
  },
  loadAccountData: async (accountId, userId, userName, role, onlyAssigned = false) => {
    try {
      // "Solo datos asignados": aplica a agentes con el toggle activo.
      // Admin / super_admin (supervisores) siempre ven todo.
      const ownerOnlyId = role === 'agent' && onlyAssigned ? userId : null;
      const pipelineId = await db.getDefaultPipeline(accountId);
      const stageLabels = await db.loadStages(accountId);
      const leads = await db.fetchLeads(accountId, ownerOnlyId);
      const [notes, { convos, msgs }] = await Promise.all([
        db.fetchNotes(accountId, leads),
        db.fetchConversations(accountId, leads),
      ]);
      useLeads.setState({ leads });
      set({
        ctx: { accountId, userId, userName, pipelineId },
        me: { id: userId, name: userName, role },
        stageLabels,
        notes,
        messages: msgs,
        conversations: convos,
        cloud: true,
        activeConversationId: convos[0]?.leadId ?? '',
      });
    } catch (e) {
      console.warn('[CRM] No se pudo cargar la subcuenta:', (e as Error).message);
      useLeads.setState({ leads: [] });
      set({ ctx: { accountId, userId, userName, pipelineId: null }, me: { id: userId, name: userName, role }, notes: [], messages: [], conversations: [], cloud: false });
    }
  },
}));

/* ============ Leads (espejo local) ============ */

interface LeadsState {
  leads: Lead[];
  updateLead: (id: string, patch: Partial<Lead>) => void;
  addLead: (lead: Partial<Lead>) => void;
  setLeadTags: (leadId: string, tags: NonNullable<Lead['tags']>) => void;
}

export const useLeads = create<LeadsState>((set, get) => ({
  leads: [],
  updateLead: (id, patch) => {
    const before = get().leads.find((l) => l.id === id);
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    if (before) db.persistLeadPatch(before, patch).catch((e) => console.warn('persistLead:', e.message));
  },
  setLeadTags: (leadId, tags) => {
    set((s) => ({ leads: s.leads.map((l) => (l.id === leadId ? { ...l, tags } : l)) }));
  },
  addLead: (lead) => {
    const ctx = useApp.getState().ctx;
    const tempId = 'tmp-' + Date.now();
    const full: Lead = {
      id: tempId,
      contactId: undefined,
      name: lead.name ?? 'Nuevo lead',
      company: lead.company ?? '',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      stage: (lead.stage as Stage) ?? 'nuevo',
      temperature: lead.temperature ?? 'cold',
      value: lead.value ?? 0,
      score: lead.score ?? 20,
      ownerId: ctx?.userId ?? '',
      dueDate: '',
      channels: [],
      unread: 0,
      source: 'Manual',
    };
    set((s) => ({ leads: [...s.leads, full] }));
    if (!ctx || !ctx.pipelineId) {
      console.warn('[CRM] addLead sin contexto/pipeline — no se persiste');
      return;
    }
    db.persistNewLead(ctx.accountId, ctx.userId, ctx.pipelineId, full)
      .then((ids) => {
        if (ids)
          set((s) => ({
            leads: s.leads.map((l) => (l.id === tempId ? { ...l, id: ids.oppId, contactId: ids.contactId } : l)),
          }));
      })
      .catch((e) => console.warn('persistNewLead:', e.message));
  },
}));
