-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 007: ETIQUETAS (tags) + base para automatizaciones
-- Etiquetas personalizadas ILIMITADAS por subcuenta, con ID estable.
-- Diseñadas para ser DETONADORES de acciones (automatizaciones / IA):
--   - al agregar/quitar una etiqueta se emite un evento en `events`
--     (entity contact) → fuente de triggers.
--   - tabla `automation_rules` (esqueleto) para reglas "trigger → acción".
-- Ejecutar en: Supabase → SQL Editor. Idempotente.
-- ============================================================

begin;

-- 1) Catálogo de etiquetas por subcuenta (ID estable; renombrar no rompe nada)
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  color text not null default '#DBEAFE',
  description text,
  created_at timestamptz not null default now(),
  unique (account_id, name)
);
create index if not exists idx_tags_account on tags(account_id);

-- 2) Relación contacto <-> etiqueta (un contacto puede tener N etiquetas)
create table if not exists contact_tags (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (contact_id, tag_id)
);
create index if not exists idx_contact_tags_contact on contact_tags(contact_id);
create index if not exists idx_contact_tags_tag on contact_tags(tag_id);

-- 3) Esqueleto de automatizaciones (el motor se construye después).
--    Deja la base para: "cuando pase TRIGGER (ej: tag_added=X) → ACCIÓN".
create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger_type text not null,           -- ej: 'tag_added', 'tag_removed', 'stage_changed'
  trigger_config jsonb not null default '{}',  -- ej: { "tag_id": "..." }
  action_type text not null,            -- ej: 'send_whatsapp', 'assign_user', 'ai_reply'
  action_config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_automation_rules_account on automation_rules(account_id);
create index if not exists idx_automation_rules_trigger on automation_rules(account_id, trigger_type, enabled);

-- 4) RLS (dev permisivo, consistente con el resto del esquema en esta fase)
alter table tags enable row level security;
alter table contact_tags enable row level security;
alter table automation_rules enable row level security;
drop policy if exists dev_full_access on tags;
drop policy if exists dev_full_access on contact_tags;
drop policy if exists dev_full_access on automation_rules;
create policy dev_full_access on tags for all using (true) with check (true);
create policy dev_full_access on contact_tags for all using (true) with check (true);
create policy dev_full_access on automation_rules for all using (true) with check (true);

commit;

-- ============================================================
-- VERIFICACIÓN:
--   select count(*) from tags;
--   select count(*) from contact_tags;
--   select count(*) from automation_rules;
-- ============================================================
