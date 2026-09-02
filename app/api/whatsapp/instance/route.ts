import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://2.24.65.127:8085';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026';

function getEvolutionHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: EVOLUTION_API_KEY,
  };
}

/**
 * GET /api/whatsapp/instance?accountId=xxx
 * Obtiene el estado o QR de la instancia de WhatsApp para una subcuenta
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || 'default-account';
    const instanceName = `sub_${accountId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // 1. Consultar estado de la instancia
    const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      headers: getEvolutionHeaders(),
      cache: 'no-store',
    });

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData?.instance?.state === 'open') {
        return NextResponse.json({
          status: 'connected',
          instanceName,
          state: statusData.instance.state,
        });
      }
    }

    // 2. Si no está conectada, obtener QR Code para vincular
    const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      headers: getEvolutionHeaders(),
      cache: 'no-store',
    });

    if (connectRes.ok) {
      const connectData = await connectRes.json();
      return NextResponse.json({
        status: 'qr_ready',
        instanceName,
        qrcode: connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code,
        pairingCode: connectData?.pairingCode,
      });
    }

    // 3. Si la instancia no existe, crearla y obtener QR
    const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: getEvolutionHeaders(),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      const qr = createData?.qrcode?.base64 || createData?.hash?.base64 || createData?.base64;
      if (qr) {
        return NextResponse.json({
          status: 'qr_ready',
          instanceName,
          qrcode: qr,
        });
      }
    }

    // 4. Segundo intento de connect
    const retryConnect = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      headers: getEvolutionHeaders(),
      cache: 'no-store',
    });
    if (retryConnect.ok) {
      const retryData = await retryConnect.json();
      const qr = retryData?.base64 || retryData?.qrcode?.base64 || retryData?.code;
      if (qr) {
        return NextResponse.json({
          status: 'qr_ready',
          instanceName,
          qrcode: qr,
        });
      }
    }

    return NextResponse.json({
      status: 'disconnected',
      instanceName,
      message: 'Instancia lista para conectar',
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
    const instanceName = `sub_${accountId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: getEvolutionHeaders(),
    });

    await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: getEvolutionHeaders(),
    });

    return NextResponse.json({ success: true, message: 'WhatsApp desconectado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
