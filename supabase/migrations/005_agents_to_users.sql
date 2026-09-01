-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 005: AGENTE = USUARIO (Fase 1, último hito)
-- Funde la tabla `agents` (perfiles inmobiliarios) en la base única
-- `users` (role='agent'). Para NO reescribir el código existente,
-- `agents` pasa a ser una VISTA sobre users + triggers INSTEAD OF que
-- escriben en users. Todo el código que usa from('agents') sigue igual.
--
-- Ejecutar en: Supabase → SQL Editor. Idempotente en lo razonable.
-- ============================================================

begin;

-- ---------- 1) Migrar filas existentes agents -> users (role 'agent') ----------
-- (photo_id -> avatar_url; email NOT NULL en users, se usa coalesce)
insert into users (account_id, role, name, email, slug, title, phone, whatsapp, avatar_url, is_public, is_active)
select a.account_id, 'agent', a.name,
       coalesce(nullif(a.email,''), a.slug || '@agente.local'),
       a.slug, a.title, a.phone, a.whatsapp, a.photo_id, true, true
from agents a
where not exists (
  select 1 from users u
   where u.account_id = a.account_id
     and u.email = coalesce(nullif(a.email,''), a.slug || '@agente.local')
);

-- ---------- 2) Reemplazar la TABLA agents por una VISTA sobre users ----------
drop table if exists agents cascade;

create view agents with (security_invoker = true) as
  select
    id,
    account_id,
    name,
    slug,
    title,
    email,
    phone,
    whatsapp,
    avatar_url as photo_id,
    created_at,
    created_at as updated_at
  from users
  where role = 'agent';

-- ---------- 3) Triggers INSTEAD OF: escribir/leer agents = users ----------
create or replace function agents_view_insert() returns trigger language plpgsql as $$
declare new_id uuid;
begin
  insert into users (account_id, role, name, slug, title, email, phone, whatsapp, avatar_url, is_public, is_active)
  values (new.account_id, 'agent', new.name, new.slug, new.title,
          coalesce(nullif(new.email,''), coalesce(new.slug,'agente') || '@agente.local'),
          new.phone, new.whatsapp, new.photo_id, true, true)
  returning id into new_id;
  new.id := new_id;
  return new;
end $$;

create or replace function agents_view_update() returns trigger language plpgsql as $$
begin
  update users set
    name      = new.name,
    slug      = new.slug,
    title     = new.title,
    email     = coalesce(nullif(new.email,''), users.email),
    phone     = new.phone,
    whatsapp  = new.whatsapp,
    avatar_url = new.photo_id
  where id = old.id and role = 'agent';
  return new;
end $$;

create or replace function agents_view_delete() returns trigger language plpgsql as $$
begin
  delete from users where id = old.id and role = 'agent';
  return old;
end $$;

drop trigger if exists agents_insert on agents;
drop trigger if exists agents_update on agents;
drop trigger if exists agents_delete on agents;
create trigger agents_insert instead of insert on agents for each row execute function agents_view_insert();
create trigger agents_update instead of update on agents for each row execute function agents_view_update();
create trigger agents_delete instead of delete on agents for each row execute function agents_view_delete();

commit;

-- ============================================================
-- VERIFICACIÓN:
--   select id, account_id, name, photo_id from agents;   -- ahora salen de users
--   select count(*) from users where role='agent';
-- ============================================================
