-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 010: CITAS PARA PROSPECTOS
-- Conecta la tabla appointments con leads (inmobiliario).
-- Agrega campos de duración, título y notas que faltaban.
-- Ejecutar en: Supabase → SQL Editor. Idempotente.
-- ============================================================

begin;

-- 1) Conectar appointments con leads (prospectos inmobiliarios)
alter table appointments add column if not exists lead_id    uuid references leads(id) on delete cascade;
alter table appointments add column if not exists title      text;
alter table appointments add column if not exists duration_min int not null default 60;
alter table appointments add column if not exists notes      text;
alter table appointments add column if not exists ends_at    timestamptz;
alter table appointments add column if not exists visit_type text not null default 'inperson'
  check (visit_type in ('inperson','videocall','phone'));

create index if not exists idx_appointments_lead   on appointments(lead_id);
create index if not exists idx_appointments_starts on appointments(account_id, starts_at);

-- 2) RLS: dev permisivo (consistente con el resto)
drop policy if exists dev_full_access on appointments;
create policy dev_full_access on appointments for all using (true) with check (true);

commit;

-- ============================================================
-- VERIFICACIÓN:
--   \d appointments;
--   select count(*) from appointments;
-- ============================================================
