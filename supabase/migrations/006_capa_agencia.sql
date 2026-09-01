-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 006: CAPA DE AGENCIA (Fase 2)
-- Crea la cuenta raíz "Agencia"; las subcuentas (inmobiliarias)
-- cuelgan de ella vía accounts.parent_account_id. test@example.com
-- pasa a ser el DUEÑO de la Agencia (super_admin) y podrá crear/ver
-- todas las subcuentas y sus usuarios.
--
-- Ejecutar en: Supabase → SQL Editor. Idempotente.
-- ============================================================

begin;

-- 1) Cuenta raíz de Agencia (parent_account_id = null)
insert into accounts (id, name, subdomain, plan, parent_account_id)
values ('a9000000-0000-0000-0000-000000000001', 'Agencia Med Toledo', 'agencia', 'pro', null)
on conflict (id) do nothing;

-- 2) "Nodo Inmobiliario" pasa a ser SUBCUENTA de la Agencia
update accounts
   set parent_account_id = 'a9000000-0000-0000-0000-000000000001'
 where id = '83d58323-b9da-4eff-a686-2a61fefb7678'
   and parent_account_id is null;

-- 3) test@example.com = dueño de la AGENCIA (super_admin)
--    (deja de ser dueño directo de Nodo; administrará Nodo "entrando" a la subcuenta)
update users
   set account_id = 'a9000000-0000-0000-0000-000000000001',
       role = 'super_admin'
 where email = 'test@example.com';

commit;

-- ============================================================
-- VERIFICACIÓN:
--   select id, name, parent_account_id from accounts order by parent_account_id nulls first;
--   select email, role, account_id from users where email='test@example.com';
--   -- subcuentas de la agencia:
--   select name from accounts where parent_account_id='a9000000-0000-0000-0000-000000000001';
-- ============================================================
