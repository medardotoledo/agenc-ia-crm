import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getGHLToken(accountId: string): Promise<string> {
  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM ghl_installations WHERE location_id = $1 LIMIT 1;',
      [accountId]
    );
    if (rows.length && rows[0].access_token) {
      return rows[0].access_token;
    }
  } catch (err: any) {
    console.warn('[Send Media WA] DB Query error:', err.message);
  }
  return process.env.GHL_API_TOKEN || 'pit-f7368d7d-1b53-4682-9096-cb7b87909966';
}

function getMimeType(fileName?: string, mediaType?: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'webm': return 'video/webm';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'gif': return 'image/gif';
      case 'pdf': return 'application/pdf';
      case 'mp3': return 'audio/mp3';
      case 'ogg': return 'audio/ogg';
      case 'opus': return 'audio/opus';
      case 'wav': return 'audio/wav';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
  }

  switch (mediaType) {
    case 'video': return 'video/mp4';
    case 'image': return 'image/jpeg';
    case 'audio': return 'audio/ogg';
    case 'document': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let {
      instanceName,
      number,
      media,
      mediaType = 'image',
      fileName,
      caption = '',
      isVoiceNote = false,
      accountId,
      contactId,
    } = body;

    if (!instanceName && accountId) {
      instanceName = `wa_${accountId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    if (instanceName && instanceName.startsWith('sub_')) {
      instanceName = instanceName.replace('sub_', 'wa_');
    }

    if (!instanceName || !number || !media) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (instanceName, number, media)' }, { status: 400 });
    }

    const cleanNumber = number.replace(/\D/g, '');
    const urlsToTry = [
      EVOLUTION_API_URL,
      'http://2.24.65.127:8085',
      'http://evolution-api:8080',
      'http://localhost:8085',
      'http://host.docker.internal:8085',
      'http://172.17.0.1:8085',
    ];

    const apiKey = EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026';
    let actualResponse: Response | null = null;
    let lastError: any = null;

    if (isVoiceNote || (mediaType === 'audio' && isVoiceNote)) {
      // Enviar como Nota de Voz Nativa de WhatsApp (PTT)
      const payload = {
        number: cleanNumber,
        audio: media,
        encoding: true,
      };

      for (const baseUrl of urlsToTry) {
        try {
          const response = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: apiKey,
            },
            body: JSON.stringify(payload),
          });
          actualResponse = response;
          break;
        } catch (e: any) {
          lastError = e;
        }
      }
    } else {
      // Enviar como Archivo Multimedia (Video, Imagen, Documento, Audio)
      const mimeType = body.mimeType || getMimeType(fileName, mediaType);
      const payload = {
        number: cleanNumber,
        mediatype: mediaType,
        mimetype: mimeType,
        caption: caption || '',
        media: media,
        fileName: fileName || (mediaType === 'video' ? 'video.mp4' : mediaType === 'document' ? 'document.pdf' : 'archivo'),
      };

      for (const baseUrl of urlsToTry) {
        try {
          const response = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: apiKey,
            },
            body: JSON.stringify(payload),
          });
          actualResponse = response;
          break;
        } catch (e: any) {
          lastError = e;
        }
      }
    }

    if (!actualResponse) {
      return NextResponse.json({ error: lastError?.message || 'Failed to connect to WhatsApp API' }, { status: 500 });
    }

    const resData = await actualResponse.json().catch(() => ({}));
    if (!actualResponse.ok) {
      console.error('[Send Media Evolution Error]', resData);
      return NextResponse.json({ error: resData?.response?.message || resData?.message || 'Error from WhatsApp API' }, { status: actualResponse.status });
    }

    // Inyectar en GoHighLevel para reflejar la multimedia en el hilo de conversación
    try {
      let ghlContactId = contactId;
      const effectiveAccountId = accountId || (instanceName ? instanceName.replace(/^(sub_|wa_)/, '') : 'OS9czz85LUvBeljk8FEv');
      const ghlToken = await getGHLToken(effectiveAccountId);
      const ghlHeaders = {
        Authorization: `Bearer ${ghlToken}`,
        'Content-Type': 'application/json',
        Version: '2021-04-15',
      };

      if (!ghlContactId && number) {
        const searchRes = await fetch(`https://services.leadconnectorhq.com/contacts/?query=%2B${cleanNumber}&locationId=${effectiveAccountId}`, {
          headers: ghlHeaders,
        });
        if (searchRes.ok) {
          const sData = await searchRes.json();
          ghlContactId = sData.contacts?.[0]?.id;
        }
      }

      if (ghlContactId) {
        const isUrl = typeof media === 'string' && (media.startsWith('http://') || media.startsWith('https://'));
        const attachments = isUrl ? [media] : [];
        const displayMsg = caption
          ? `${caption} ${fileName ? `[${fileName}]` : ''}`
          : isVoiceNote
          ? '🎤 Nota de voz enviada'
          : fileName
          ? `📎 ${fileName}`
          : `📎 Archivo ${mediaType} enviado`;

        await fetch('https://services.leadconnectorhq.com/conversations/messages', {
          method: 'POST',
          headers: ghlHeaders,
          body: JSON.stringify({
            type: 'Live_Chat',
            contactId: ghlContactId,
            message: displayMsg,
            ...(attachments.length > 0 ? { attachments } : {}),
          }),
        });
        console.log('[Send Media WA] Outbound media synced to GHL for contact:', ghlContactId);
      }
    } catch (ghlErr: any) {
      console.warn('[Send Media WA] Could not sync outbound media to GHL:', ghlErr.message);
    }

    return NextResponse.json({
      success: true,
      result: resData,
    });
  } catch (error: any) {
    console.error('Error in /api/whatsapp/send-media:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
