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
      'http://evolution-api:8080',
      'http://host.docker.internal:8085',
      'http://172.17.0.1:8085',
      'http://2.24.65.127:8085'
    ];

    let lastError: any = null;
    let data: any = null;
    let success = false;

    for (const baseUrl of urlsToTry) {
      try {
        const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number,
            options: {
              delay: 1200,
              presence: 'composing',
            },
            textMessage: {
              text,
            },
          }),
        });
        
        if (response.ok) {
           data = await response.json();
           success = true;
           break;
        }
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!success) {
       return NextResponse.json({ error: lastError?.message || 'Failed to connect to API' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
