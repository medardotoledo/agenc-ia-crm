export type Stage = string // GHL Stage ID
export type Temperature = 'hot' | 'warm' | 'cold' | 'lost'
export type NoteType = 'note' | 'call' | 'whatsapp' | 'email'
export type Channel = 'whatsapp' | 'facebook' | 'instagram' | 'email'
export type ViewMode = 'tabla' | 'kanban' | 'excel' | 'calendario'
export type Section = 'dashboard' | 'leads' | 'conversaciones' | 'calendario' | 'reportes' | 'actividades' | 'ajustes' | 'productos'

export interface Lead {
  id: string
  contactId?: string // id del contacto en el espejo (Fase B)
  name: string
  company: string
  phone: string
  email: string
  stage: Stage
  temperature: Temperature
  value: number
  score: number // 0-100
  ownerId: string
  dueDate: string // ISO
  channels: Channel[]
  unread: number
  source: string
  tags?: { id: string; name: string; color: string }[]
}

export interface Note {
  id: string
  leadId: string
  type: NoteType
  content: string
  author: string
  createdAt: string
}

export interface Message {
  id: string
  leadId: string
  channel: Channel | 'internal'
  direction: 'in' | 'out'
  body: string
  author?: string
  time: string
  attachments?: string[]
}

export interface Conversation {
  leadId: string
  contactId?: string
  conversationId?: string
  contactName?: string
  phone?: string
  channel: Channel
  preview: string
  time: string
  unread: number
  lastMessageDate?: number
}

export interface Appointment {
  id: string
  clientName: string
  day: 'hoy' | 'mañana'
  time: string
  channelType: 'meet' | 'phone'
  channelLabel: string
  duration: number
  status: 'confirmada' | 'pendiente' | 'cancelada'
}

export interface ActivityItem {
  id: string
  kind: 'call' | 'appointment' | 'whatsapp' | 'lead' | 'note'
  text: string
  ago: string
  who: string
}

export interface TeamMember {
  id: string
  name: string
  initials: string
  closes: number
  value: number
}

export interface Pending {
  id: string
  text: string
  urgency: 'urgente' | 'hoy' | 'mañana' | 'semana'
  when: string
}

export interface AssignedAgent {
  agent_id: string
  name: string
  role?: string
  avatar_url?: string
  is_primary?: boolean
}

export interface Product {
  id: string
  account_id?: string
  agent_id?: string
  name: string
  slug?: string
  short_description?: string
  target_triggers?: string
  price_range?: string
  irresistible_offer?: string
  knowledge_sheet?: string
  created_at?: string
  updated_at?: string
  agent_name?: string
  agent_avatar?: string
  agent_avatar_url?: string
  agent_role?: string
  assigned_agents?: AssignedAgent[]
}

export * from './database'

