import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const GHL_CLIENT_ID = process.env.GHL_CLIENT_ID || '6a9913232f626b82e8dc7c55-mtl6uwma';
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET || '1a22238f-42d4-4680-99c9-7f8b013fff7f';
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ghl_installations (
        location_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Falta el parÃ¡metro code' }, { status: 400 });
    }

    const encodedCredentials = Buffer.from(GHL_CLIENT_ID + ':' + GHL_CLIENT_SECRET).toString('base64');
    
    // Intercambiar cÃ³digo por tokens
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

    const locationId = data.locationId || data.companyId; if (!locationId) { throw new Error('No locationId or companyId in response: ' + JSON.stringify(data)); }
    
    // Inicializar tabla si no existe
    await initDb();

    // Guardar tokens en PostgreSQL
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO ghl_installations (location_id, access_token, refresh_token, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (location_id) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          updated_at = CURRENT_TIMESTAMP;
      `, [locationId, data.access_token, data.refresh_token]);
    } finally {
      client.release();
    }

    // Redirigir al usuario
    return NextResponse.redirect('https://app.crmagentico.online/crm?ghl_connected=true');

  } catch (error: any) {
    console.error('GHL Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

