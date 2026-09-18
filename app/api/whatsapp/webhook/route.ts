export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function getGHLInstallation(accountId: string): Promise<{ accessToken: string; locationId: string }> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT access_token, location_id FROM ghl_installations WHERE location_id = $1 OR account_id = $1 LIMIT 1;',
        [accountId]
      );
      if (result.rows.length > 0 && result.rows[0].access_token) {
        return {
          accessToken: result.rows[0].access_token,
          locationId: result.rows[0].location_id || accountId,
        };
      }
      const fallback = await client.query(
        'SELECT access_token, location_id FROM ghl_installations ORDER BY id DESC LIMIT 1;'
      );
      if (fallback.rows.length > 0 && fallback.rows[0].access_token) {
        return {
          accessToken: fallback.rows[0].access_token,
          locationId: fallback.rows[0].location_id,
        };
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[Webhook] DB Query warning:', err.message);
  }
  return {
    accessToken: process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966',
    locationId: accountId || 'OS9czz85LUvBeljk8FEv',
  };
}

const ghlTemplatesCache: Record<string, { fetchedAt: number; templates: { name: string; body: string }[] }> = {};

async function fetchGHLTemplates(locationId: string, accessToken: string): Promise<{ name: string; body: string }[]> {
  const now = Date.now();
  if (ghlTemplatesCache[locationId] && now - ghlTemplatesCache[locationId].fetchedAt < 10 * 60 * 1000) {
    return ghlTemplatesCache[locationId].templates;
  }
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/templates`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      const raw = data.templates || [];
      const list = raw
        .map((t: any) => ({
          name: t.name || 'Sin nombre',
          body: (t.template?.body || t.body || '').trim(),
        }))
        .filter((t: any) => t.body.length > 0);
      ghlTemplatesCache[locationId] = { fetchedAt: now, templates: list };
      return list;
    }
  } catch (err: any) {
    console.warn('[Webhook WA] Error fetching GHL templates:', err.message);
  }
  return [];
}

async function fetchBase64FromEvolution(instance: string, key: any): Promise<string | null> {
  const urls = [
    process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    'http://2.24.65.127:8085',
    'http://evolution-api:8080',
    'http://localhost:8085',
    'http://host.docker.internal:8085',
    'http://172.17.0.1:8085',
  ];
  const apiKey = process.env.EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026';

  for (const baseUrl of urls) {
    try {
      const res = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          message: { key },
          convertToMp4: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.base64) return data.base64;
      }
    } catch {
      // try next
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Webhook WA] Event received:', body.event, 'Instance:', body.instance);

    const { event, instance, data } = body;

    // Solo procesar nuevos mensajes
    const isUpsert = event === 'messages.upsert' || event === 'MESSAGES_UPSERT';
    if (!isUpsert) {
      return NextResponse.json({ received: true, ignored: 'not_upsert' });
    }

    // Extraer datos del mensaje según estructura de Evolution API v1 o v2
    const key = data?.key || body.key;
    const message = data?.message || body.message;

    const isFromMe = Boolean(key?.fromMe);

    // En WhatsApp con Evolution API v2, remoteJidAlt contiene el número telefónico real
    const remoteJid = key?.remoteJidAlt || key?.remoteJid || body.sender || data?.sender;
    if (!remoteJid || remoteJid.includes('@g.us')) {
      return NextResponse.json({ received: true, ignored: 'group_or_no_jid' });
    }

    // Detectar si el mensaje contiene multimedia
    const isImage = Boolean(message?.imageMessage);
    const isVideo = Boolean(message?.videoMessage);
    const isAudio = Boolean(message?.audioMessage);
    const isDocument = Boolean(message?.documentMessage);
    const isSticker = Boolean(message?.stickerMessage);
    const hasMedia = isImage || isVideo || isAudio || isDocument || isSticker;

    // Extraer texto del mensaje
    let textContent =
      message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      message?.videoMessage?.caption ||
      message?.documentMessage?.caption ||
      '';

    // Si no trae texto pero es un archivo o audio, asignar una descripción amigable en lugar de ignorarlo
    if (!textContent && hasMedia) {
      if (isImage) textContent = '📷 Foto recibida';
      else if (isVideo) textContent = '🎥 Video recibido';
      else if (isAudio) textContent = '🎤 Nota de voz recibida';
      else if (isDocument) {
        const docName = message?.documentMessage?.fileName || 'documento';
        textContent = `📎 Documento: ${docName}`;
      } else if (isSticker) {
        textContent = '🎨 Sticker recibido';
      }
    }

    // Si definitivamente no hay contenido ni multimedia, descartar
    if (!textContent && !hasMedia) {
      return NextResponse.json({ received: true, ignored: 'no_content' });
    }

    const senderName = data?.pushName || body.pushName || 'WhatsApp Contact';
    const rawPhone = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');

    // Extraer subcuenta / locationId
    let accountId = 'OS9czz85LUvBeljk8FEv';
    if (instance) {
      accountId = instance.replace(/^(sub_|wa_)/, '');
    }

    // 1. Obtener Token y LocationId de GoHighLevel
    const { accessToken: ghlToken, locationId: resolvedLocationId } = await getGHLInstallation(accountId);
    const ghlHeaders = {
      Authorization: `Bearer ${ghlToken}`,
      'Content-Type': 'application/json',
      Version: '2021-04-15',
    };

    let ghlContactId: string | null = null;

    // 2. Buscar contacto en GHL con el número en formato internacional (+52...)
    const phoneWithPlus = `+${rawPhone}`;
    const searchUrl1 = `https://services.leadconnectorhq.com/contacts/?query=${encodeURIComponent(phoneWithPlus)}&locationId=${accountId}`;
    const searchRes1 = await fetch(searchUrl1, { headers: ghlHeaders });

    if (searchRes1.ok) {
      const searchData1 = await searchRes1.json();
      if (searchData1.contacts && searchData1.contacts.length > 0) {
        ghlContactId = searchData1.contacts[0].id;
      }
    }

    // Fallback para números con/sin prefijo local
    if (!ghlContactId && phoneWithPlus.startsWith('+521')) {
      const altPhone = `+52${phoneWithPlus.slice(4)}`;
      const searchUrl2 = `https://services.leadconnectorhq.com/contacts/?query=${encodeURIComponent(altPhone)}&locationId=${accountId}`;
      const searchRes2 = await fetch(searchUrl2, { headers: ghlHeaders });
      if (searchRes2.ok) {
        const searchData2 = await searchRes2.json();
        if (searchData2.contacts && searchData2.contacts.length > 0) {
          ghlContactId = searchData2.contacts[0].id;
        }
      }
    }

    // 3. Si aún no existe en GHL, crearlo automáticamente
    if (!ghlContactId) {
      const createRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
        method: 'POST',
        headers: ghlHeaders,
        body: JSON.stringify({
          name: senderName,
          phone: phoneWithPlus,
          locationId: accountId,
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        ghlContactId = createData.contact?.id;
      } else {
        const errText = await createRes.text();
        console.warn('[Webhook WA] Contact creation failed:', errText);
      }
    }

    // 4. Asegurar que el contacto tenga una oportunidad en el Pipeline para aparecer en el CRM Kanban
    if (ghlContactId) {
      try {
        const oppSearchUrl = `https://services.leadconnectorhq.com/opportunities/search?location_id=${accountId}&contact_id=${ghlContactId}`;
        const oppSearchRes = await fetch(oppSearchUrl, { headers: { ...ghlHeaders, Version: '2021-07-28' } });
        if (oppSearchRes.ok) {
          const oppSearchData = await oppSearchRes.json();
          if (!oppSearchData.opportunities || oppSearchData.opportunities.length === 0) {
            await fetch('https://services.leadconnectorhq.com/opportunities/', {
              method: 'POST',
              headers: { ...ghlHeaders, Version: '2021-07-28' },
              body: JSON.stringify({
                name: senderName || phoneWithPlus,
                pipelineId: 'czJFUMy4psgBs7tn8nE8',
                pipelineStageId: 'e519fb0d-8e24-461e-81a6-44d9d973f21e',
                locationId: accountId,
                contactId: ghlContactId,
                status: 'open',
                monetaryValue: 0,
              }),
            });
            console.log('[Webhook WA] Auto-created opportunity for contact:', ghlContactId);
          }
        }
      } catch (oppErr: any) {
        console.warn('[Webhook WA] Error checking/creating opportunity:', oppErr.message);
      }
    }

    // 5. Procesar multimedia si existe para obtener una URL pública (GHL Media CDN)
    let cdnUrl: string | null = null;
    if (hasMedia) {
      try {
        let base64Media = data?.base64 || data?.message?.base64 || body?.base64;
        if (!base64Media && instance && key) {
          base64Media = await fetchBase64FromEvolution(instance, key);
        }

        if (base64Media) {
          const rawBase64 = base64Media.replace(/^data:[^;]+;base64,/, '');
          let mimeType = 'application/octet-stream';
          let fileName = `archivo_${Date.now()}`;

          if (isImage) {
            mimeType = message?.imageMessage?.mimetype || 'image/jpeg';
            fileName = `foto_${Date.now()}.jpg`;
          } else if (isVideo) {
            mimeType = message?.videoMessage?.mimetype || 'video/mp4';
            fileName = `video_${Date.now()}.mp4`;
          } else if (isAudio) {
            mimeType = message?.audioMessage?.mimetype || 'audio/ogg';
            fileName = `audio_${Date.now()}.ogg`;
          } else if (isDocument) {
            mimeType = message?.documentMessage?.mimetype || 'application/pdf';
            fileName = message?.documentMessage?.fileName || `documento_${Date.now()}.pdf`;
          }

          const buffer = Buffer.from(rawBase64, 'base64');
          const blob = new Blob([buffer], { type: mimeType });
          const form = new FormData();
          form.append('file', blob, fileName);
          form.append('name', fileName);
          form.append('altId', accountId);
          form.append('altType', 'location');

          const upRes = await fetch('https://services.leadconnectorhq.com/medias/upload-file', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${ghlToken}`,
              Version: '2021-07-28',
            },
            body: form,
          });

          if (upRes.ok) {
            const upData = await upRes.json();
            if (upData.url) cdnUrl = upData.url;
            console.log('[Webhook WA] Inbound media uploaded to GHL CDN:', cdnUrl);
          } else {
            console.warn('[Webhook WA] Upload to GHL media failed status:', upRes.status);
          }
        }
      } catch (mediaErr: any) {
        console.warn('[Webhook WA] Error processing inbound media:', mediaErr.message);
      }
    }

    // 6. Registrar el mensaje en la conversación de GHL (saliente o entrante)
    if (ghlContactId) {
      const attachments = cdnUrl ? [cdnUrl] : [];

      if (isFromMe) {
        // Mensaje saliente enviado desde WhatsApp celular
        const outboundRes = await fetch('https://services.leadconnectorhq.com/conversations/messages', {
          method: 'POST',
          headers: ghlHeaders,
          body: JSON.stringify({
            type: 'Live_Chat',
            contactId: ghlContactId,
            message: textContent,
            ...(attachments.length > 0 ? { attachments } : {}),
          }),
        });
        const outData = await outboundRes.json().catch(() => ({}));
        console.log('[Webhook WA] Outbound message synced to GHL:', outData);
        return NextResponse.json({ success: true, outbound: true, contactId: ghlContactId, message: outData });
      }

      // Mensaje entrante recibido del cliente
      const inboundRes = await fetch('https://services.leadconnectorhq.com/conversations/messages/inbound', {
        method: 'POST',
        headers: ghlHeaders,
        body: JSON.stringify({
          type: 'WhatsApp',
          contactId: ghlContactId,
          message: textContent,
          body: textContent,
          ...(attachments.length > 0 ? { attachments } : {}),
        }),
      });

      const inboundData = await inboundRes.json().catch(() => ({}));
      console.log('[Webhook WA] Inbound message injected into GHL:', inboundData);

      // 7. SEGURIDAD Y EVALUACIÓN DE RESPUESTA DE AGENTE IA
      try {
        const cleanPhone = rawPhone;

        // A. Consultar control específico de este chat
        const { rows: controlRows } = await pool.query(
          `SELECT ai_mode, assigned_agent_id, last_human_interaction 
           FROM crm_chat_controls 
           WHERE account_id = $1 AND (chat_id = $2 OR chat_id = $3)
           LIMIT 1;`,
          [accountId, cleanPhone, ghlContactId]
        );

        const chatControl = controlRows[0];
        const chatMode = chatControl?.ai_mode;

        // B. Consultar Switch Maestro Global de Seguridad
        const { rows: keyRows } = await pool.query(
          `SELECT is_global_auto_reply_enabled, gemini_key, openai_key, anthropic_key FROM account_ai_keys 
           WHERE account_id = $1 OR account_id = 'OS9czz85LUvBeljk8FEv' OR account_id = 'default'
           ORDER BY CASE WHEN account_id = $1 THEN 1 WHEN account_id = 'OS9czz85LUvBeljk8FEv' THEN 2 ELSE 3 END 
           LIMIT 1;`,
          [accountId]
        );
        const accountKeys = keyRows[0] || {};
        const isGlobalEnabled = Boolean(accountKeys.is_global_auto_reply_enabled);

        // C. Determinar si califica para respuesta automática:
        // - Si está en 'human': NUNCA responder (control manual del usuario)
        // - Si está en 'ai_agent': SIEMPRE responder (whitelist / excepción explícita que protege el teléfono personal)
        // - Si está en 'hybrid': responder salvo si hubo intervención humana en los últimos 30 min
        // - Si no tiene registro (nuevo/desconocido): responder solo si isGlobalEnabled está activo
        let shouldReply = false;
        let replyReason = '';
        const assignedAgentId = chatControl?.assigned_agent_id;

        if (chatMode === 'human') {
          shouldReply = false;
          replyReason = 'chat_mode_is_human';
          console.log('[Webhook WA] Chat en modo Humano explícito. No se dispara respuesta de IA.');
        } else if (chatMode === 'ai_agent') {
          shouldReply = true;
          replyReason = 'explicit_ai_agent_whitelist';
          console.log(`[Webhook WA] Excepción activa: Chat asignado explícitamente a Agente IA. Procediendo a responder (Global Switch: ${isGlobalEnabled ? 'ON' : 'OFF - Modo Seguro Personal'}).`);
        } else if (chatMode === 'hybrid') {
          const lastHuman = chatControl?.last_human_interaction;
          if (lastHuman) {
            const diffMinutes = (Date.now() - new Date(lastHuman).getTime()) / (1000 * 60);
            if (diffMinutes < 30) {
              shouldReply = false;
              replyReason = 'hybrid_human_override';
              console.log(`[Webhook WA] Modo Híbrido pausado (humano intervino hace ${diffMinutes.toFixed(1)} min).`);
            } else {
              shouldReply = true;
              replyReason = 'hybrid_active';
            }
          } else {
            shouldReply = true;
            replyReason = 'hybrid_active';
          }
        } else {
          // Chat sin configuración específica
          if (isGlobalEnabled) {
            shouldReply = true;
            replyReason = 'global_auto_reply_enabled';
            console.log('[Webhook WA] Switch Global ACTIVO. Chat entrante califica para respuesta por defecto.');
          } else {
            shouldReply = false;
            replyReason = 'personal_safe_mode_default_human';
            console.log('[Webhook WA] Modo Seguro ACTIVO (Teléfono Personal). Sin asignación previa a IA, chat personal ignorado.');
          }
        }

        if (!shouldReply) {
          return NextResponse.json({
            success: true,
            contactId: ghlContactId,
            message: inboundData,
            aiAutoReply: false,
            reason: replyReason,
          });
        }

        // D. GENERAR Y ENVIAR RESPUESTA DEL AGENTE DE IA
        // 1. Obtener datos del agente (el asignado o el primer agente activo)
        const { rows: agentRows } = await pool.query(
          `SELECT * FROM ai_agents 
           WHERE (id = $1 OR account_id = $2 OR account_id = 'OS9czz85LUvBeljk8FEv') 
           ORDER BY CASE WHEN id = $1 THEN 1 WHEN account_id = $2 THEN 2 ELSE 3 END, created_at ASC 
           LIMIT 1;`,
          [assignedAgentId || '00000000-0000-0000-0000-000000000000', accountId]
        );

        if (!agentRows.length) {
          console.warn('[Webhook WA] No se encontró ningún agente activo para responder.');
          return NextResponse.json({ success: true, contactId: ghlContactId, aiAutoReply: false, reason: 'no_agent_found' });
        }

        const agent = agentRows[0];
        console.log(`[Webhook WA] Generando respuesta con agente: "${agent.name}" (${agent.role})...`);

        // 2. Obtener Segundo Cerebro del agente (con fallback a la cuenta si no tiene)
        let { rows: brainDocs } = await pool.query(
          'SELECT title, markdown_content FROM ai_agent_brains WHERE agent_id = $1 ORDER BY file_slug ASC;',
          [agent.id]
        );

        if (!brainDocs.length) {
          const { rows: fallbackBrains } = await pool.query(
            `SELECT title, markdown_content FROM ai_agent_brains 
             WHERE agent_id IN (SELECT id FROM ai_agents WHERE account_id = $1 OR account_id = 'OS9czz85LUvBeljk8FEv') 
             ORDER BY file_slug ASC;`,
            [accountId]
          );
          brainDocs = fallbackBrains;
        }
        const brainContext = brainDocs.map((b: any) => `### ${b.title}\n${b.markdown_content}`).join('\n\n');

        // Obtener fichas de productos
        const { rows: productRows } = await pool.query(
          `SELECT name, short_description, knowledge_sheet, target_triggers, price_range, irresistible_offer 
           FROM ai_agent_products 
           WHERE agent_id = $1 OR agent_id IN (SELECT id FROM ai_agents WHERE account_id = $2 OR account_id = 'OS9czz85LUvBeljk8FEv') 
           ORDER BY display_order ASC;`,
          [agent.id, accountId]
        );
        const productContext = productRows.map((p: any) => `### PRODUCTO / SERVICIO: ${p.name}
Descripción: ${p.short_description || ''}
Rango de Inversión: ${p.price_range || 'Consultar valoración'}
Gatillos / Síntomas: ${p.target_triggers || ''}
${p.irresistible_offer ? `Oferta Irresistible Empaquetada:\n${p.irresistible_offer}\n` : ''}
Ficha de Conocimiento:
${p.knowledge_sheet || ''}`).join('\n\n');

        // 3. Obtener historial reciente de la conversación (últimos mensajes)
        let recentChatHistory = '';
        if (inboundData?.conversationId) {
          try {
            const histRes = await fetch(
              `https://services.leadconnectorhq.com/conversations/${inboundData.conversationId}/messages?limit=5`,
              { headers: ghlHeaders }
            );
            if (histRes.ok) {
              const histData = await histRes.json();
              const histMsgs = (histData?.messages?.messages || []).reverse();
              if (histMsgs.length > 0) {
                recentChatHistory = histMsgs
                  .map((m: any) => `${m.direction === 'inbound' ? 'Cliente' : agent.name}: ${m.body || m.message || ''}`)
                  .join('\n');
              }
            }
          } catch (hErr: any) {
            console.warn('[Webhook WA] Error obteniendo historial:', hErr.message);
          }
        }

        // 3.1 Obtener Snippets / Plantillas Oficiales de GoHighLevel
        let snippetsContext = '';
        try {
          const ghlSnippets = await fetchGHLTemplates(resolvedLocationId, ghlToken);
          if (ghlSnippets.length > 0) {
            snippetsContext = ghlSnippets
              .slice(0, 15)
              .map((s) => `• [Snippet Oficial: ${s.name}]
"${s.body}"`)
              .join('\n\n');
          }
        } catch (sErr: any) {
          console.warn('[Webhook WA] Error obteniendo snippets GHL:', sErr.message);
        }

        // 4. Obtener personalidad (ia_soul)
        const iaSoul = typeof agent.ia_soul === 'string' ? JSON.parse(agent.ia_soul) : (agent.ia_soul || {});
        const soulRules = iaSoul.custom_rules || 'Habla como una asesora cercana, empática, profesional y educada. Usa emojis amigables y tono humano.';

        // 5. Construir System Prompt con el Segundo Cerebro y Guardrails Inmutables
        const systemPrompt = `Eres ${agent.name}, ${agent.role || 'Especialista en Atención y Ventas'}.
Directrices de Personalidad y Estilo:
${soulRules}
${agent.system_instructions ? `\nInstrucciones específicas del negocio:\n${agent.system_instructions}` : ''}

=== CATÁLOGO Y OFERTAS IRRESISTIBLES DE LA EMPRESA ===
${productContext || 'Consulta los servicios oficiales de la empresa.'}

=== SEGUNDO CEREBRO (CONOCIMIENTO COMERCIAL, TÉCNICO Y CLÍNICO) ===
${brainContext}

=== RESPUESTAS PRE-DEFINIDAS Y SNIPPETS OFICIALES DE LA CLÍNICA (GOHIGHLEVEL) ===
${snippetsContext || '(Aún no hay plantillas/snippets guardados en GoHighLevel)'}

REGLAS DE ORO Y GUARDRAILS DE CONVERSIÓN (OBLIGATORIAS):
1. ATENDEMOS PERSONAS, NO TRANSACCIONES: Tu objetivo principal es generar confianza, reducir miedos y ser el antídoto al dolor o la incertidumbre del cliente.
2. GUARDRAIL DE PRIMERA INTERACCIÓN (PROHIBIDO PREJUZGAR AL LEAD COMO ROJO):
   - En el primer mensaje del prospecto o si su mensaje es genérico/corto ("quiero información", "deseo informes", "precio", "info", "hola"):
     NUNCA lo clasifiques ni prejuzgues de inmediato como ROJO (D). La gran mayoría de los prospectos entran con el texto predeterminado de un anuncio de Meta o WhatsApp.
   - Aplica SIEMPRE la Bienvenida Cálida Dental Art:
     a) Saludo cálido, humano y sonriente ("Nadie nos gana el saludo" + Ojos, Sonrisa y Nombre si lo tenemos).
     b) Agradece su mensaje y valida su interés con empatía.
     c) Aplica "El Doctor de las Ventas" (Brian Tracy): Haz una PREGUNTA DIAGNÓSTICA ABIERTA para conocer qué busca antes de apresurar cualquier cierre.
        Ejemplo: "¡Hola! Qué gusto saludarte, con muchísimo gusto te comparto toda la información. Para orientarte exactamente en lo que tú necesitas, ¿tienes en mente algún tratamiento o molestia en particular, o estás buscando una valoración preventiva de rutina? Platícame con confianza y te voy guiando. 😊✨"
   - Su respuesta a esta pregunta abierta será la que revele su verdadero perfil psicológico DISC.
3. USO DE SNIPPETS Y PLANTILLAS OFICIALES (GOHIGHLEVEL):
   - Revisa si la pregunta o necesidad del paciente coincide con alguna de las "RESPUESTAS PRE-DEFINIDAS Y SNIPPETS OFICIALES" listadas arriba (ej. ubicación de la clínica, formas de pago, promociones oficiales, indicaciones pre/post).
   - Si coincide, UTILIZA esa información oficial como la base de tu respuesta para garantizar exactitud clínica y comercial.
   - NUNCA lo envíes como un copy-paste robótico: intégralo de forma natural, humana y empática respetando los datos exactos del snippet.
4. POLÍTICA DE PRECIOS: Si el cliente pregunta por costos, responde siempre con RANGOS DE INVERSIÓN y ancla la cita de valoración o diagnóstico para darle el costo exacto y personalizado según su caso.
5. NEURO-SEMÁNTICA (BOTONES MENTALES):
   - NUNCA uses palabras de fricción o dolor financiero como: "costo", "gasto", "pagar", "cuota", "cobro".
   - USA palabras de valor y respaldo como: "inversión", "garantía", "resultado", "tu nueva sonrisa", "acompañamiento", "tecnología".
   - Si tocas un riesgo o dolor para concientizar (ej. "evitar complicaciones mayores", "prevenir infecciones silenciosas"), sé de inmediato el antídoto ofreciendo la solución.
6. METODOLOGÍA DE VENTAS (BRIAN TRACY):
   - "El Doctor de las Ventas": Diagnostica antes de recetar. Antes de cerrar, haz una pregunta de calificación para entender su necesidad o dolor real.
   - "Cierre por Doble Alternativa": NUNCA preguntes "¿Quieres agendar?" o "¿Te gustaría una cita?". Ofrece siempre dos opciones concretas de horario: "¿Te queda mejor el jueves por la mañana o el viernes por la tarde?".
7. CALIBRACIÓN PSICOLÓGICA DISC (A PARTIR DE SU SEGUNDA INTERACCIÓN / RESPUESTA DIAGNÓSTICA):
   - Si el prospecto es ROJO (D): Directo, resultados, sin rodeos, máximo 2 oraciones breves, agendar rápido.
   - Si es AMARILLO (I): Entusiasta, sociable, valida su imagen/estética ("¡Te vas a ver increíble!"), usa emojis amigables.
   - Si es VERDE (S): Paciente, protector, transmite tranquilidad, cero dolor, garantías por escrito y que va a su ritmo seguro.
   - Si es AZUL (C): Datos duros, calidad de materiales, certificaciones y proceso clínico transparente paso a paso.
8. PROTOCOLO DE INCERTIDUMBRE Y ESCALACIÓN NIVEL 2:
   - Si el cliente pregunta por un tratamiento, caso clínico específico o procedimiento que NO esté en tu catálogo ni en tu Segundo Cerebro ni en los snippets oficiales: NUNCA inventes información ni alucines.
   - Responde con la pausa empática: "Con mucho gusto te apoyo con esa duda. Justo ese detalle específico prefiero consultarlo directamente con el Doctor / Especialista para darte la indicación exacta y personalizada. Dame unos momentos, se lo consulto y te respondo por aquí mismo con la información precisa. 👨‍⚕️✨"
   - Agrega al final el código interno [REQUIERE_APOYO: motivo breve].
9. LONGITUD PARA WHATSAPP:
   - Respuestas concisas, humanas y directas (máximo 2 a 3 oraciones cortas por mensaje). NUNCA mandes párrafos gigantescos ni listas aburridas.
   - NUNCA digas que eres una IA, un bot o un asistente virtual. Eres una persona de carne y hueso del equipo.
   - Responde ÚNICAMENTE con el mensaje final directo para enviar al cliente.`;

        // 6. Generar respuesta con Gemini
        const geminiApiKey = accountKeys.gemini_key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        let aiReplyText = '';

        if (geminiApiKey) {
          const candidateModels = [
            'gemini-3.6-flash',
            'gemini-flash-lite-latest',
            agent.llm_model || 'gemini-3.6-flash',
            'gemini-3.5-flash',
          ];
          const modelsToTry = Array.from(new Set(candidateModels));

          const userTurnText = recentChatHistory
            ? `Historial reciente de la conversación:\n${recentChatHistory}\n\nResponde al último mensaje del cliente ("${textContent}") usando estrictamente tu Segundo Cerebro:`
            : textContent;

          for (const mName of modelsToTry) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${geminiApiKey}`;
              const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemInstruction: {
                    parts: [{ text: systemPrompt }]
                  },
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: userTurnText }]
                    }
                  ],
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1200,
                  }
                }),
              });

              if (geminiRes.ok) {
                const geminiData = await geminiRes.json();
                const parts = geminiData?.candidates?.[0]?.content?.parts || [];
                const textParts = parts.filter((p: any) => !p.thought && p.text);
                const rawGenerated = textParts.length > 0 ? textParts.map((p: any) => p.text).join('\n') : (parts[0]?.text || '');
                if (rawGenerated) {
                  aiReplyText = rawGenerated.trim();
                  break;
                }
              } else {
                console.warn(`[Webhook WA] Gemini ${mName} status:`, geminiRes.status);
              }
            } catch (llmErr: any) {
              console.warn(`[Webhook WA] Error calling ${mName}:`, llmErr.message);
            }
          }
        }

        if (!aiReplyText) {
          console.warn('[Webhook WA] No se pudo generar respuesta de IA (falló Gemini o no hay API key).');
          return NextResponse.json({ success: true, contactId: ghlContactId, aiAutoReply: false, reason: 'llm_failed' });
        }

        // Detección de Escalación Nivel 2
        let requiresEscalation = false;
        let escalationReason = '';
        if (aiReplyText.includes('[REQUIERE_APOYO:')) {
          requiresEscalation = true;
          const match = aiReplyText.match(/\[REQUIERE_APOYO:\s*([^\]]+)\]/i);
          escalationReason = match ? match[1].trim() : 'Duda clínica fuera de base de conocimiento';
          aiReplyText = aiReplyText.replace(/\[REQUIERE_APOYO:[^\]]+\]/gi, '').trim();

          // Pausar el chat a modo híbrido
          await pool.query(
            `UPDATE crm_chat_controls SET ai_mode = 'hybrid', updated_at = NOW() 
             WHERE account_id = $1 AND (chat_id = $2 OR chat_id = $3);`,
            [accountId, cleanPhone, ghlContactId]
          ).catch((e: any) => console.warn('[Webhook WA] Error setting hybrid mode:', e.message));

          // Agregar Tag en GoHighLevel
          if (ghlContactId) {
            fetch(`https://services.leadconnectorhq.com/contacts/${ghlContactId}/tags`, {
              method: 'POST',
              headers: ghlHeaders,
              body: JSON.stringify({ tags: ['requiere-doctor'] }),
            }).catch((e: any) => console.warn('[Webhook WA] Error adding tag to GHL:', e.message));

            // Dejar nota interna en GoHighLevel
            fetch(`https://services.leadconnectorhq.com/contacts/${ghlContactId}/notes`, {
              method: 'POST',
              headers: ghlHeaders,
              body: JSON.stringify({
                body: `🚨 Alerta Nivel 2: El cliente preguntó algo fuera del Segundo Cerebro (${escalationReason}). La IA fue pausada a modo Híbrido.`,
              }),
            }).catch((e: any) => console.warn('[Webhook WA] Error adding note to GHL:', e.message));
          }
        }

        // Limpiar formato innecesario o artefactos de pensamiento
        aiReplyText = aiReplyText
          .replace(/^Check against constraints:[\s\S]*?(?=\n\n|$)/i, '')
          .replace(/^Thinking Process:[\s\S]*?(?=\n\n|$)/i, '')
          .replace(/^Thought:[\s\S]*?(?=\n\n|$)/i, '')
          .replace(/^"|"$/g, '')
          .replace(new RegExp(`^(${agent.name}|Asesor|Asistente):\\s*`, 'i'), '')
          .trim();

        console.log(`[Webhook WA] Respuesta de ${agent.name} generada con éxito: "${aiReplyText.slice(0, 80)}..."`);

        // 6. Enviar respuesta por WhatsApp vía Evolution API
        const waInstance = instance || `sub_${accountId}`;
        const evoUrls = [
          process.env.EVOLUTION_API_URL || 'http://localhost:8080',
          'http://2.24.65.127:8085',
          'http://evolution-api:8080',
          'http://localhost:8085',
          'http://host.docker.internal:8085',
          'http://172.17.0.1:8085',
        ];
        const evoKey = process.env.EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026';

        let sentOk = false;
        for (const evoUrl of evoUrls) {
          try {
            const evoRes = await fetch(`${evoUrl}/message/sendText/${waInstance}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: evoKey,
              },
              body: JSON.stringify({
                number: cleanPhone,
                text: aiReplyText,
                delay: 1500,
                presence: 'composing',
              }),
            });

            if (evoRes.ok) {
              sentOk = true;
              console.log(`[Webhook WA] Mensaje de ${agent.name} enviado con éxito vía Evolution API (${evoUrl}).`);
              break;
            }
          } catch {
            // probar siguiente url
          }
        }

        // 7. Sincronizar mensaje saliente en GoHighLevel para el CRM
        if (ghlContactId) {
          try {
            await fetch('https://services.leadconnectorhq.com/conversations/messages', {
              method: 'POST',
              headers: ghlHeaders,
              body: JSON.stringify({
                type: 'Live_Chat',
                contactId: ghlContactId,
                message: aiReplyText,
              }),
            });
            console.log('[Webhook WA] Mensaje de IA sincronizado en GHL con éxito.');
          } catch (ghlErr: any) {
            console.warn('[Webhook WA] Error sincronizando en GHL:', ghlErr.message);
          }
        }

        return NextResponse.json({
          success: true,
          contactId: ghlContactId,
          aiAutoReply: true,
          agentName: agent.name,
          sent: sentOk,
          message: aiReplyText,
        });
      } catch (aiErr: any) {
        console.warn('[Webhook WA] Error en proceso de respuesta automática de IA:', aiErr.message);
      }

      return NextResponse.json({ success: true, contactId: ghlContactId, message: inboundData });
    }

    return NextResponse.json({ success: false, reason: 'Could not resolve contact' });
  } catch (error: any) {
    console.error('[Webhook WA] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
