import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://2.24.65.127:8085';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026';

function getEvolutionHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: EVOLUTION_API_KEY,
  };
}

async function fetchEvolution(endpoint: string, options: RequestInit = {}) {
  const urlsToTry = [
    EVOLUTION_API_URL,
    'http://2.24.65.127:8085',
    'http://localhost:8085',
    'http://host.docker.internal:8085',
    'http://evolution_api:8080',
    'http://evolution-api:8080',
  ];

  let lastError: any = null;
  for (const baseUrl of urlsToTry) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          ...getEvolutionHeaders(),
          ...(options.headers || {}),
        },
        cache: 'no-store',
      });
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo conectar con el servicio de Evolution API');
}

/**
 * GET /api/whatsapp/instance?accountId=xxx
 * Obtiene el estado o QR de la instancia de WhatsApp para una subcuenta
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || 'default-account';
    const instanceName = `wa_${accountId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 1. Consultar estado real de la instancia con fetchInstances
    try {
      const fetchRes = await fetchEvolution(`/instance/fetchInstances?instanceName=${instanceName}`);
      if (fetchRes.ok) {
        const list = await fetchRes.json();
        const inst = Array.isArray(list) ? list.find((i: any) => i.name === instanceName) : list;

        // Verificar si fue desconectado desde el teléfono
        const isLoggedOut = inst?.disconnectionReasonCode === 401 || !!inst?.disconnectionAt;

        if (inst && inst.connectionStatus === 'open' && !isLoggedOut) {
          // Asegurar que el webhook esté configurado
          await fetchEvolution(`/webhook/set/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: 'https://app.crmagentico.online/api/whatsapp/webhook',
                byEvents: false,
                base64: false,
                events: ['MESSAGES_UPSERT'],
              },
            }),
          }).catch((e) => console.warn('Failed to set webhook:', e));

          return NextResponse.json({
            status: 'connected',
            instanceName,
            state: 'open',
          });
        }
      }
    } catch (e) {
      // Continuar si la instancia no existe aún
    }

    // 2. Si no está conectada o está desautenticada, obtener QR Code para vincular
    try {
      const connectRes = await fetchEvolution(`/instance/connect/${instanceName}`);
      if (connectRes.ok) {
        const connectData = await connectRes.json();
        const qr = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code;
        if (qr) {
          return NextResponse.json({
            status: 'qr_ready',
            instanceName,
            qrcode: qr,
            pairingCode: connectData?.pairingCode,
          });
        }
      }
    } catch (e) {
      // Continuar
    }

    // 3. Si la instancia no existe, crearla y obtener QR
    let fetchError: any = null;
    try {
      const createRes = await fetchEvolution('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();

        // Configurar webhook al crear
        await fetchEvolution(`/webhook/set/${instanceName}`, {
          method: 'POST',
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: 'https://app.crmagentico.online/api/whatsapp/webhook',
              byEvents: false,
              base64: false,
              events: ['MESSAGES_UPSERT'],
            },
          }),
        }).catch((e) => console.warn('Failed to set webhook:', e));

        const qr = createData?.qrcode?.base64 || createData?.hash?.base64 || createData?.base64;
        if (qr) {
          return NextResponse.json({
            status: 'qr_ready',
            instanceName,
            qrcode: qr,
          });
        }
      }
    } catch (e: any) {
      fetchError = e.message || 'Unknown error';
    }

    return NextResponse.json({
      status: 'disconnected',
      instanceName,
      message: 'Instancia lista para conectar',
      debug_error: fetchError,
    });
  } catch (error: any) {
    console.error('Error in /api/whatsapp/instance GET:', error);
    return NextResponse.json(
      { error: error.message || 'Error comunicando con Evolution API' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/instance?accountId=xxx
 * Cierra sesión o elimina la instancia de WhatsApp de la subcuenta
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || 'default-account';
    const instanceName = `wa_${accountId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      await fetchEvolution(`/instance/logout/${instanceName}`, { method: 'DELETE' });
    } catch (e) {}

    try {
      await fetchEvolution(`/instance/delete/${instanceName}`, { method: 'DELETE' });
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'WhatsApp desconectado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
