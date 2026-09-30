-- ============================================================
-- LEAD-SUITE — MIGRACIÓN 038: PIPELINE AGENT
-- Agrega las columnas y tablas necesarias para que el agente
-- de CRM pueda crear notas, tareas y citas de forma autónoma,
-- auditar omisiones de vendedores y escalar al dueño.
--
-- Tablas MODIFICADAS (ALTER):  notes, tasks, appointments, accounts
-- Tablas NUEVAS:                agent_audit_log
--
-- Ejecutar en: Supabase → SQL Editor → Pegar y ejecutar.
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. NOTES — marcar si fue creada por el agente de IA
-- ────────────────────────────────────────────────────────────
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS created_by_agent  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ghl_note_id       TEXT;          -- ID devuelto por GHL al sincronizar

-- ────────────────────────────────────────────────────────────
-- 2. TASKS — campos de agente, estado de auditoría y GHL sync
-- ────────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by_agent  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ghl_task_id       TEXT,          -- ID devuelto por GHL al sincronizar
  ADD COLUMN IF NOT EXISTS assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audit_status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (audit_status IN ('pending', 'completed', 'missed', 'escalated')),
  ADD COLUMN IF NOT EXISTS missed_at         TIMESTAMPTZ,   -- cuándo se detectó que venció sin completar
  ADD COLUMN IF NOT EXISTS escalated_at      TIMESTAMPTZ,   -- cuándo se escaló al dueño
  ADD COLUMN IF NOT EXISTS reminder_sent_at  TIMESTAMPTZ;   -- último recordatorio enviado al vendedor

CREATE INDEX IF NOT EXISTS idx_tasks_audit_status
  ON tasks (account_id, audit_status)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_due_at
  ON tasks (account_id, due_at)
  WHERE completed_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- 3. APPOINTMENTS — marcar citas creadas por agente y GHL sync
-- ────────────────────────────────────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS created_by_agent  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ghl_event_id      TEXT,          -- ID del evento en GHL al sincronizar
  ADD COLUMN IF NOT EXISTS opportunity_id    UUID REFERENCES opportunities(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 4. ACCOUNTS — configuración del Pipeline Agent por subcuenta
-- ────────────────────────────────────────────────────────────
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS agent_reminder_hours     INT NOT NULL DEFAULT 1,
    -- Horas después de que vence una tarea antes de enviar primer recordatorio al vendedor
  ADD COLUMN IF NOT EXISTS agent_escalation_hours   INT NOT NULL DEFAULT 24,
    -- Horas sin respuesta antes de escalar al dueño/admin
  ADD COLUMN IF NOT EXISTS agent_notify_email       TEXT,
    -- Email del dueño/admin al que se escala (puede diferir del email de login)
  ADD COLUMN IF NOT EXISTS agent_email_from         TEXT;
    -- Dirección remitente para los correos del agente (debe estar verificada en GHL)

-- ────────────────────────────────────────────────────────────
-- 5. AGENT_AUDIT_LOG — registro inmutable de cada acción del agente
--    Sirve para el dashboard de accountability del dueño.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  assigned_user   UUID REFERENCES users(id) ON DELETE SET NULL,  -- vendedor responsable

  event_type      TEXT NOT NULL CHECK (event_type IN (
    'stage_moved',        -- el agente movió la oportunidad de etapa
    'note_created',       -- el agente creó una nota automática
    'task_created',       -- el agente creó una tarea para el vendedor
    'task_reminder_sent', -- se envió recordatorio al vendedor
    'task_missed',        -- la tarea venció sin completarse
    'task_escalated',     -- se notificó al dueño por omisión
    'appointment_created',-- el agente agendó una cita
    'deal_won',           -- cierre de venta detectado/registrado
    'deal_lost',          -- pérdida de oportunidad registrada
    'monetary_updated'    -- monto del trato actualizado por el agente
  )),

  detail          JSONB NOT NULL DEFAULT '{}',
    -- contexto libre: { "from_stage": "...", "to_stage": "...", "task_id": "...",
    --                   "amount": 150000, "reminder_count": 2, ... }

  triggered_by    TEXT NOT NULL DEFAULT 'agent'
    CHECK (triggered_by IN ('agent', 'user', 'system')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_account
  ON agent_audit_log (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_audit_user
  ON agent_audit_log (assigned_user, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_audit_event
  ON agent_audit_log (account_id, event_type, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 6. RLS — política permisiva (consistente con el resto del proyecto)
-- ────────────────────────────────────────────────────────────
ALTER TABLE agent_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_full_access ON agent_audit_log;
CREATE POLICY dev_full_access ON agent_audit_log
  FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 7. COMENTARIOS DE DOCUMENTACIÓN
-- ────────────────────────────────────────────────────────────
COMMENT ON TABLE agent_audit_log IS
  'Registro inmutable de acciones del Pipeline Agent. '
  'Alimenta el dashboard de accountability del dueño del negocio. '
  'Las entradas de tipo task_missed / task_escalated demuestran que '
  'el sistema sí funcionó pero el vendedor no actualizó.';

COMMENT ON COLUMN tasks.audit_status IS
  'pending = tarea activa sin completar | '
  'completed = completada por el vendedor | '
  'missed = venció sin completarse (agente la detectó) | '
  'escalated = se notificó al dueño por omisión persistente';

COMMENT ON COLUMN tasks.assigned_to IS
  'Usuario al que el agente asignó explícitamente esta tarea '
  '(puede diferir de user_id que es quien la creó).';

COMMENT ON COLUMN accounts.agent_reminder_hours IS
  'Horas que espera el agente tras el vencimiento de una tarea '
  'antes de enviar el primer recordatorio por correo al vendedor.';

COMMENT ON COLUMN accounts.agent_escalation_hours IS
  'Horas sin respuesta tras el primer recordatorio antes de '
  'escalar al dueño/admin vía correo.';

COMMIT;

-- ============================================================
-- VERIFICACIÓN (ejecutar después):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'tasks' ORDER BY ordinal_position;
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'notes' ORDER BY ordinal_position;
--
--   SELECT * FROM agent_audit_log LIMIT 1;
-- ============================================================
