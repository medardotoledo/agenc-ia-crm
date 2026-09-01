-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 008: LEAD_TAGS + ETAPAS PERSONALIZABLES
-- Relaciona prospectos (leads) con etiquetas (tags).
-- Agrega etapas renombrables y asignación de agente a cada lead.
-- Ejecutar en: Supabase → SQL Editor. Idempotente.
-- ============================================================

begin;

-- 1) lead_tags: junction table leads ↔ tags
create table if not exists lead_tags (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  lead_id    uuid not null references leads(id)    on delete cascade,
  tag_id     uuid not null references tags(id)     on delete cascade,
  created_at timestamptz not null default now(),
  unique (lead_id, tag_id)
);
create index if not exists idx_lead_tags_lead    on lead_tags(lead_id);
create index if not exists idx_lead_tags_tag     on lead_tags(tag_id);
create index if not exists idx_lead_tags_account on lead_tags(account_id);

alter table lead_tags enable row level security;
drop policy if exists dev_full_access on lead_tags;
create policy dev_full_access on lead_tags for all using (true) with check (true);

-- 2) Etapas renombrables del pipeline de prospectos
--    Guardamos las etiquetas personalizadas en account_settings como JSONB.
alter table account_settings
  add column if not exists lead_stage_labels jsonb
    not null default '{"new":"Nuevo","contacted":"Contactado","qualified":"Calificado","lost":"Perdido"}';

-- 3) Asignación de agente al prospecto
alter table leads add column if not exists assigned_to uuid references users(id) on delete set null;
create index if not exists idx_leads_assigned on leads(assigned_to);

-- 4) property_id ahora es opcional (permite crear prospectos sin propiedad específica)
alter table leads alter column property_id drop not null;

commit;

-- ============================================================
-- VERIFICACIÓN:
--   select count(*) from lead_tags;
--   select lead_stage_labels from account_settings limit 1;
--   \d leads;
-- ============================================================
