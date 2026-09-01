-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 003: RLS ESTRICTO (Fase B.2)
-- Reemplaza la política dev permisiva por seguridad real:
--   · Solo usuarios autenticados y miembros de la cuenta
--   · Cada quien ve únicamente los datos de SU cuenta
-- ⚠️ APLICAR SOLO después de confirmar que el login funciona:
--    una vez aplicada, el anon key sin sesión NO ve nada.
-- ============================================================

-- Helper: la cuenta del usuario autenticado (security definer
-- para no caer en recursión de RLS sobre la propia tabla users)
create or replace function current_account_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select account_id from users where auth_user_id = auth.uid() limit 1
$$;

revoke all on function current_account_id() from anon;
grant execute on function current_account_id() to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'account_settings','users','ai_provider_keys','contacts',
    'pipelines','stages','opportunities','notes','tasks','conversations',
    'messages','calendars','appointments','custom_field_defs','tag_styles',
    'smart_lists','assignment_rules','notifications',
    'automation_configs','events','activity_log','sync_queue','webhook_log'
  ] loop
    execute format('drop policy if exists dev_full_access on %I', t);
    execute format('drop policy if exists member_all on %I', t);
    execute format(
      'create policy member_all on %I for all to authenticated
         using (account_id = current_account_id())
         with check (account_id = current_account_id())', t);
  end loop;
end $$;

-- accounts: el miembro solo ve su propia cuenta
drop policy if exists dev_full_access on accounts;
drop policy if exists member_read on accounts;
create policy member_read on accounts for select to authenticated
  using (id = current_account_id());

-- push_subscriptions no tiene account_id — es por usuario
drop policy if exists dev_full_access on push_subscriptions;
drop policy if exists own_subscriptions on push_subscriptions;
create policy own_subscriptions on push_subscriptions for all to authenticated
  using (user_id in (select id from users where auth_user_id = auth.uid()))
  with check (user_id in (select id from users where auth_user_id = auth.uid()));

-- NOTA V1.1 (cuando activemos el módulo Equipo):
-- los agentes verán solo sus opportunities (owner_id = su user id);
-- admin y super_admin seguirán viendo todo. Por ahora todos los
-- miembros de la cuenta ven todo, igual que un equipo pequeño real.
