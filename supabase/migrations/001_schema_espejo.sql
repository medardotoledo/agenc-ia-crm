-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 001: SCHEMA DEL ESPEJO (Fase B)
-- Según Especificaciones-3-0-Lead-Suite.md
-- Convenciones: toda tabla lleva account_id + RLS.
-- Tablas espejo de GHL llevan ghl_id / synced_at / sync_status.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- CUENTA Y EQUIPO ----------

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  ghl_location_id text unique,
  name text not null,
  subdomain text unique,
  plan text not null default 'free',
  logo_url text,
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now()
);

create table if not exists account_settings (
  account_id uuid primary key references accounts(id) on delete cascade,
  color_primary text default '#1E3A8A',
  color_primary_light text default '#2563EB',
  color_accent text default '#F59E0B',
  color_dark text default '#0F172A',
  dark_mode boolean default false,
  ai_chat_enabled boolean default false,
  ai_chat_provider text default 'claude',
  ai_chat_model text default 'claude-sonnet-4-6',
  ai_chat_system_prompt text,
  ai_chat_default_mode text default 'agent' check (ai_chat_default_mode in ('bot','hybrid','agent')),
  ai_chat_auto_resume_hours int default 0,
  inactivity_alert_days int default 7,
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_user_id text,
  auth_user_id uuid unique,            -- se llena al activar Supabase Auth
  role text not null default 'agent' check (role in ('super_admin','admin','agent')),
  name text not null,
  email text not null,
  avatar_url text,
  timezone text default 'America/Mexico_City',
  is_active boolean not null default true,
  rr_enabled boolean not null default true,
  rr_weight int not null default 5 check (rr_weight between 1 and 10),
  created_at timestamptz not null default now(),
  unique (account_id, email)
);

create table if not exists ai_provider_keys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,   -- null = key de la cuenta
  provider text not null check (provider in ('claude','openai','gemini')),
  encrypted_key text not null,                            -- encriptada server-side, NUNCA texto plano
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- ESPEJO: CONTACTOS Y PIPELINE ----------

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  name text not null,
  company text,
  phone_e164 text,
  email text,
  source text,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  dnd boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  unique (account_id, ghl_id)
);

create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  name text not null,
  is_default boolean not null default false,
  unique (account_id, ghl_id)
);

create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  ghl_id text,
  name text not null,
  color text not null default '#DBEAFE',
  position int not null default 0,
  is_won boolean not null default false,
  is_lost boolean not null default false
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  contact_id uuid not null references contacts(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id),
  stage_id uuid not null references stages(id),
  name text,
  value numeric(14,2) not null default 0,
  status text not null default 'open' check (status in ('open','won','lost','abandoned')),
  owner_id uuid references users(id),
  lost_reason text,
  -- campos SOLO Lead-Suite (no existen en GHL):
  temperature text not null default 'cold' check (temperature in ('hot','warm','cold','lost')),
  score int not null default 20 check (score between 0 and 100),
  follow_up_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  unique (account_id, ghl_id)
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  contact_id uuid not null references contacts(id) on delete cascade,
  user_id uuid references users(id),
  note_type text not null default 'note' check (note_type in ('note','call','whatsapp','email')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  contact_id uuid references contacts(id) on delete cascade,
  user_id uuid references users(id),
  title text not null,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- ESPEJO: CONVERSACIONES ----------

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  contact_id uuid not null references contacts(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','facebook','instagram','email','sms','webchat')),
  unread_count int not null default 0,
  last_message_at timestamptz,
  last_message_preview text,
  status text not null default 'open' check (status in ('open','resolved')),
  -- campos SOLO Lead-Suite:
  ai_mode text not null default 'agent' check (ai_mode in ('bot','hybrid','agent')),
  ai_paused_by uuid references users(id),
  ai_paused_at timestamptz,
  ai_resumed_at timestamptz,
  unique (account_id, ghl_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  channel text not null,
  sender_type text not null default 'contact' check (sender_type in ('contact','user','bot')),
  user_id uuid references users(id),
  body text not null,
  attachments jsonb not null default '[]',
  status text default 'sent',
  created_at timestamptz not null default now()
);

-- ---------- ESPEJO: CALENDARIO ----------

create table if not exists calendars (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  agent_id uuid references users(id),
  title text not null,
  duration_min int not null default 30,
  price text default 'Gratis',
  location_type text not null default 'meet' check (location_type in ('meet','zoom','teams','phone','inperson')),
  location_url text,
  slug text,
  is_active boolean not null default true
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  calendar_id uuid references calendars(id),
  contact_id uuid references contacts(id) on delete cascade,
  agent_id uuid references users(id),
  starts_at timestamptz not null,
  client_timezone text default 'America/Mexico_City',
  status text not null default 'confirmada' check (status in ('confirmada','pendiente','cancelada')),
  location_url text,
  cancel_token uuid default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ---------- PROPIAS DE LEAD-SUITE ----------

create table if not exists custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  ghl_id text,
  key text not null,
  label text not null,
  field_type text not null default 'text' check (field_type in ('text','number','date','dropdown','checkbox','url')),
  options_json jsonb default '[]',
  position int default 0,
  unique (account_id, key)
);

create table if not exists tag_styles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  tag_name text not null,
  color text not null default '#DBEAFE',
  unique (account_id, tag_name)
);

create table if not exists smart_lists (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  owner_id uuid references users(id),
  name text not null,
  filters_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists assignment_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  mode text not null default 'manual' check (mode in ('manual','rr','rr_weighted')),
  last_assigned_user_id uuid references users(id),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_ref jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null,
  keys_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists automation_configs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  automation_key text not null,
  enabled boolean not null default false,
  message_template text,
  ghl_workflow_id text,
  config jsonb not null default '{}',
  unique (account_id, automation_key)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- MOTOR DE SYNC ----------

create table if not exists sync_queue (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('create','update','delete')),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  attempts int not null default 0,
  next_retry_at timestamptz,
  error_text text,
  created_at timestamptz not null default now()
);

create table if not exists webhook_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  event_type text,
  ghl_payload jsonb,
  status text default 'received',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- ÍNDICES ----------

create index if not exists idx_contacts_account on contacts(account_id);
create index if not exists idx_contacts_phone on contacts(account_id, phone_e164);
create index if not exists idx_opps_account on opportunities(account_id);
create index if not exists idx_opps_stage on opportunities(stage_id);
create index if not exists idx_opps_contact on opportunities(contact_id);
create index if not exists idx_notes_contact on notes(contact_id);
create index if not exists idx_convos_account on conversations(account_id);
create index if not exists idx_msgs_convo on messages(conversation_id);
create index if not exists idx_appts_account on appointments(account_id, starts_at);
create index if not exists idx_sync_pending on sync_queue(status, next_retry_at);
create index if not exists idx_events_account on events(account_id, created_at);

-- ---------- RLS ----------
-- DEV: política permisiva temporal. ANTES de meter datos reales de
-- clientes se reemplaza por políticas por membresía (auth_user_id →
-- users.account_id). Registrado en la spec v3.0.

do $$
declare t text;
begin
  foreach t in array array[
    'accounts','account_settings','users','ai_provider_keys','contacts',
    'pipelines','stages','opportunities','notes','tasks','conversations',
    'messages','calendars','appointments','custom_field_defs','tag_styles',
    'smart_lists','assignment_rules','notifications','push_subscriptions',
    'automation_configs','events','activity_log','sync_queue','webhook_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dev_full_access on %I', t);
    execute format('create policy dev_full_access on %I for all using (true) with check (true)', t);
  end loop;
end $$;
