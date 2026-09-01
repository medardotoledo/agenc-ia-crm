-- ════════════════════════════════════════════════════════════════
-- LIGAR CUENTA A USUARIO (arregla el loop de login)
-- ════════════════════════════════════════════════════════════════
-- Problema: el usuario inicia sesión pero no tiene cuenta ligada,
-- por eso PropertiesPage lo regresa al login.
--
-- INSTRUCCIONES:
-- 1. Cambia 'TU_EMAIL_AQUI' por el email con el que inicias sesión
--    (ej. test@example.com o bonotek@gmail.com)
-- 2. Corre este SQL en Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Ver qué usuarios existen (para confirmar tu email)
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Ligar la cuenta "Equipo Rankers" a tu usuario
UPDATE accounts
SET user_id = (SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI')
WHERE name = 'Equipo Rankers';

-- Verificar que quedó ligada
SELECT a.id, a.name, a.user_id, u.email
FROM accounts a
LEFT JOIN auth.users u ON u.id = a.user_id;
