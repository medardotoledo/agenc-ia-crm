import type { Lead, Note, Message, Conversation, Appointment, ActivityItem, TeamMember, Pending } from '@/types'

export const USER = { name: 'Med', fullName: 'Med Toledo', team: 'Equipo Rankers', members: 8 }

export const LEADS: Lead[] = [
  { id: 'l1', name: 'Carlos Rodríguez', company: 'TechSoluciones MX', phone: '555-1234-001', email: 'carlos@techsoluciones.mx', stage: 'propuesta', temperature: 'hot', value: 18500, score: 78, ownerId: 'u1', dueDate: '2026-06-11', channels: ['whatsapp'], unread: 2, source: 'Facebook' },
  { id: 'l2', name: 'Laura Pacheco', company: 'Agencia Impulsa', phone: '555-5678-002', email: 'laura@impulsa.mx', stage: 'cierre', temperature: 'warm', value: 32000, score: 92, ownerId: 'u1', dueDate: '2026-06-12', channels: ['email'], unread: 0, source: 'Referido' },
  { id: 'l3', name: 'Miguel Hernández', company: 'Distribuidora H&M', phone: '555-9012-003', email: 'miguel@dhm.mx', stage: 'contactado', temperature: 'cold', value: 9200, score: 35, ownerId: 'u2', dueDate: '2026-06-18', channels: ['facebook', 'whatsapp'], unread: 0, source: 'Instagram' },
  { id: 'l4', name: 'Sofía Vargas', company: 'SV Consultores', phone: '555-3456-004', email: 'sofia@svconsultores.mx', stage: 'nuevo', temperature: 'hot', value: 24000, score: 70, ownerId: 'u1', dueDate: '2026-06-20', channels: ['instagram'], unread: 1, source: 'Instagram' },
  { id: 'l5', name: 'Jorge Méndez', company: 'Mueblería Méndez', phone: '555-7345-005', email: 'jorge@muebleriamendez.mx', stage: 'perdido', temperature: 'lost', value: 7800, score: 12, ownerId: 'u3', dueDate: '2026-06-09', channels: ['whatsapp'], unread: 0, source: 'Formulario web' },
  { id: 'l6', name: 'Ana Gutiérrez', company: 'Inmobiliaria Cenit', phone: '555-7890-006', email: 'ana@cenit.mx', stage: 'propuesta', temperature: 'warm', value: 41500, score: 81, ownerId: 'u2', dueDate: '2026-06-14', channels: ['email'], unread: 0, source: 'Facebook' },
  { id: 'l7', name: 'Roberto Lima', company: 'Lima & Asoc.', phone: '555-2210-007', email: 'roberto@limaasoc.mx', stage: 'nuevo', temperature: 'cold', value: 8500, score: 28, ownerId: 'u3', dueDate: '2026-06-22', channels: ['whatsapp'], unread: 0, source: 'Manual' },
  { id: 'l8', name: 'Patricia Olmos', company: 'Clínica Olmos', phone: '555-8821-008', email: 'paty@clinicaolmos.mx', stage: 'contactado', temperature: 'warm', value: 15600, score: 55, ownerId: 'u1', dueDate: '2026-06-16', channels: ['whatsapp', 'email'], unread: 0, source: 'Formulario web' },
]

export const NOTES: Note[] = [
  { id: 'n1', leadId: 'l2', type: 'call', content: 'Confirmó que el contrato ya está con su abogado. Espera firma mañana antes de mediodía.', author: 'Med Toledo', createdAt: 'Hoy, 11:42 am' },
  { id: 'n2', leadId: 'l2', type: 'note', content: 'Contrato enviado por DocuSign. Validar que le llegó y que no tenga problemas para firmar digitalmente.', author: 'Med Toledo', createdAt: 'Jun 9, 4:15 pm' },
  { id: 'n3', leadId: 'l1', type: 'whatsapp', content: 'Pidió demo el viernes. Le funciona 11 am. Mandar invitación con link de Meet.', author: 'Med Toledo', createdAt: 'Hoy, 10:32 am' },
  { id: 'n4', leadId: 'l1', type: 'note', content: 'Vio el anuncio de Facebook de servicios de marketing. Presupuesto aprobado por su dirección.', author: 'Ana García', createdAt: 'Jun 10, 9:50 am' },
  { id: 'n5', leadId: 'l1', type: 'call', content: 'Primera llamada de calificación. Equipo de 12 personas, buscan generación de demanda.', author: 'Med Toledo', createdAt: 'Jun 9, 1:20 pm' },
  { id: 'n6', leadId: 'l1', type: 'email', content: 'Enviado deck con casos de éxito y precios.', author: 'Med Toledo', createdAt: 'Jun 10, 10:15 am' },
  { id: 'n7', leadId: 'l4', type: 'note', content: 'Referida por Carlos Rodríguez. Llamar esta semana.', author: 'Med Toledo', createdAt: 'Jun 8, 12:00 pm' },
  { id: 'n8', leadId: 'l6', type: 'note', content: 'Lo revisa con su socio. Dar seguimiento el viernes.', author: 'Ana García', createdAt: 'Jun 9, 3:30 pm' },
]

export const MESSAGES: Message[] = [
  { id: 'm1', leadId: 'l1', channel: 'whatsapp', direction: 'in', body: 'Hola! Vi su anuncio en Facebook y me interesa saber más sobre sus servicios de marketing digital.', time: '9:45 am' },
  { id: 'm2', leadId: 'l1', channel: 'whatsapp', direction: 'out', body: 'Hola Carlos, bienvenido! Con gusto te cuento todo. ¿Tienes unos minutos para una llamada rápida hoy?', author: 'Med Toledo', time: '9:48 am' },
  { id: 'm3', leadId: 'l1', channel: 'whatsapp', direction: 'in', body: 'Claro, pero prefiero primero ver algo por escrito. ¿Tienen alguna presentación o propuesta?', time: '10:02 am' },
  { id: 'm4', leadId: 'l1', channel: 'whatsapp', direction: 'out', body: 'Por supuesto! Te mando un deck con casos de éxito y precios. También podemos hacer una demo en vivo el viernes, ¿te funciona?', author: 'Med Toledo', time: '10:15 am' },
  { id: 'm5', leadId: 'l1', channel: 'whatsapp', direction: 'in', body: 'Sí, me interesa la demo del viernes. ¿A qué hora?', time: '10:32 am' },
  { id: 'm6', leadId: 'l4', channel: 'instagram', direction: 'in', body: 'Hola! Vi tu publicación sobre automatización con IA. ¿Cómo funciona para consultorías?', time: '9:15 am' },
  { id: 'm7', leadId: 'l3', channel: 'facebook', direction: 'in', body: 'Gracias por la información', time: 'Ayer' },
  { id: 'm8', leadId: 'l2', channel: 'email', direction: 'in', body: 'Adjunto el contrato firmado', time: 'Ayer' },
  { id: 'm9', leadId: 'l6', channel: 'email', direction: 'in', body: 'Lo reviso con mi socio y te aviso', time: 'Jun 9' },
]

export const CONVERSATIONS: Conversation[] = [
  { leadId: 'l1', channel: 'whatsapp', preview: 'Sí, me interesa la demo del…', time: '10:32', unread: 2 },
  { leadId: 'l4', channel: 'instagram', preview: 'Hola! Vi tu publicación sobr…', time: '9:15', unread: 1 },
  { leadId: 'l3', channel: 'facebook', preview: 'Gracias por la información', time: 'Ayer', unread: 0 },
  { leadId: 'l2', channel: 'email', preview: 'Adjunto el contrato firmado', time: 'Ayer', unread: 0 },
  { leadId: 'l6', channel: 'email', preview: 'Lo reviso con mi socio y te aviso', time: 'Jun 9', unread: 0 },
]

export const APPOINTMENTS: Appointment[] = [
  { id: 'a1', clientName: 'Carlos Rodríguez', day: 'hoy', time: '9:00 AM', channelType: 'meet', channelLabel: 'Google Meet', duration: 30, status: 'confirmada' },
  { id: 'a2', clientName: 'Sofía Vargas', day: 'hoy', time: '11:00 AM', channelType: 'phone', channelLabel: 'Llamada', duration: 30, status: 'pendiente' },
  { id: 'a3', clientName: 'Laura Pacheco', day: 'mañana', time: '10:00 AM', channelType: 'meet', channelLabel: 'Google Meet', duration: 45, status: 'confirmada' },
  { id: 'a4', clientName: 'Jorge Méndez', day: 'mañana', time: '2:00 PM', channelType: 'phone', channelLabel: 'Llamada', duration: 30, status: 'cancelada' },
]

export const ACTIVITY: ActivityItem[] = [
  { id: 'ac1', kind: 'call', text: 'Carlos Rodríguez — llamada de seguimiento', ago: 'Hace 12 min', who: 'Med Toledo' },
  { id: 'ac2', kind: 'appointment', text: 'Laura Pacheco agendó cita para mañana', ago: 'Hace 34 min', who: 'Sistema' },
  { id: 'ac3', kind: 'whatsapp', text: 'Sofía Vargas respondió al seguimiento', ago: 'Hace 1h', who: 'Med Toledo' },
  { id: 'ac4', kind: 'lead', text: 'Nuevo lead desde formulario web', ago: 'Hace 2h', who: 'Sistema' },
]

export const TEAM: TeamMember[] = [
  { id: 'u1', name: 'Med Toledo', initials: 'MT', closes: 14, value: 98000 },
  { id: 'u2', name: 'Ana García', initials: 'AG', closes: 9, value: 67000 },
  { id: 'u3', name: 'Roberto Lima', initials: 'RL', closes: 6, value: 41000 },
  { id: 'u4', name: 'Sofía Varela', initials: 'SV', closes: 4, value: 28000 },
]

export const PENDING: Pending[] = [
  { id: 'p1', text: 'Llamar a Carlos Rodríguez — propuesta vence hoy', urgency: 'urgente', when: 'Urgente' },
  { id: 'p2', text: 'Enviar cotización a Ana Gutiérrez — Inmobiliaria Cenit', urgency: 'hoy', when: 'Hoy 3pm' },
  { id: 'p3', text: 'Cita con Laura Pacheco — Google Meet', urgency: 'mañana', when: 'Mañana 10am' },
  { id: 'p4', text: '5 leads sin actividad en más de 7 días — revisar', urgency: 'semana', when: 'Esta semana' },
]

export const WEEKLY = [
  { week: 'Sem 1', nuevos: 18, cerrados: 6 },
  { week: 'Sem 2', nuevos: 24, cerrados: 9 },
  { week: 'Sem 3', nuevos: 21, cerrados: 7 },
  { week: 'Sem 4', nuevos: 29, cerrados: 11 },
]

export const SOURCES = [
  { label: 'Facebook', value: 38, color: 'var(--color-primary-light)' },
  { label: 'Instagram', value: 22, color: 'var(--color-ch-instagram)' },
  { label: 'Formulario web', value: 20, color: 'var(--color-accent)' },
  { label: 'Referido', value: 12, color: 'var(--color-success)' },
  { label: 'Manual', value: 8, color: 'var(--color-ink-soft)' },
]

export const STATS = { total: 128, hot: 23, newToday: 12, pipelineValue: 284000, closeRate: 34, avgDays: 18 }

export const STAGE_META: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  nuevo:      { label: 'Nuevo',      bg: 'bg-stage-new-bg',      text: 'text-stage-new-text',      bar: 'bg-primary-light' },
  contactado: { label: 'Contactado', bg: 'bg-stage-contact-bg',  text: 'text-stage-contact-text',  bar: 'bg-stage-contact-text' },
  propuesta:  { label: 'Propuesta',  bg: 'bg-stage-proposal-bg', text: 'text-stage-proposal-text', bar: 'bg-accent' },
  cierre:     { label: 'Cierre',     bg: 'bg-stage-close-bg',    text: 'text-stage-close-text',    bar: 'bg-success' },
  perdido:    { label: 'Perdido',    bg: 'bg-stage-lost-bg',     text: 'text-stage-lost-text',     bar: 'bg-danger' },
}

export const TEMP_META: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  hot:  { label: 'Caliente', icon: '🔥', bg: 'bg-temp-hot-bg',  text: 'text-temp-hot-text' },
  warm: { label: 'Tibio',    icon: '✓',  bg: 'bg-temp-warm-bg', text: 'text-temp-warm-text' },
  cold: { label: 'Frío',     icon: '❄',  bg: 'bg-temp-cold-bg', text: 'text-temp-cold-text' },
  lost: { label: 'Perdido',  icon: '✗',  bg: 'bg-stage-lost-bg', text: 'text-stage-lost-text' },
}

export const AVATAR_COLORS = ['bg-stage-new-bg text-stage-new-text', 'bg-stage-contact-bg text-stage-contact-text', 'bg-stage-proposal-bg text-stage-proposal-text', 'bg-stage-close-bg text-stage-close-text', 'bg-stage-lost-bg text-stage-lost-text']

export function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

export function money(n: number) {
  return '$' + n.toLocaleString('en-US')
}

export function dueLabel(iso: string): { text: string; cls: string } {
  const today = new Date('2026-06-11')
  const d = new Date(iso)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { text: d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }), cls: 'text-ink-soft' }
  if (diff === 0) return { text: 'Hoy', cls: 'text-warning font-semibold' }
  if (diff === 1) return { text: 'Mañana', cls: 'text-success font-semibold' }
  return { text: d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }), cls: 'text-ink-soft' }
}
