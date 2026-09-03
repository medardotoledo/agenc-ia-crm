import { NextResponse } from 'next/server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { instanceName, number, text } = body;

    if (!instanceName || !number || !text) {
      return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 });
    }

    const urlsToTry = [
      EVOLUTION_API_URL,
      'http://2.24.65.127:8085',
      'http://evolution-api:8080',
      'http://localhost:8085',
      'http://host.docker.internal:8085',
      'http://172.17.0.1:8085',
    ];

    let lastError: any = null;
    let actualResponse: Response | null = null;

    for (const baseUrl of urlsToTry) {
      try {
        const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY || 'agencia_secret_wa_key_2026',
          },
          body: JSON.stringify({
            number,
            text,
            delay: 1200,
            presence: 'composing',
          }),
        });
        
        actualResponse = response;
        break; // Successfully connected to an API instance, regardless of HTTP status
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!actualResponse) {
       return NextResponse.json({ error: lastError?.message || 'Failed to connect to API' }, { status: 500 });
    }

    const data = await actualResponse.json().catch(() => ({}));
    if (!actualResponse.ok) {
       return NextResponse.json({ error: data?.response?.message || data?.message || 'Error from API' }, { status: actualResponse.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
