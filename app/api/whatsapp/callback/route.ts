import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const GHL_CLIENT_ID = process.env.GHL_CLIENT_ID || '6a9913232f626b82e8dc7c55-mtl6uwma';
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET || '1a22238f-42d4-4680-99c9-7f8b013fff7f';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Falta el parámetro code' }, { status: 400 });
    }

    const encodedCredentials = Buffer.from(GHL_CLIENT_ID + ':' + GHL_CLIENT_SECRET).toString('base64');
    
    // Intercambiar código por tokens
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: 'Basic ' + encodedCredentials
      },
      body: new URLSearchParams({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'https://app.crmagentico.online/api/whatsapp/callback',
        user_type: 'Location'
      })
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Error obteniendo token GHL:', data);
      return NextResponse.json({ error: 'Fallo al autenticar con GHL', details: data }, { status: 500 });
    }

    // Guardar tokens en Supabase
    const locationId = data.locationId;
    
    const { error: dbError } = await supabase
      .from('ghl_installations')
      .upsert({
        location_id: locationId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        updated_at: new Date().toISOString()
      });

    if (dbError) throw dbError;

    // Redirigir al usuario al CRM de vuelta con mensaje de éxito
    return NextResponse.redirect('https://app.crmagentico.online/crm?ghl_connected=true');

  } catch (error: any) {
    console.error('GHL Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
