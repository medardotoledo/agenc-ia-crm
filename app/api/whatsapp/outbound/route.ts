import { NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://2.24.65.127:8085';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[GHL Outbound] Mensaje recibido de GHL:', JSON.stringify(body, null, 2));

    // Validar tipo de mensaje de GHL (Conversation Provider Webhook)
    // El payload de GHL para custom providers incluye 'message' y 'locationId'
    const locationId = body.locationId;
    const message = body.message;
    const phone = body.phone || body.contact?.phone;

    if (!locationId || !message || !phone) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    // Limpiar numero
    const cleanPhone = phone.replace(/\D/g, '');
    const instanceName = \sub_\\;

    // Enviar a Evolution API
    const urlsToTry = [
      EVOLUTION_API_URL,
      'http://2.24.65.127:8085',
      'http://localhost:8085',
      'http://172.17.0.1:8085',
    ];

    let success = false;
    for (const baseUrl of urlsToTry) {
      try {
        const response = await fetch(\\/message/sendText/\\, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: message,
            delay: 1200,
            presence: 'composing',
          }),
        });
        
        if (response.ok) {
          success = true;
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }

    if (!success) {
      // Respondemos a GHL con un error para que marque el SMS como fallido
      return NextResponse.json({ error: 'No se pudo conectar a WhatsApp' }, { status: 500 });
    }

    // Le decimos a GHL que el mensaje fue exitoso (Custom providers requieren responder un status code 200 con un success flag)
    return NextResponse.json({ success: true, messageId: \wa_\\ });

  } catch (error: any) {
    console.error('[GHL Outbound] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

