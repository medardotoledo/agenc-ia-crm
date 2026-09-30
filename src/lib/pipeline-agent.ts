/**
 * ════════════════════════════════════════════════════════════════
 * PIPELINE & ACCOUNTABILITY AGENT — CORE SERVICE
 * ════════════════════════════════════════════════════════════════
 * Motor central de automatización de CRM y fiscalización de ventas.
 * - Mueve oportunidades de etapa automáticamente según el contexto.
 * - Registra notas y tareas autónomas con fecha/hora límite.
 * - Sincroniza bidireccionalmente con GoHighLevel (GHL).
 * - Registra cada acción en `agent_audit_log` para blindar al sistema.
 * - Ejecuta la auditoría de omisiones humanas y escalación al dueño.
 * ════════════════════════════════════════════════════════════════
 */

import { createServiceSupabaseClient } from './supabase';
import { createGhlClientForAccount } from './ghl-client';

export type AgentAuditEventType =
  | 'stage_moved'
  | 'note_created'
  | 'task_created'
  | 'task_reminder_sent'
  | 'task_missed'
  | 'task_escalated'
  | 'appointment_created'
  | 'deal_won'
  | 'deal_lost'
  | 'monetary_updated';

export interface AuditLogPayload {
  account_id: string;
  contact_id?: string | null;
  opportunity_id?: string | null;
  assigned_user?: string | null;
  event_type: AgentAuditEventType;
  detail: Record<string, any>;
  triggered_by?: 'agent' | 'user' | 'system';
}

/**
 * Registra una acción inmutable en la bitácora de auditoría del agente.
 */
export async function logAgentAudit(payload: AuditLogPayload) {
  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from('agent_audit_log').insert({
      account_id: payload.account_id,
      contact_id: payload.contact_id || null,
      opportunity_id: payload.opportunity_id || null,
      assigned_user: payload.assigned_user || null,
      event_type: payload.event_type,
      detail: payload.detail || {},
      triggered_by: payload.triggered_by || 'agent',
    });
    if (error) {
      console.error('[PipelineAgent:AuditLog] Error al registrar auditoría:', error);
    }
  } catch (err) {
    console.error('[PipelineAgent:AuditLog] Exception al registrar auditoría:', err);
  }
}

/**
 * 1. MOVER ETAPA EN PIPELINE (Autónomo)
 */
export async function executeMoveStage(params: {
  accountId: string;
  opportunityId: string;
  targetStageNameOrId: string;
  reason?: string;
  triggeredBy?: 'agent' | 'user' | 'system';
}) {
  const { accountId, opportunityId, targetStageNameOrId, reason, triggeredBy = 'agent' } = params;
  const supabase = createServiceSupabaseClient();

  // 1. Obtener la oportunidad actual
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, stage_id, contact_id, pipeline_id, owner_id, stages(id, name, ghl_id), pipelines(id, ghl_id)')
    .eq('id', opportunityId)
    .eq('account_id', accountId)
    .single();

  if (oppErr || !opp) {
    throw new Error(`Oportunidad no encontrada: ${opportunityId}`);
  }

  // 2. Buscar la etapa destino (por ID o por nombre)
  let targetStage: any = null;
  const { data: stagesList } = await supabase
    .from('stages')
    .select('id, name, ghl_id, is_won, is_lost, pipeline_id')
    .eq('account_id', accountId)
    .eq('pipeline_id', opp.pipeline_id);

  if (stagesList && stagesList.length > 0) {
    targetStage = stagesList.find(
      (s) =>
        s.id === targetStageNameOrId ||
        s.name.toLowerCase().trim() === targetStageNameOrId.toLowerCase().trim()
    );
  }

  if (!targetStage) {
    throw new Error(`Etapa destino no encontrada: ${targetStageNameOrId}`);
  }

  const prevStageName = (opp.stages as any)?.name || 'Etapa inicial';
  let oppStatus = 'open';
  if (targetStage.is_won) oppStatus = 'won';
  if (targetStage.is_lost) oppStatus = 'lost';

  // 3. Actualizar en Base de Datos local
  const { error: updErr } = await supabase
    .from('opportunities')
    .update({
      stage_id: targetStage.id,
      status: oppStatus,
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    })
    .eq('id', opportunityId);

  if (updErr) throw updErr;

  // 4. Sincronizar a GHL si está configurado
  try {
    const ghlClient = await createGhlClientForAccount(supabase, accountId);
    const { data: oppFull } = await supabase
      .from('opportunities')
      .select('ghl_id, contacts(ghl_id)')
      .eq('id', opportunityId)
      .single();

    if (oppFull?.ghl_id && targetStage.ghl_id) {
      await ghlClient.updateOpportunity(oppFull.ghl_id, {
        stageId: targetStage.ghl_id,
        status: oppStatus as any,
      });
    }
  } catch (ghlErr) {
    console.warn('[PipelineAgent:MoveStage] GHL sync diferido:', ghlErr);
  }

  // 5. Registrar Auditoría
  await logAgentAudit({
    account_id: accountId,
    contact_id: opp.contact_id,
    opportunity_id: opportunityId,
    assigned_user: opp.owner_id,
    event_type: 'stage_moved',
    detail: {
      from_stage: prevStageName,
      to_stage: targetStage.name,
      stage_id: targetStage.id,
      reason: reason || 'Transición automática por intención detectada en conversación',
    },
    triggered_by: triggeredBy,
  });

  return { success: true, from: prevStageName, to: targetStage.name, status: oppStatus };
}

/**
 * 2. CREAR TAREA CON TEMPORALIDAD Y AUDITORÍA
 */
export async function executeCreateTask(params: {
  accountId: string;
  contactId: string;
  opportunityId?: string;
  title: string;
  body?: string;
  dueAt: string; // ISO string con fecha y hora
  assignedToUserId?: string;
  triggeredBy?: 'agent' | 'user' | 'system';
}) {
  const {
    accountId,
    contactId,
    opportunityId,
    title,
    body = '',
    dueAt,
    assignedToUserId,
    triggeredBy = 'agent',
  } = params;

  const supabase = createServiceSupabaseClient();

  // Si no se especifica usuario, resolver el owner de la oportunidad o el contacto
  let targetUserId = assignedToUserId;
  if (!targetUserId && opportunityId) {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('owner_id')
      .eq('id', opportunityId)
      .maybeSingle();
    targetUserId = opp?.owner_id || null;
  }

  // 1. Insertar en Postgres local
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      user_id: targetUserId,
      assigned_to: targetUserId,
      title,
      body,
      due_at: dueAt,
      created_by_agent: true,
      audit_status: 'pending',
    })
    .select()
    .single();

  if (taskErr || !task) throw taskErr || new Error('No se pudo crear la tarea');

  let ghlTaskId: string | null = null;

  // 2. Sincronizar con GHL
  try {
    const { data: contact } = await supabase
      .from('contacts')
      .select('ghl_id')
      .eq('id', contactId)
      .maybeSingle();

    if (contact?.ghl_id) {
      const ghlClient = await createGhlClientForAccount(supabase, accountId);
      const ghlTask = await ghlClient.createTask(
        contact.ghl_id,
        title,
        body,
        new Date(dueAt).toISOString(),
        false
      );
      if (ghlTask?.id) {
        ghlTaskId = ghlTask.id;
        await supabase
          .from('tasks')
          .update({ ghl_task_id: ghlTaskId })
          .eq('id', task.id);
      }
    }
  } catch (ghlErr) {
    console.warn('[PipelineAgent:CreateTask] GHL sync diferido:', ghlErr);
  }

  // 3. Registrar Auditoría
  await logAgentAudit({
    account_id: accountId,
    contact_id: contactId,
    opportunity_id: opportunityId || null,
    assigned_user: targetUserId,
    event_type: 'task_created',
    detail: {
      task_id: task.id,
      title,
      body,
      due_at: dueAt,
      ghl_task_id: ghlTaskId,
    },
    triggered_by: triggeredBy,
  });

  return { success: true, task };
}

/**
 * 3. CREAR NOTA RESUMEN DE CONVERSACIÓN
 */
export async function executeCreateNote(params: {
  accountId: string;
  contactId: string;
  opportunityId?: string;
  content: string;
  noteType?: 'note' | 'call' | 'whatsapp' | 'email';
  userId?: string;
  triggeredBy?: 'agent' | 'user' | 'system';
}) {
  const {
    accountId,
    contactId,
    opportunityId,
    content,
    noteType = 'note',
    userId,
    triggeredBy = 'agent',
  } = params;

  const supabase = createServiceSupabaseClient();

  // 1. Insertar en Postgres local
  const { data: note, error: noteErr } = await supabase
    .from('notes')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      user_id: userId || null,
      note_type: noteType,
      content,
      created_by_agent: true,
    })
    .select()
    .single();

  if (noteErr || !note) throw noteErr || new Error('No se pudo crear la nota');

  let ghlNoteId: string | null = null;

  // 2. Sincronizar con GHL
  try {
    const { data: contact } = await supabase
      .from('contacts')
      .select('ghl_id')
      .eq('id', contactId)
      .maybeSingle();

    if (contact?.ghl_id) {
      const ghlClient = await createGhlClientForAccount(supabase, accountId);
      const ghlNote = await ghlClient.createNote(contact.ghl_id, content, userId);
      if (ghlNote?.id) {
        ghlNoteId = ghlNote.id;
        await supabase
          .from('notes')
          .update({ ghl_note_id: ghlNoteId })
          .eq('id', note.id);
      }
    }
  } catch (ghlErr) {
    console.warn('[PipelineAgent:CreateNote] GHL sync diferido:', ghlErr);
  }

  // 3. Registrar Auditoría
  await logAgentAudit({
    account_id: accountId,
    contact_id: contactId,
    opportunity_id: opportunityId || null,
    assigned_user: userId || null,
    event_type: 'note_created',
    detail: {
      note_id: note.id,
      note_type: noteType,
      content_preview: content.slice(0, 120),
      ghl_note_id: ghlNoteId,
    },
    triggered_by: triggeredBy,
  });

  return { success: true, note };
}

/**
 * 4. AGENDAR CITA FORMAL (Calendario)
 */
export async function executeBookAppointment(params: {
  accountId: string;
  contactId: string;
  opportunityId?: string;
  calendarId?: string;
  startsAt: string;
  durationMin?: number;
  title?: string;
  notes?: string;
  agentId?: string;
  triggeredBy?: 'agent' | 'user' | 'system';
}) {
  const {
    accountId,
    contactId,
    opportunityId,
    calendarId,
    startsAt,
    durationMin = 60,
    title = 'Cita agendada por Agente IA',
    notes = '',
    agentId,
    triggeredBy = 'agent',
  } = params;

  const supabase = createServiceSupabaseClient();
  const endsAt = new Date(new Date(startsAt).getTime() + durationMin * 60000).toISOString();

  // 1. Insertar en Postgres local
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      opportunity_id: opportunityId || null,
      calendar_id: calendarId || null,
      agent_id: agentId || null,
      title,
      notes,
      starts_at: startsAt,
      ends_at: endsAt,
      duration_min: durationMin,
      status: 'confirmada',
      created_by_agent: true,
    })
    .select()
    .single();

  if (apptErr || !appt) throw apptErr || new Error('No se pudo agendar la cita');

  let ghlEventId: string | null = null;

  // 2. Sincronizar con GHL Calendar
  try {
    const { data: contact } = await supabase
      .from('contacts')
      .select('ghl_id')
      .eq('id', contactId)
      .maybeSingle();

    if (contact?.ghl_id) {
      const ghlClient = await createGhlClientForAccount(supabase, accountId);
      // Buscar calendar de GHL si se proporcionó
      let ghlCalendarId = '';
      if (calendarId) {
        const { data: cal } = await supabase.from('calendars').select('ghl_id').eq('id', calendarId).maybeSingle();
        ghlCalendarId = cal?.ghl_id || '';
      }

      if (!ghlCalendarId) {
        const { data: acc } = await supabase.from('accounts').select('ghl_location_id').eq('id', accountId).single();
        const { calendars } = await ghlClient.getCalendars(acc?.ghl_location_id || '');
        if (calendars && calendars.length > 0) {
          ghlCalendarId = calendars[0].id;
        }
      }

      if (ghlCalendarId) {
        const ghlAppt = await ghlClient.createAppointment({
          calendarId: ghlCalendarId,
          contactId: contact.ghl_id,
          startTime: new Date(startsAt).toISOString(),
          endTime: endsAt,
          title,
          appointmentStatus: 'confirmed',
        });
        if (ghlAppt?.id) {
          ghlEventId = ghlAppt.id;
          await supabase.from('appointments').update({ ghl_event_id: ghlEventId }).eq('id', appt.id);
        }
      }
    }
  } catch (ghlErr) {
    console.warn('[PipelineAgent:BookAppointment] GHL sync diferido:', ghlErr);
  }

  // 3. Registrar Auditoría
  await logAgentAudit({
    account_id: accountId,
    contact_id: contactId,
    opportunity_id: opportunityId || null,
    assigned_user: agentId || null,
    event_type: 'appointment_created',
    detail: {
      appointment_id: appt.id,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      duration_min: durationMin,
      ghl_event_id: ghlEventId,
    },
    triggered_by: triggeredBy,
  });

  return { success: true, appointment: appt };
}

/**
 * 5. REGISTRAR CIERRE DE VENTA Y MONTO
 */
export async function executeRecordSale(params: {
  accountId: string;
  opportunityId: string;
  amount: number;
  notes?: string;
  triggeredBy?: 'agent' | 'user' | 'system';
}) {
  const { accountId, opportunityId, amount, notes = '', triggeredBy = 'agent' } = params;
  const supabase = createServiceSupabaseClient();

  // 1. Actualizar oportunidad a won + valor
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .update({
      value: amount,
      status: 'won',
      temperature: 'hot',
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    })
    .eq('id', opportunityId)
    .eq('account_id', accountId)
    .select('*, contacts(*)')
    .single();

  if (oppErr || !opp) throw oppErr || new Error('No se pudo registrar la venta');

  // 2. Sincronizar con GHL
  try {
    if (opp.ghl_id) {
      const ghlClient = await createGhlClientForAccount(supabase, accountId);
      await ghlClient.updateOpportunity(opp.ghl_id, {
        status: 'won',
        monetaryValue: amount,
      });
    }
  } catch (ghlErr) {
    console.warn('[PipelineAgent:RecordSale] GHL sync diferido:', ghlErr);
  }

  // 3. Si hay notas de venta, registrarlas
  if (notes && opp.contact_id) {
    await executeCreateNote({
      accountId,
      contactId: opp.contact_id,
      opportunityId,
      content: `🎉 Venta Cerrada: Monto $${amount.toLocaleString('es-MX')} MXN. Detalle: ${notes}`,
      noteType: 'note',
      triggeredBy,
    });
  }

  // 4. Registrar Auditoría
  await logAgentAudit({
    account_id: accountId,
    contact_id: opp.contact_id,
    opportunity_id: opportunityId,
    assigned_user: opp.owner_id,
    event_type: 'deal_won',
    detail: {
      amount,
      notes,
    },
    triggered_by: triggeredBy,
  });

  await logAgentAudit({
    account_id: accountId,
    contact_id: opp.contact_id,
    opportunity_id: opportunityId,
    assigned_user: opp.owner_id,
    event_type: 'monetary_updated',
    detail: {
      monetary_value: amount,
    },
    triggered_by: triggeredBy,
  });

  return { success: true, amount, status: 'won' };
}

/**
 * 6. AGREGAR ETIQUETAS
 */
export async function executeAddTags(params: {
  accountId: string;
  contactId: string;
  tags: string[];
  triggeredBy?: 'agent' | 'user' | 'system';
}) {
  const { accountId, contactId, tags, triggeredBy = 'agent' } = params;
  const supabase = createServiceSupabaseClient();

  // 1. Obtener tags actuales
  const { data: contact } = await supabase
    .from('contacts')
    .select('tags, ghl_id')
    .eq('id', contactId)
    .eq('account_id', accountId)
    .single();

  const currentTags: string[] = contact?.tags || [];
  const mergedTags = Array.from(new Set([...currentTags, ...tags]));

  // 2. Actualizar en Postgres
  await supabase
    .from('contacts')
    .update({ tags: mergedTags, updated_at: new Date().toISOString() })
    .eq('id', contactId);

  // 3. Sincronizar en GHL
  if (contact?.ghl_id) {
    try {
      const ghlClient = await createGhlClientForAccount(supabase, accountId);
      await ghlClient.addTags(contact.ghl_id, tags);
    } catch (ghlErr) {
      console.warn('[PipelineAgent:AddTags] GHL tags sync diferido:', ghlErr);
    }
  }

  return { success: true, tags: mergedTags };
}

/**
 * 7. MOTOR DE AUDITORÍA Y ESCALACIÓN (CRON JOB)
 * Revisa tareas vencidas, manda correos al vendedor y escala al dueño si hay omisión.
 */
export async function runAuditAndEscalationCheck(targetAccountId?: string) {
  const supabase = createServiceSupabaseClient();
  const now = new Date();

  // 1. Cargar subcuentas activas
  let accQuery = supabase.from('accounts').select('id, name, agent_reminder_hours, agent_escalation_hours, agent_notify_email, agent_email_from, ghl_location_id');
  if (targetAccountId) {
    accQuery = accQuery.eq('id', targetAccountId);
  }
  const { data: accounts, error: accErr } = await accQuery;
  if (accErr || !accounts) return { error: 'No se pudieron cargar las subcuentas' };

  const results = {
    accountsProcessed: accounts.length,
    remindersSent: 0,
    escalationsSent: 0,
    tasksEvaluated: 0,
  };

  for (const account of accounts) {
    const reminderHours = account.agent_reminder_hours || 1;
    const escalationHours = account.agent_escalation_hours || 24;

    // Buscar tareas no completadas cuya fecha due_at ya pasó
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, body, due_at, audit_status, reminder_sent_at, missed_at, assigned_to, contact_id, contacts(name, email, phone_e164), users:assigned_to(id, name, email)')
      .eq('account_id', account.id)
      .is('completed_at', null)
      .lt('due_at', now.toISOString());

    if (!overdueTasks || overdueTasks.length === 0) continue;

    for (const task of overdueTasks) {
      results.tasksEvaluated++;
      const dueTime = new Date(task.due_at).getTime();
      const elapsedHours = (now.getTime() - dueTime) / (1000 * 60 * 60);

      const assignedUser: any = task.users;
      const contact: any = task.contacts;

      // CASO A: Recordatorio al Vendedor (Pasó el tiempo de recordatorio y no se le ha avisado)
      if (elapsedHours >= reminderHours && !task.reminder_sent_at) {
        // Enviar correo al vendedor si tiene email
        if (assignedUser?.email) {
          try {
            const ghlClient = await createGhlClientForAccount(supabase, account.id);
            if (task.contact_id) {
              await ghlClient.sendEmail({
                contactId: (contact as any)?.ghl_id || task.contact_id,
                emailTo: assignedUser.email,
                emailFrom: account.agent_email_from || undefined,
                subject: `⏰ Recordatorio de Seguimiento: ${task.title}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #1e3a8a;">Hola ${assignedUser.name || 'Asesor'}, tienes una tarea pendiente</h2>
                    <p>La siguiente tarea programada por el Agente de CRM venció hace <strong>${Math.round(elapsedHours)} hora(s)</strong>:</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 15px 0;">
                      <p style="margin: 0; font-weight: bold; font-size: 16px;">${task.title}</p>
                      <p style="margin: 5px 0 0 0; color: #475569;">Prospecto: ${contact?.name || 'Cliente'} (${contact?.phone_e164 || 'Sin teléfono'})</p>
                      ${task.body ? `<p style="margin: 8px 0 0 0; color: #334155; font-size: 14px;"><em>"${task.body}"</em></p>` : ''}
                    </div>
                    <p>Por favor realiza la llamada o acción y marca la tarea como realizada en tu CRM para evitar que se escale con gerencia.</p>
                  </div>
                `,
              });
            }
          } catch (mailErr) {
            console.warn('[PipelineAgent:Audit] Error al enviar recordatorio por email:', mailErr);
          }
        }

        // Actualizar tarea a 'missed'
        await supabase
          .from('tasks')
          .update({
            audit_status: 'missed',
            missed_at: now.toISOString(),
            reminder_sent_at: now.toISOString(),
          })
          .eq('id', task.id);

        await logAgentAudit({
          account_id: account.id,
          contact_id: task.contact_id,
          assigned_user: task.assigned_to,
          event_type: 'task_reminder_sent',
          detail: {
            task_id: task.id,
            elapsed_hours: elapsedHours,
            seller_email: assignedUser?.email,
          },
          triggered_by: 'system',
        });

        results.remindersSent++;
      }

      // CASO B: Escalación al Dueño (Pasaron más de escalationHours y sigue sin atenderse)
      if (elapsedHours >= escalationHours && task.audit_status !== 'escalated') {
        const ownerEmail = account.agent_notify_email;
        if (ownerEmail) {
          try {
            const ghlClient = await createGhlClientForAccount(supabase, account.id);
            if (task.contact_id) {
              await ghlClient.sendEmail({
                contactId: (contact as any)?.ghl_id || task.contact_id,
                emailTo: ownerEmail,
                emailFrom: account.agent_email_from || undefined,
                subject: `🚨 Alerta de Omisión: Tarea desatendida por ${assignedUser?.name || 'Vendedor'}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fecaca; border-radius: 8px; background-color: #fffaf0;">
                    <h2 style="color: #b91c1c;">⚠️ Alerta de Auditoría — Omisión en Seguimiento</h2>
                    <p>Estimado Administrador,</p>
                    <p>El prospecto <strong>${contact?.name || 'Prospecto'}</strong> tiene una tarea que lleva <strong>${Math.round(elapsedHours)} horas desatendida</strong> sin que el asesor asignado haya reportado avance.</p>
                    <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #ef4444; border-radius: 4px; margin: 15px 0; border: 1px solid #fee2e2;">
                      <p style="margin: 0; font-weight: bold;">Tarea: ${task.title}</p>
                      <p style="margin: 4px 0 0 0;">Asesor Responsable: <strong>${assignedUser?.name || 'No asignado'}</strong> (${assignedUser?.email || ''})</p>
                      <p style="margin: 4px 0 0 0;">Fecha límite original: ${new Date(task.due_at).toLocaleString('es-MX')}</p>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">Este reporte es generado automáticamente por el Pipeline Agent para garantizar el cumplimiento del equipo de ventas.</p>
                  </div>
                `,
              });
            }
          } catch (mailErr) {
            console.warn('[PipelineAgent:Audit] Error al enviar escalación por email:', mailErr);
          }
        }

        // Actualizar tarea a 'escalated'
        await supabase
          .from('tasks')
          .update({
            audit_status: 'escalated',
            escalated_at: now.toISOString(),
          })
          .eq('id', task.id);

        await logAgentAudit({
          account_id: account.id,
          contact_id: task.contact_id,
          assigned_user: task.assigned_to,
          event_type: 'task_escalated',
          detail: {
            task_id: task.id,
            elapsed_hours: elapsedHours,
            escalated_to: ownerEmail,
          },
          triggered_by: 'system',
        });

        results.escalationsSent++;
      }
    }
  }

  return results;
}
