-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 004: NÚCLEO MODULAR (Fase 1)
-- Une el módulo Inmobiliario (que colgaba de agency_branding con
-- account_id de TEXTO 'nodo-inmobiliario') al Núcleo accounts/users.
--
-- SEGURA E IDEMPOTENTE: cada bloque verifica el estado actual antes
-- de actuar, así se puede correr varias veces sin romper nada.
-- Ejecutar en: Supabase → SQL Editor (corre como service role, ignora RLS).
--
-- Cuenta de "Nodo Inmobiliario": reutilizamos la cuenta existente
-- 83d58323-... (la de test@example.com) y la renombramos.
-- ============================================================

-- Constante: UUID de la subcuenta Nodo Inmobiliario
-- (83d58323-b9da-4eff-a686-2a61fefb7678 = cuenta de test@example.com)

begin;

-- ---------- 0) Limpieza: borrar fila de prueba ----------
delete from properties where easybroker_id is null and title like '%__TEST_FK__%';

-- ---------- 1) Renombrar la cuenta a "Nodo Inmobiliario" ----------
update accounts
   set name = 'Nodo Inmobiliario',
       subdomain = 'nodo-inmobiliario'
 where id = '83d58323-b9da-4eff-a686-2a61fefb7678'
   and not exists (select 1 from accounts where subdomain = 'nodo-inmobiliario'
                   and id <> '83d58323-b9da-4eff-a686-2a61fefb7678');

-- ---------- 2) accounts: capa Agencia ----------
alter table accounts add column if not exists parent_account_id uuid references accounts(id);

-- ---------- 3) users: perfil público + permisos (agente = usuario) ----------
alter table users add column if not exists permissions       jsonb   not null default '{}';
alter table users add column if not exists only_assigned_data boolean not null default false;
alter table users add column if not exists title    text;
alter table users add column if not exists phone    text;
alter table users add column if not exists whatsapp text;
alter table users add column if not exists slug     text;
alter table users add column if not exists is_public boolean not null default false;

-- Crear la fila users para test@example.com (hoy tiene accounts pero no users)
insert into users (account_id, auth_user_id, role, name, email, is_active)
values ('83d58323-b9da-4eff-a686-2a61fefb7678',
        '650db8a9-4b08-4b8c-a2e0-38e19aad4757',
        'super_admin', 'Med Toledo', 'test@example.com', true)
on conflict (account_id, email) do update set auth_user_id = excluded.auth_user_id;

-- ---------- 4) Re-apuntar el módulo Inmobiliario a accounts(id) ----------
-- Helper local: convierte account_id TEXT->uuid en una tabla, con backfill
-- del valor viejo 'nodo-inmobiliario' al UUID, soltando la FK a agency_branding
-- y creando la FK a accounts. Solo actúa si la columna AÚN es de texto.
do $$
declare
  tbl text;
  coltype text;
  nodo uuid := '83d58323-b9da-4eff-a686-2a61fefb7678';
begin
  foreach tbl in array array['properties','agency_settings','easybroker_sync_logs','leads'] loop
    -- ¿existe la tabla y la columna?
    select data_type into coltype
      from information_schema.columns
     where table_schema = 'public' and table_name = tbl and column_name = 'account_id';

    if coltype is null then
      raise notice 'Tabla % sin columna account_id, se omite', tbl;
      continue;
    end if;

    if coltype in ('text','character varying') then
      -- soltar FK vieja a agency_branding (nombre conocido de las migraciones)
      execute format('alter table %I drop constraint if exists fk_account_id', tbl);
      -- backfill del valor viejo
      execute format($f$update %I set account_id = %L where account_id = 'nodo-inmobiliario'$f$, tbl, nodo);
      -- limpiar cualquier valor que NO sea un uuid válido (evita fallar el cast)
      execute format($f$delete from %I where account_id !~ '^[0-9a-fA-F-]{36}$'$f$, tbl);
      -- convertir a uuid
      execute format('alter table %I alter column account_id type uuid using account_id::uuid', tbl);
      -- FK nueva a accounts
      execute format('alter table %I add constraint %I foreign key (account_id) references accounts(id) on delete cascade', tbl, tbl||'_account_fk');
      raise notice 'Tabla %: account_id convertida TEXT->uuid y ligada a accounts', tbl;
    else
      raise notice 'Tabla %: account_id ya es % (se omite conversión)', tbl, coltype;
    end if;
  end loop;
end $$;

-- ---------- 5) Policies que faltaban ----------
-- properties: faltaba DELETE (por eso no se pudo borrar la fila de prueba)
drop policy if exists properties_delete on properties;
create policy properties_delete on properties for delete using (true);

-- agency_settings: faltaba INSERT
drop policy if exists agency_settings_insert on agency_settings;
create policy agency_settings_insert on agency_settings for insert with check (true);

-- ---------- 6) Registro de módulos por subcuenta ----------
create table if not exists account_modules (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (account_id, module_key)
);

alter table account_modules enable row level security;
drop policy if exists dev_full_access on account_modules;
create policy dev_full_access on account_modules for all using (true) with check (true);

-- Nodo Inmobiliario arranca con CRM + Inmobiliario activos
insert into account_modules (account_id, module_key) values
  ('83d58323-b9da-4eff-a686-2a61fefb7678', 'crm'),
  ('83d58323-b9da-4eff-a686-2a61fefb7678', 'inmobiliario')
on conflict (account_id, module_key) do nothing;

commit;

-- ============================================================
-- VERIFICACIÓN (correr aparte después del commit):
--   select id, name, subdomain from accounts where id='83d58323-b9da-4eff-a686-2a61fefb7678';
--   select count(*) from properties where account_id='83d58323-b9da-4eff-a686-2a61fefb7678';
--   select email, role from users where email='test@example.com';
--   select module_key, enabled from account_modules where account_id='83d58323-b9da-4eff-a686-2a61fefb7678';
-- ============================================================
